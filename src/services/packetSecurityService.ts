// ============================================================
// DocJourney — Packet Security Service
// (Expiration, Double Submission Prevention, Read Receipts)
// ============================================================

import { db } from '../db';
import { generateId } from '../utils';
import { logActivity } from './activityService';
import type { PacketExpiration, SubmissionRecord, ReadReceipt } from '../types/verification.types';
import type { WorkflowStep } from '../types';
import { computeSubmissionHash, generateDeviceFingerprint } from './integrityService';

// ---- Packet Expiration ----

/**
 * Crée une expiration pour un paquet
 */
export function createPacketExpiration(
  expirationDays: 7 | 14 | 30 = 14,
  maxExtensions: number = 2
): PacketExpiration {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return {
    createdAt: now,
    expiresAt,
    extensionCount: 0,
    maxExtensions,
  };
}

/**
 * Vérifie si un paquet est expiré
 */
export function isPacketExpired(expiration: PacketExpiration | undefined): boolean {
  if (!expiration) return false;
  return new Date() > new Date(expiration.expiresAt);
}

/**
 * Calcule le temps restant avant expiration
 */
export function getTimeUntilExpiration(expiration: PacketExpiration | undefined): {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  urgent: boolean; // < 48h
} {
  if (!expiration) {
    return { expired: false, days: Infinity, hours: 0, minutes: 0, urgent: false };
  }

  const now = new Date();
  const expires = new Date(expiration.expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, urgent: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const urgent = diff < 48 * 60 * 60 * 1000; // < 48h

  return { expired: false, days, hours, minutes, urgent };
}

/**
 * Prolonge l'expiration d'un paquet
 */
export async function extendPacketExpiration(
  workflowId: string,
  stepIndex: number,
  additionalDays: 7 | 14 | 30 = 7
): Promise<{ success: boolean; error?: string; newExpiration?: Date }> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) {
    return { success: false, error: 'Workflow non trouvé' };
  }

  const step = workflow.steps[stepIndex];
  if (!step) {
    return { success: false, error: 'Étape non trouvée' };
  }

  const expiration = step.packetExpiration;
  if (!expiration) {
    return { success: false, error: 'Pas d\'expiration configurée' };
  }

  if (expiration.extensionCount >= expiration.maxExtensions) {
    return { success: false, error: `Nombre maximum de prolongations atteint (${expiration.maxExtensions})` };
  }

  // Calculer nouvelle date d'expiration
  const newExpiresAt = new Date(expiration.expiresAt);
  newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);

  // Mettre à jour
  workflow.steps[stepIndex].packetExpiration = {
    ...expiration,
    expiresAt: newExpiresAt,
    extensionCount: expiration.extensionCount + 1,
    lastExtendedAt: new Date(),
    extensionRequestedAt: undefined,
  };

  await db.workflows.put(workflow);

  // Logger l'activité
  await logActivity(
    'packet_extended',
    `Paquet prolongé de ${additionalDays} jours pour ${step.participant.name}`,
    workflow.documentId,
    workflowId,
    { stepIndex, additionalDays, newExpiresAt: newExpiresAt.toISOString() }
  );

  return { success: true, newExpiration: newExpiresAt };
}

/**
 * Demande une prolongation (côté participant)
 */
export async function requestPacketExtension(
  workflowId: string,
  stepId: string
): Promise<{ success: boolean; error?: string }> {
  // Cette fonction sera appelée depuis le paquet HTML via Firebase
  // Elle notifie le propriétaire qu'une prolongation est demandée

  try {
    const settings = await db.settings.get('default');
    if (!settings?.firebaseSyncEnabled) {
      return { success: false, error: 'Synchronisation Firebase non activée' };
    }

    const { getDatabase, ref, set } = await import('firebase/database');
    const database = getDatabase();

    await set(ref(database, `extensionRequests/${workflowId}/${stepId}`), {
      requestedAt: new Date().toISOString(),
      status: 'pending',
    });

    return { success: true };
  } catch (error) {
    console.error('Error requesting extension:', error);
    return { success: false, error: 'Erreur lors de la demande' };
  }
}

