import React, { useState, useCallback } from 'react';
import { Shield, Lock, AlertTriangle, CheckCircle, FileText, User } from 'lucide-react';
import OTPInput from './OTPInput';
import ResendOTPButton from './ResendOTPButton';
import type { OTPVerificationResult } from '../../types/verification.types';

interface OTPVerificationScreenProps {
  recipientEmail: string;
  recipientName: string;
  documentName: string;
  workflowName: string;
  onVerify: (code: string) => Promise<OTPVerificationResult>;
  onResend: () => Promise<{ success: boolean; error?: string }>;
  onVerified: () => void;
  maxAttempts?: number;
}

export default function OTPVerificationScreen({
  recipientEmail,
  recipientName,
  documentName,
  workflowName,
  onVerify,
  onResend,
  onVerified,
  maxAttempts = 3,
}: OTPVerificationScreenProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(maxAttempts);
  const [blocked, setBlocked] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = useCallback(async (inputCode: string) => {
    if (inputCode.length !== 6 || loading || blocked) return;

    setLoading(true);
    setError('');

    try {
      const result = await onVerify(inputCode);

      if (result.valid) {
        setVerified(true);
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        switch (result.reason) {
          case 'INVALID_CODE':
            setRemainingAttempts(result.remainingAttempts || 0);
            if (result.remainingAttempts === 0) {
              setBlocked(true);
              setError('Trop de tentatives. L\'accès est bloqué.');
            } else {
              setError(`Code incorrect. ${result.remainingAttempts} tentative${result.remainingAttempts > 1 ? 's' : ''} restante${result.remainingAttempts > 1 ? 's' : ''}.`);
            }
            setCode('');
            break;
          case 'EXPIRED':
            setError('Le code a expiré. Veuillez demander un nouveau code.');
            setCode('');
            break;
          case 'BLOCKED':
            setBlocked(true);
            setError('L\'accès est bloqué. Veuillez contacter le propriétaire du document.');
            break;
          case 'ALREADY_VERIFIED':
            setVerified(true);
            onVerified();
            break;
          default:
            setError('Une erreur est survenue. Veuillez réessayer.');
            setCode('');
        }
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }, [loading, blocked, onVerify, onVerified]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setError('');
  };

  const handleCodeComplete = (completeCode: string) => {
    handleVerify(completeCode);
  };

  const handleResend = async () => {
    const result = await onResend();
    if (result.success) {
      setRemainingAttempts(maxAttempts);
      setBlocked(false);
      setError('');
      setCode('');
    }
    return result;
  };

  // Écran de succès
  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Vérification réussie
          </h2>
          <p className="text-neutral-600 mb-4">
            Accès au document autorisé
          </p>
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Écran de blocage
  if (blocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Accès bloqué
          </h2>
          <p className="text-neutral-600 mb-6">
            Trop de tentatives incorrectes. Le propriétaire du document a été notifié.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <p className="text-sm text-red-800">
              <strong>Que faire ?</strong>
              <br />
              Contactez le propriétaire du document pour débloquer l'accès ou recevoir un nouveau code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Écran de vérification principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-1">
            Vérification de sécurité
          </h1>
          <p className="text-sm text-neutral-500">
            Saisissez le code à 6 chiffres envoyé à votre adresse email
          </p>
        </div>

        {/* Info document */}
        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="w-5 h-5 text-neutral-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {documentName}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {workflowName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-200">
            <User size={14} className="text-neutral-400" />
            <span className="text-xs text-neutral-600">
              {recipientName} ({recipientEmail})
            </span>
          </div>
        </div>

        {/* Input OTP */}
        <div className="mb-6">
          <OTPInput
            value={code}
            onChange={handleCodeChange}
            onComplete={handleCodeComplete}
            disabled={loading}
            error={!!error}
          />
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 animate-fade-in">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Tentatives restantes */}
        {remainingAttempts < maxAttempts && remainingAttempts > 0 && (
          <div className="flex items-center justify-center gap-1 mb-4">
            {Array.from({ length: maxAttempts }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < remainingAttempts
                    ? 'bg-amber-400'
                    : 'bg-neutral-200'
                }`}
              />
            ))}
            <span className="text-xs text-neutral-500 ml-2">
              {remainingAttempts} tentative{remainingAttempts > 1 ? 's' : ''} restante{remainingAttempts > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Bouton vérifier */}
        <button
          onClick={() => handleVerify(code)}
          disabled={code.length !== 6 || loading}
          className={`
            w-full py-3 px-4 rounded-xl font-medium text-white
            transition-all duration-200
            ${code.length === 6 && !loading
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              : 'bg-neutral-300 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Vérification...
            </span>
          ) : (
            'Vérifier'
          )}
        </button>

        {/* Séparateur */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-neutral-400">
              Vous n'avez pas reçu le code ?
            </span>
          </div>
        </div>

        {/* Bouton renvoyer */}
        <ResendOTPButton
          onResend={handleResend}
          cooldownSeconds={60}
          disabled={loading}
        />

        {/* Footer sécurité */}
        <p className="text-center text-xs text-neutral-400 mt-6">
          <Lock size={10} className="inline mr-1" />
          Ce code expire dans 24 heures et ne peut être utilisé qu'une seule fois.
        </p>
      </div>
    </div>
  );
}
