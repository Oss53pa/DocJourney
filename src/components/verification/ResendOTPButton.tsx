import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

interface ResendOTPButtonProps {
  onResend: () => Promise<{ success: boolean; error?: string }>;
  cooldownSeconds?: number;
  disabled?: boolean;
}

export default function ResendOTPButton({
  onResend,
  cooldownSeconds = 60,
  disabled = false,
}: ResendOTPButtonProps) {
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Démarrer le cooldown au montage
  useEffect(() => {
    setCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  // Timer de countdown
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Reset status après 3 secondes
  useEffect(() => {
    if (status !== 'idle') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || loading || disabled) return;

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const result = await onResend();
      if (result.success) {
        setStatus('success');
        setCountdown(cooldownSeconds);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Erreur lors du renvoi');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [countdown, loading, disabled, onResend, cooldownSeconds]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  const isDisabled = disabled || loading || countdown > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${isDisabled
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : status === 'success'
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : status === 'error'
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300'
          }
        `}
      >
        {loading ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            Envoi en cours...
          </>
        ) : status === 'success' ? (
          <>
            <Check size={16} />
            Code envoyé !
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle size={16} />
            Échec de l'envoi
          </>
        ) : countdown > 0 ? (
          <>
            <RefreshCw size={16} />
            Renvoyer dans {formatTime(countdown)}
          </>
        ) : (
          <>
            <RefreshCw size={16} />
            Renvoyer le code
          </>
        )}
      </button>

      {errorMessage && (
        <p className="text-xs text-red-600 text-center animate-fade-in">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