// ---- Double Submission Prevention ----

/**
 * Vérifie si une soumission est valide (pas de doublon)
 */
export async function validateSubmission(
  workflowId: string,
  stepId: string,
  response: any
): Promise<{
  valid: boolean;
  reason?: 'ALREADY_PROCESSED' | 'DUPLICATE_SUBMISSION' | 'STEP_LOCKED' | 'EXPIRED';
}> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) {
    return { valid: false, reason: 'ALREADY_PROCESSED' };
  }

  const step = workflow.steps.find(s => s.id === stepId);
  if (!step) {
    return { valid: false, reason: 'ALREADY_PROCESSED' };
  }

  // 1. Vérifier le statut de l'étape
  if (step.status !== 'pending' && step.status !== 'sent') {
    return { valid: false, reason: 'ALREADY_PROCESSED' };
  }

  // 2. Vérifier l'expiration du paquet
  if (step.packetExpiration && isPacketExpired(step.packetExpiration)) {
    return { valid: false, reason: 'EXPIRED' };
  }

  // 3. Vérifier s'il y a déjà une soumission en cours de traitement
  const existingSubmission = await getSubmissionRecord(stepId);
  if (existingSubmission && !existingSubmission.processed) {
    // Une soumission est déjà en cours
    return { valid: false, reason: 'STEP_LOCKED' };
  }

  // 4. Vérifier le hash pour détecter un doublon exact
  if (existingSubmission) {
    const newHash = await computeSubmissionHash(response);
    if (newHash === existingSubmission.submissionHash) {
      return { valid: false, reason: 'DUPLICATE_SUBMISSION' };
    }
  }

  return { valid: true };
}

/**
 * Enregistre une soumission
 */
export async function recordSubmission(
  stepId: string,
  response: any
): Promise<SubmissionRecord> {
  const submissionHash = await computeSubmissionHash(response);
  const deviceFingerprint = generateDeviceFingerprint();

  const record: SubmissionRecord = {
    stepId,
    submittedAt: new Date(),
    submissionHash,
    deviceFingerprint,
    userAgent: navigator.userAgent,
    processed: false,
  };

  // Stocker dans Firebase si disponible
  const settings = await db.settings.get('default');
  if (settings?.firebaseSyncEnabled) {
    try {
      const { getDatabase, ref, set } = await import('firebase/database');
      const database = getDatabase();
      await set(ref(database, `submissions/${stepId}`), {
        ...record,
        submittedAt: record.submittedAt.toISOString(),
      });
    } catch (error) {
      console.error('Error recording submission to Firebase:', error);
    }
  }

  return record;
}

/**
 * Récupère un enregistrement de soumission
 */
