import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Clock } from 'lucide-react';
import type { ParticipantVerification } from '../../types/verification.types';

interface VerificationStatusProps {
  verification?: ParticipantVerification;
  compact?: boolean;
}

export default function VerificationStatus({
  verification,
  compact = false,
}: VerificationStatusProps) {
  if (!verification) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? '' : 'px-2 py-1 bg-neutral-50 rounded-lg'}`}>
        <Shield size={compact ? 12 : 14} className="text-neutral-400" />
        {!compact && <span className="text-xs text-neutral-500">Non requis</span>}
      </div>
    );
  }

  const isExpired = new Date() > new Date(verification.expiresAt);

  // Vérifié avec succès
  if (verification.verified) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? '' : 'px-2 py-1 bg-green-50 rounded-lg'}`}>
        <ShieldCheck size={compact ? 12 : 14} className="text-green-600" />
        {!compact && (
          <span className="text-xs text-green-700">
            Vérifié
            {verification.verifiedAt && (
              <span className="text-green-600 ml-1">
                ({new Date(verification.verifiedAt).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })})
              </span>
            )}
          </span>
        )}
      </div>
    );
  }

  // Bloqué
  if (verification.blocked) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? '' : 'px-2 py-1 bg-red-50 rounded-lg'}`}>
        <ShieldX size={compact ? 12 : 14} className="text-red-600" />
        {!compact && (
          <span className="text-xs text-red-700">
            Bloqué ({verification.attempts}/{verification.maxAttempts} tentatives)
          </span>
        )}
      </div>
    );
  }

  // Expiré
  if (isExpired) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? '' : 'px-2 py-1 bg-amber-50 rounded-lg'}`}>
        <Clock size={compact ? 12 : 14} className="text-amber-600" />
        {!compact && <span className="text-xs text-amber-700">Code expiré</span>}
      </div>
    );
  }

  // En attente avec tentatives
  if (verification.attempts > 0) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? '' : 'px-2 py-1 bg-amber-50 rounded-lg'}`}>
        <ShieldAlert size={compact ? 12 : 14} className="text-amber-600" />
        {!compact && (
          <span className="text-xs text-amber-700">
            En attente ({verification.maxAttempts - verification.attempts} essais restants)
          </span>
        )}
      </div>
    );
  }

  // En attente (initial)
  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'px-2 py-1 bg-blue-50 rounded-lg'}`}>
      <Shield size={compact ? 12 : 14} className="text-blue-600" />
      {!compact && <span className="text-xs text-blue-700">Code envoyé</span>}
    </div>
  );
}

// Composant pour afficher le temps restant avant expiration
interface ExpirationCountdownProps {
  expiresAt: Date;
  onExpired?: () => void;
}

export function ExpirationCountdown({ expiresAt, onExpired }: ExpirationCountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState<string>('');
  const [isExpired, setIsExpired] = React.useState(false);

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expiré');
        onExpired?.();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}min`);
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}min ${seconds}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  return (
    <span className={`text-xs ${isExpired ? 'text-red-600' : 'text-neutral-500'}`}>
      <Clock size={10} className="inline mr-1" />
      {isExpired ? 'Code expiré' : `Expire dans ${timeLeft}`}
    </span>
  );
}
