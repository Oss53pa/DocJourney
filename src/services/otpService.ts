// ============================================================
// DocJourney — OTP Service
// ============================================================

import { db } from '../db';
import { generateId } from '../utils';
import type {
  ParticipantVerification,
  OTPGenerationResult,
  OTPVerificationResult,
} from '../types/verification.types';

// ---- Crypto Utilities ----

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateOTPCode(): string {
  // Génère un code à 6 chiffres
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000) + 100000;
  return code.toString();
}

// ---- OTP Service ----

export class OTPService {
  private static instance: OTPService;

  static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  /**
   * Génère un nouveau code OTP avec son hash
   */
  async generate(expirationHours: number = 24): Promise<OTPGenerationResult> {
    const code = generateOTPCode();
    const salt = generateSalt();
    const hashedCode = await sha256(code + salt);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    return {
      code,
      hashedCode,
      salt,
      expiresAt,
    };
  }

  /**
   * Crée une vérification pour une étape de workflow
   */
  async createVerification(
    stepId: string,
    recipientEmail: string,
    expirationHours: number = 24,
    maxAttempts: number = 3
  ): Promise<{ verification: ParticipantVerification; plainCode: string }> {
    const { code, hashedCode, salt, expiresAt } = await this.generate(expirationHours);

    const verification: ParticipantVerification = {
      code: hashedCode,
      salt,
      recipientEmail,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      maxAttempts,
      verified: false,
      method: 'email',
      blocked: false,
    };

    // Stocker dans Firebase si disponible
    await this.storeVerification(stepId, verification);

    return { verification, plainCode: code };
  }

