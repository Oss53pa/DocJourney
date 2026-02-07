import { useState, useCallback } from 'react';
import { otpService, sendOTPEmail } from '../services/otpService';
import type { OTPVerificationResult } from '../types/verification.types';

interface UseOTPVerificationOptions {
  stepId: string;
  recipientEmail: string;
  recipientName: string;
  workflowName: string;
  documentName: string;
  expirationHours?: number;
  maxAttempts?: number;
}

interface UseOTPVerificationReturn {
  // State
  loading: boolean;
  error: string | null;
  verified: boolean;
  blocked: boolean;
  remainingAttempts: number;

  // Actions
  verify: (code: string) => Promise<OTPVerificationResult>;
  resend: () => Promise<{ success: boolean; error?: string }>;
  sendInitial: () => Promise<{ success: boolean; error?: string }>;
}

export function useOTPVerification({
  stepId,
  recipientEmail,
  recipientName,
  workflowName,
  documentName,
  expirationHours = 24,
  maxAttempts = 3,
}: UseOTPVerificationOptions): UseOTPVerificationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(maxAttempts);

  /**
   * Envoie le code OTP initial
   */
  const sendInitial = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      // Créer la vérification et obtenir le code en clair
      const { plainCode } = await otpService.createVerification(
        stepId,
        recipientEmail,
        expirationHours,
        maxAttempts
      );

      // Envoyer l'email avec le code
      const emailResult = await sendOTPEmail(
        recipientEmail,
        recipientName,
        plainCode,
        workflowName,
        documentName,
        expirationHours
      );

      if (!emailResult.success) {
        setError(emailResult.error || 'Erreur lors de l\'envoi de l\'email');
        return { success: false, error: emailResult.error };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [stepId, recipientEmail, recipientName, workflowName, documentName, expirationHours, maxAttempts]);

  /**
   * Vérifie un code OTP saisi
   */
  const verify = useCallback(async (code: string): Promise<OTPVerificationResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await otpService.verify(stepId, code);

      if (result.valid) {
        setVerified(true);
      } else {
        switch (result.reason) {
          case 'BLOCKED':
            setBlocked(true);
            setRemainingAttempts(0);
            break;
          case 'INVALID_CODE':
            setRemainingAttempts(result.remainingAttempts || 0);
            break;
          case 'EXPIRED':
            setError('Le code a expiré');
            break;
          case 'ALREADY_VERIFIED':
            setVerified(true);
            break;
        }
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de vérification';
      setError(message);
      return { valid: false, reason: 'NOT_FOUND' };
    } finally {
      setLoading(false);
    }
  }, [stepId]);

  /**
   * Renvoie un nouveau code OTP
   */
  const resend = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      // Demander un nouveau code au service
      const result = await otpService.resend(stepId, expirationHours);

      if (!result.success) {
        setError(result.error || 'Erreur lors du renvoi');
        return { success: false, error: result.error };
      }

      // Envoyer le nouveau code par email
      const emailResult = await sendOTPEmail(
        recipientEmail,
        recipientName,
        result.plainCode!,
        workflowName,
        documentName,
        expirationHours
      );

      if (!emailResult.success) {
        setError(emailResult.error || 'Erreur lors de l\'envoi de l\'email');
        return { success: false, error: emailResult.error };
      }

      // Réinitialiser les tentatives
      setRemainingAttempts(maxAttempts);
      setBlocked(false);

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du renvoi';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [stepId, recipientEmail, recipientName, workflowName, documentName, expirationHours, maxAttempts]);

  return {
    loading,
    error,
    verified,
    blocked,
    remainingAttempts,
    verify,
    resend,
    sendInitial,
  };
}

export default useOTPVerification;