async function getSubmissionRecord(stepId: string): Promise<SubmissionRecord | null> {
  const settings = await db.settings.get('default');
  if (settings?.firebaseSyncEnabled) {
    try {
      const { getDatabase, ref, get } = await import('firebase/database');
      const database = getDatabase();
      const snapshot = await get(ref(database, `submissions/${stepId}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          ...data,
          submittedAt: new Date(data.submittedAt),
        };
      }
    } catch (error) {
      console.error('Error getting submission record:', error);
    }
  }
  return null;
}

/**
 * Marque une soumission comme traitée
 */
export async function markSubmissionProcessed(stepId: string): Promise<void> {
  const settings = await db.settings.get('default');
  if (settings?.firebaseSyncEnabled) {
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      const database = getDatabase();
      await update(ref(database, `submissions/${stepId}`), {
        processed: true,
        processedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error marking submission processed:', error);
    }
  }
}

// ---- Read Receipts ----

/**
 * Enregistre l'ouverture d'un paquet
 */
export async function recordPacketOpening(
  workflowId: string,
  stepId: string,
  recipientEmail: string
): Promise<void> {
  const readReceipt: ReadReceipt = {
    stepId,
    recipientEmail,
    openedAt: new Date(),
    userAgent: navigator.userAgent,
  };

  // Mettre à jour le workflow
  const workflow = await db.workflows.get(workflowId);
  if (workflow) {
    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1) {
      workflow.steps[stepIndex].readReceipt = readReceipt;
      await db.workflows.put(workflow);
    }
  }

  // Stocker dans Firebase
  const settings = await db.settings.get('default');
  if (settings?.firebaseSyncEnabled) {
    try {
      const { getDatabase, ref, set } = await import('firebase/database');
      const database = getDatabase();
      await set(ref(database, `readReceipts/${stepId}`), {
        ...readReceipt,
        openedAt: readReceipt.openedAt.toISOString(),
      });

      // Notifier le propriétaire
      await logActivity(
        'packet_opened',
        `Paquet ouvert par ${recipientEmail}`,
        workflow?.documentId,
        workflowId,
        { stepId, recipientEmail }
      );
    } catch (error) {
      console.error('Error recording read receipt:', error);
    }
  }
}

/**
 * Vérifie si un paquet a été lu
 */
export async function hasPacketBeenOpened(stepId: string): Promise<{
  opened: boolean;
  openedAt?: Date;
}> {
  const settings = await db.settings.get('default');
  if (settings?.firebaseSyncEnabled) {
    try {
      const { getDatabase, ref, get } = await import('firebase/database');
      const database = getDatabase();
      const snapshot = await get(ref(database, `readReceipts/${stepId}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          opened: true,
          openedAt: new Date(data.openedAt),
        };
      }
    } catch (error) {
      console.error('Error checking read receipt:', error);
    }
  }
  return { opened: false };
}

// ---- Utility: Get steps needing attention ----

/**
 * Récupère les étapes qui nécessitent une attention (expiration proche, bloquées, etc.)
 */
export async function getStepsNeedingAttention(): Promise<{
  expiringSoon: Array<{ workflowId: string; stepIndex: number; step: WorkflowStep; daysLeft: number }>;
  expired: Array<{ workflowId: string; stepIndex: number; step: WorkflowStep }>;
  blocked: Array<{ workflowId: string; stepIndex: number; step: WorkflowStep; reason: string }>;
  extensionRequested: Array<{ workflowId: string; stepIndex: number; step: WorkflowStep }>;
}> {
  const workflows = await db.workflows.toArray();
  const activeWorkflows = workflows.filter(w => !w.completedAt);

  const result = {
    expiringSoon: [] as Array<{ workflowId: string; stepIndex: number; step: WorkflowStep; daysLeft: number }>,
    expired: [] as Array<{ workflowId: string; stepIndex: number; step: WorkflowStep }>,
    blocked: [] as Array<{ workflowId: string; stepIndex: number; step: WorkflowStep; reason: string }>,
    extensionRequested: [] as Array<{ workflowId: string; stepIndex: number; step: WorkflowStep }>,
  };

  for (const workflow of activeWorkflows) {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];

      // Ignorer les étapes terminées
      if (step.status === 'completed' || step.status === 'rejected' || step.status === 'skipped') {
        continue;
      }

      const expiration = step.packetExpiration;
      if (expiration) {
        const timeLeft = getTimeUntilExpiration(expiration);

        if (timeLeft.expired) {
          result.expired.push({ workflowId: workflow.id, stepIndex: i, step });
        } else if (timeLeft.urgent) {
          result.expiringSoon.push({
            workflowId: workflow.id,
            stepIndex: i,
            step,
            daysLeft: timeLeft.days,
          });
        }

        if (expiration.extensionRequestedAt) {
          result.extensionRequested.push({ workflowId: workflow.id, stepIndex: i, step });
        }
      }

      // Vérifier les blocages OTP
      const verification = step.verification;
      if (verification?.blocked) {
        result.blocked.push({
          workflowId: workflow.id,
          stepIndex: i,
          step,
          reason: 'Trop de tentatives OTP',
        });
      }
    }
  }

  return result;
}
