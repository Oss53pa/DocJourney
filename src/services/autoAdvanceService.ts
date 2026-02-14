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
import { logActivity } from './activityService';
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
    if (!workflow || workflow.completedAt) {
      console.log('Auto-advance: workflow not found or completed, skipping');
      return;
    }

    const nextStep = workflow.steps[workflow.currentStepIndex];
    if (!nextStep || nextStep.status !== 'pending') {
      console.log('Auto-advance: no pending next step at index', workflow.currentStepIndex,
        'status:', nextStep?.status, 'total steps:', workflow.steps.length);
      return;
    }

    const doc = await db.documents.get(workflow.documentId);
    if (!doc) {
      console.log('Auto-advance: document not found');
      return;
    }

    const rawSettings = await db.settings.get('default');
    const settings: AppSettings = { ...DEFAULT_SETTINGS, ...rawSettings };

    await logActivity(
      'package_generated',
      `Auto-avancement: génération du paquet pour ${nextStep.participant.name}`,
      doc.id,
      workflowId
    );

    console.log('Auto-advance: starting for workflow', workflowId,
      'step', workflow.currentStepIndex, 'participant', nextStep.participant.name);

    // 1. Generate the HTML package (calls markStepAsSent internally)
    const html = await generatePackage(doc, workflow, workflow.currentStepIndex);
    console.log('Auto-advance: package generated, size:', html.length);

    // 2. Upload to Firebase Storage if configured
    const syncEnabled = isSyncConfigured(settings);
    const firebaseConfig = getFirebaseConfig(settings);
    let hostedUrl: string | undefined;

    if (syncEnabled && firebaseConfig) {
      try {
        const packageId = generateId();
        const uploadResult = await uploadPackageToStorage(
          html,
          packageId,
          nextStep.participant.name,
          doc.name,
          firebaseConfig
        );
        if (uploadResult.success && uploadResult.url) {
          hostedUrl = uploadResult.url;
          // Save packageId in workflow for retention cleanup
          const existing = workflow.storagePackageIds ?? [];
          await db.workflows.update(workflow.id, { storagePackageIds: [...existing, packageId] });
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

    if (emailConfigured) {
      try {
        await sendEmailViaEmailJS(doc, workflow, workflow.currentStepIndex, settings, html, hostedUrl);
        await logActivity(
          'package_generated',
          `Auto-avancement: email envoyé à ${nextStep.participant.name} (${nextStep.participant.email})`,
          doc.id,
          workflowId
        );
        console.log('Auto-advance: email sent to', nextStep.participant.email);
      } catch (error) {
        await logActivity(
          'package_generated',
          `Auto-avancement: ERREUR envoi email à ${nextStep.participant.name}: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
          doc.id,
          workflowId
        );
        console.warn('Auto-advance: failed to send email:', error);
      }
    } else {
      await logActivity(
        'package_generated',
        `Auto-avancement: EmailJS non configuré, email non envoyé`,
        doc.id,
        workflowId
      );
      console.warn('Auto-advance: EmailJS not configured');
    }

    console.log(`Auto-advance: completed for ${nextStep.participant.name} (workflow ${workflowId})`);
  } catch (error) {
    console.error('Auto-advance failed:', error);
    try {
      await logActivity(
        'package_generated',
        `Auto-avancement: ÉCHEC - ${error instanceof Error ? error.message : 'erreur inconnue'}`,
        undefined,
        workflowId
      );
    } catch { /* ignore logging errors */ }
  }
}
