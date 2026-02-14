/**
 * Auto-Advance Service
 *
 * After a successful validation (not rejected, not modification_requested),
 * automatically generates and sends the package to the next participant
 * in the workflow circuit.
 */

import { db } from '../db';
import { generateId } from '../utils';
import { generatePackage } from './packageService';
import { uploadPackageToStorage, isSyncConfigured, getFirebaseConfig } from './firebaseSyncService';
import { sendEmailViaEmailJS, isEmailJSConfigured } from './emailService';
import { DEFAULT_SETTINGS } from '../hooks/useSettings';
import type { AppSettings } from '../types';

/**
 * Auto-advance workflow to the next step after a successful validation.
 * Generates the HTML package, uploads to Firebase Storage if configured,
 * and sends the email to the next participant via EmailJS if configured.
 *
 * This function is safe to call — it silently returns on any precondition
 * failure and wraps all I/O in try/catch so it never throws.
 */
export async function autoAdvanceToNextStep(workflowId: string): Promise<void> {
  try {
    // Reload workflow from DB (it was just modified by processReturn)
    const workflow = await db.workflows.get(workflowId);
    if (!workflow || workflow.completedAt) return;

    const nextStep = workflow.steps[workflow.currentStepIndex];
    if (!nextStep || nextStep.status !== 'pending') return;

    const doc = await db.documents.get(workflow.documentId);
    if (!doc) return;

    const rawSettings = await db.settings.get('default');
    // Merge with DEFAULT_SETTINGS to ensure env-based defaults (EmailJS, Firebase) are available
    const settings: AppSettings = { ...DEFAULT_SETTINGS, ...rawSettings };
    if (!settings) return;

    console.log('Auto-advance: starting for workflow', workflowId, 'step', workflow.currentStepIndex, 'participant', nextStep.participant.name);

    // 1. Generate the HTML package (calls markStepAsSent internally)
    const html = await generatePackage(doc, workflow, workflow.currentStepIndex);
    console.log('Auto-advance: package generated, size:', html.length);

    // 2. Upload to Firebase Storage if configured
    const syncEnabled = isSyncConfigured(settings);
    const firebaseConfig = getFirebaseConfig(settings);
    let hostedUrl: string | undefined;

    console.log('Auto-advance: syncEnabled:', syncEnabled, 'hasFirebaseConfig:', !!firebaseConfig);

    if (syncEnabled && firebaseConfig) {
      try {
        const uploadResult = await uploadPackageToStorage(
          html,
          generateId(),
          nextStep.participant.name,
          doc.name,
          firebaseConfig
        );
        if (uploadResult.success && uploadResult.url) {
          hostedUrl = uploadResult.url;
          console.log('Auto-advance: uploaded to', hostedUrl);
        } else {
          console.warn('Auto-advance: upload failed:', uploadResult.error);
        }
      } catch (error) {
        console.warn('Auto-advance: failed to upload package to storage:', error);
      }
    }

    // 3. Send email via EmailJS if configured
    const emailConfigured = isEmailJSConfigured(settings);
    console.log('Auto-advance: emailConfigured:', emailConfigured);

    if (emailConfigured) {
      try {
        await sendEmailViaEmailJS(doc, workflow, workflow.currentStepIndex, settings, html, hostedUrl);
        console.log('Auto-advance: email sent to', nextStep.participant.email);
      } catch (error) {
        console.warn('Auto-advance: failed to send email:', error);
      }
    } else {
      console.warn('Auto-advance: EmailJS not configured, skipping email. serviceId:', settings.emailjsServiceId, 'templateId:', settings.emailjsTemplateId, 'publicKey:', settings.emailjsPublicKey ? '***' : '(empty)');
    }

    console.log(`Auto-advance: completed for ${nextStep.participant.name} (workflow ${workflowId})`);
  } catch (error) {
    console.error('Auto-advance failed:', error);
  }
}