  /**
   * Vérifie un code OTP
   */
  async verify(stepId: string, inputCode: string): Promise<OTPVerificationResult> {
    const verification = await this.getVerification(stepId);

    if (!verification) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (verification.verified) {
      return { valid: false, reason: 'ALREADY_VERIFIED' };
    }

    if (verification.blocked) {
      return { valid: false, reason: 'BLOCKED', remainingAttempts: 0 };
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // Hasher le code saisi avec le même salt
    const hashedInput = await sha256(inputCode + verification.salt);

    if (hashedInput === verification.code) {
      // Code correct
      await this.markAsVerified(stepId);
      return { valid: true, reason: 'SUCCESS' };
    }

    // Code incorrect - incrémenter les tentatives
    const newAttempts = verification.attempts + 1;
    const remainingAttempts = verification.maxAttempts - newAttempts;
    const blocked = newAttempts >= verification.maxAttempts;

    await this.updateAttempts(stepId, newAttempts, blocked);

    if (blocked) {
      // Notifier le propriétaire du workflow
      await this.notifyBlocked(stepId, verification.recipientEmail);
      return { valid: false, reason: 'BLOCKED', remainingAttempts: 0 };
    }

    return { valid: false, reason: 'INVALID_CODE', remainingAttempts };
  }

  /**
   * Renvoie un nouveau code OTP
   */
  async resend(
    stepId: string,
    expirationHours: number = 24
  ): Promise<{ success: boolean; plainCode?: string; error?: string }> {
    const verification = await this.getVerification(stepId);

    if (!verification) {
      return { success: false, error: 'Vérification non trouvée' };
    }

    if (verification.blocked) {
      return { success: false, error: 'Vérification bloquée - contactez le propriétaire' };
    }

    if (verification.verified) {
      return { success: false, error: 'Déjà vérifié' };
    }

    // Générer un nouveau code
    const { code, hashedCode, salt, expiresAt } = await this.generate(expirationHours);

    // Mettre à jour la vérification (réinitialiser les tentatives)
    await this.updateVerification(stepId, {
      code: hashedCode,
      salt,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    return { success: true, plainCode: code };
  }

  /**
   * Stocke la vérification (Firebase ou local)
   */
  private async storeVerification(stepId: string, verification: ParticipantVerification): Promise<void> {
    // Essayer Firebase d'abord
    if (await this.isFirebaseAvailable()) {
      const { getDatabase, ref, set } = await import('firebase/database');
      const database = getDatabase();
      await set(ref(database, `verifications/${stepId}`), {
        ...verification,
        createdAt: verification.createdAt.toISOString(),
        expiresAt: verification.expiresAt.toISOString(),
      });
    } else {
      // Fallback: stocker localement (moins sécurisé mais fonctionnel)
      const workflow = await this.getWorkflowByStepId(stepId);
      if (workflow) {
        const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1) {
          workflow.steps[stepIndex].verification = verification;
          await db.workflows.put(workflow);
        }
      }
    }
  }

  /**
   * Récupère une vérification
   */
  private async getVerification(stepId: string): Promise<ParticipantVerification | null> {
    // Essayer Firebase d'abord
    if (await this.isFirebaseAvailable()) {
      try {
        const { getDatabase, ref, get } = await import('firebase/database');
        const database = getDatabase();
        const snapshot = await get(ref(database, `verifications/${stepId}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          return {
            ...data,
            createdAt: new Date(data.createdAt),
            expiresAt: new Date(data.expiresAt),
            verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
            blockedAt: data.blockedAt ? new Date(data.blockedAt) : undefined,
          };
        }
      } catch (error) {
        console.error('Error fetching verification from Firebase:', error);
      }
    }

    // Fallback: chercher localement
    const workflow = await this.getWorkflowByStepId(stepId);
    if (workflow) {
      const step = workflow.steps.find(s => s.id === stepId);
      return step?.verification || null;
    }

    return null;
  }

  /**
   * Met à jour les tentatives
   */
  private async updateAttempts(stepId: string, attempts: number, blocked: boolean): Promise<void> {
    if (await this.isFirebaseAvailable()) {
      const { getDatabase, ref, update } = await import('firebase/database');
      const database = getDatabase();
      await update(ref(database, `verifications/${stepId}`), {
        attempts,
        blocked,
        blockedAt: blocked ? new Date().toISOString() : null,
      });
    } else {
      const workflow = await this.getWorkflowByStepId(stepId);
      if (workflow) {
        const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1 && workflow.steps[stepIndex].verification) {
          workflow.steps[stepIndex].verification!.attempts = attempts;
          workflow.steps[stepIndex].verification!.blocked = blocked;
          if (blocked) {
            workflow.steps[stepIndex].verification!.blockedAt = new Date();
          }
          await db.workflows.put(workflow);
        }
      }
    }
  }

  /**
   * Marque comme vérifié
   */
  private async markAsVerified(stepId: string): Promise<void> {
    if (await this.isFirebaseAvailable()) {
      const { getDatabase, ref, update } = await import('firebase/database');
      const database = getDatabase();
      await update(ref(database, `verifications/${stepId}`), {
        verified: true,
        verifiedAt: new Date().toISOString(),
      });
    } else {
      const workflow = await this.getWorkflowByStepId(stepId);
      if (workflow) {
        const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1 && workflow.steps[stepIndex].verification) {
          workflow.steps[stepIndex].verification!.verified = true;
          workflow.steps[stepIndex].verification!.verifiedAt = new Date();
          await db.workflows.put(workflow);
        }
      }
    }
  }

  /**
   * Met à jour la vérification
   */
  private async updateVerification(
    stepId: string,
    updates: Partial<ParticipantVerification>
  ): Promise<void> {
    if (await this.isFirebaseAvailable()) {
      const { getDatabase, ref, update } = await import('firebase/database');
      const database = getDatabase();
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.createdAt) updateData.createdAt = updates.createdAt.toISOString();
      if (updates.expiresAt) updateData.expiresAt = updates.expiresAt.toISOString();
      await update(ref(database, `verifications/${stepId}`), updateData);
    } else {
      const workflow = await this.getWorkflowByStepId(stepId);
      if (workflow) {
        const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1 && workflow.steps[stepIndex].verification) {
          Object.assign(workflow.steps[stepIndex].verification!, updates);
          await db.workflows.put(workflow);
        }
      }
    }
  }

  /**
   * Notifie le propriétaire qu'une vérification est bloquée
   */
  private async notifyBlocked(stepId: string, recipientEmail: string): Promise<void> {
    const workflow = await this.getWorkflowByStepId(stepId);
    if (!workflow) return;

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) return;

    // Logger l'activité
    const { logActivity } = await import('./activityService');
    await logActivity(
      'step_blocked' as any,
      `Vérification bloquée pour ${step.participant.name} (${recipientEmail}) - trop de tentatives`,
      workflow.documentId,
      workflow.id,
      { stepId, recipientEmail, reason: 'max_attempts_exceeded' }
    );

    // TODO: Envoyer email au propriétaire
  }

  /**
   * Vérifie si Firebase est disponible
   */
  private async isFirebaseAvailable(): Promise<boolean> {
    try {
      const settings = await db.settings.get('default');
      return !!(settings?.firebaseSyncEnabled && settings?.firebaseApiKey);
    } catch {
      return false;
    }
  }

  /**
   * Récupère un workflow par ID d'étape
   */
  private async getWorkflowByStepId(stepId: string): Promise<any> {
    const workflows = await db.workflows.toArray();
    return workflows.find(w => w.steps.some((s: any) => s.id === stepId));
  }
}

// Export singleton
export const otpService = OTPService.getInstance();

// ---- Email Service Integration ----

export async function sendOTPEmail(
  recipientEmail: string,
  recipientName: string,
  code: string,
  workflowName: string,
  documentName: string,
  expirationHours: number = 24
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await db.settings.get('default');
    if (!settings?.emailjsServiceId || !settings?.emailjsTemplateId || !settings?.emailjsPublicKey) {
      return { success: false, error: 'EmailJS non configuré' };
    }

    const emailjs = await import('@emailjs/browser');

    await emailjs.send(
      settings.emailjsServiceId,
      settings.emailjsTemplateId,
      {
        to_email: recipientEmail,
        to_name: recipientName,
        otp_code: code,
        workflow_name: workflowName,
        document_name: documentName,
        expiration_hours: expirationHours,
        subject: `Code de vérification DocJourney: ${code}`,
        message_type: 'otp_verification',
      },
      settings.emailjsPublicKey
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email' };
  }
}
