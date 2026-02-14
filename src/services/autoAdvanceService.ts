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

    const settings = await db.settings.get('default') as AppSettings | undefined;
    if (!settings) return;

    // 1. Generate the HTML package (calls markStepAsSent internally)
    const html = await generatePackage(doc, workflow, workflow.currentStepIndex);

    // 2. Upload to Firebase Storage if configured
    const syncEnabled = isSyncConfigured(settings);
    const firebaseConfig = getFirebaseConfig(settings);
    let hostedUrl: string | undefined;

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
        }
      } catch (error) {
        console.warn('Auto-advance: failed to upload package to storage:', error);
      }
    }

    // 3. Send email via EmailJS if configured
    if (isEmailJSConfigured(settings)) {
      try {
        await sendEmailViaEmailJS(doc, workflow, workflow.currentStepIndex, settings, html, hostedUrl);
      } catch (error) {
        console.warn('Auto-advance: failed to send email:', error);
      }
    }

    console.log(`Auto-advance: package sent to ${nextStep.participant.name} for workflow ${workflowId}`);
  } catch (error) {
    console.error('Auto-advance failed:', error);
  }
}
