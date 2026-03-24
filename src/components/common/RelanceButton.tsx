import { useState, useRef } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { sendRelanceEmail, isEmailJSConfigured } from '../../services/emailService';
import { generateMailtoLink } from '../../services/reminderService';
import { logActivity } from '../../services/activityService';
import { useSettings } from '../../hooks/useSettings';

type Status = 'idle' | 'sending' | 'sent' | 'error';

interface RelanceButtonProps {
  recipientEmail: string;
  recipientName: string;
  documentName: string;
  ownerName: string;
  ownerEmail: string;
  documentId?: string;
  workflowId?: string;
  className?: string;
  compact?: boolean;
  iconSize?: number;
  onClick?: (e: React.MouseEvent) => void;
}

export default function RelanceButton({
  recipientEmail,
  recipientName,
  documentName,
  ownerName,
  ownerEmail,
  documentId,
  workflowId,
  className = '',
  compact = false,
  iconSize = 15,
  onClick,
}: RelanceButtonProps) {
  const { settings } = useSettings();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleClick = async (e: React.MouseEvent) => {
    onClick?.(e);

    if (!isEmailJSConfigured(settings)) {
      window.location.href = generateMailtoLink(recipientEmail, recipientName, documentName, ownerName);
      return;
    }

    setStatus('sending');
    try {
      await sendRelanceEmail(recipientEmail, recipientName, documentName, ownerName, ownerEmail, settings);
      setStatus('sent');
      await logActivity('reminder_sent', `Relance envoyée à ${recipientName} pour "${documentName}"`, documentId, workflowId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
      setStatus('error');
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus('idle'), 3000);
  };

  const icon = {
    idle: <Mail size={iconSize} />,
    sending: <Loader2 size={iconSize} className="animate-spin" />,
    sent: <CheckCircle2 size={iconSize} />,
    error: <AlertCircle size={iconSize} />,
  }[status];

  const label = {
    idle: 'Relancer',
    sending: 'Envoi...',
    sent: 'Envoyé',
    error: 'Erreur',
  }[status];

  const statusClass = status === 'sent' ? 'text-emerald-600' : status === 'error' ? 'text-red-600' : '';

  return (
    <button
      onClick={handleClick}
      disabled={status === 'sending'}
      className={`${className} ${statusClass}`}
      title={status === 'error' ? errorMsg : undefined}
    >
      {icon} {compact ? <span className="hidden sm:inline">{label}</span> : label}
    </button>
  );
}
