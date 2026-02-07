import React from 'react';
import { Eye, EyeOff, Clock } from 'lucide-react';
import type { WorkflowStep } from '../../types';

interface ReadReceiptBadgeProps {
  step: WorkflowStep;
  compact?: boolean;
}

export default function ReadReceiptBadge({ step, compact = false }: ReadReceiptBadgeProps) {
  const { readReceipt, status, sentAt } = step;

  // Only show for sent or later statuses
  if (status === 'pending') {
    return null;
  }

  // Calculate time since sent
  const getTimeSinceSent = () => {
    if (!sentAt) return null;
    const now = new Date();
    const sent = new Date(sentAt);
    const diffMs = now.getTime() - sent.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}j`;
    if (diffHours > 0) return `${diffHours}h`;
    return 'récent';
  };

  if (readReceipt) {
    const openedAt = new Date(readReceipt.openedAt);
    const formattedDate = openedAt.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
    const formattedTime = openedAt.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (compact) {
      return (
        <div
          className="flex items-center gap-1 text-emerald-600"
          title={`Ouvert le ${formattedDate} à ${formattedTime}`}
        >
          <Eye size={12} />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
        <Eye size={12} />
        <span>Ouvert {formattedDate}</span>
      </div>
    );
  }

  // Not opened yet
  if (status === 'sent') {
    const timeSince = getTimeSinceSent();

    if (compact) {
      return (
        <div
          className="flex items-center gap-1 text-neutral-400"
          title={`Envoyé il y a ${timeSince}, pas encore ouvert`}
        >
          <EyeOff size={12} />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg">
        <EyeOff size={12} />
        <span>Non ouvert</span>
        {timeSince && (
          <span className="flex items-center gap-0.5 text-neutral-400">
            <Clock size={10} />
            {timeSince}
          </span>
        )}
      </div>
    );
  }

  return null;
}

interface ReadReceiptTimelineProps {
  steps: WorkflowStep[];
}

export function ReadReceiptTimeline({ steps }: ReadReceiptTimelineProps) {
  const stepsWithReceipts = steps.filter(
    (s) => s.readReceipt || s.status === 'sent'
  );

  if (stepsWithReceipts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
        <Eye size={14} />
        <span>Accusés de réception</span>
      </div>

      <div className="space-y-1.5">
        {stepsWithReceipts.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  step.readReceipt ? 'bg-emerald-500' : 'bg-neutral-300'
                }`}
              />
              <span className="text-sm text-neutral-700 truncate">
                {step.participant.name}
              </span>
            </div>
            <ReadReceiptBadge step={step} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReadReceiptSummaryProps {
  steps: WorkflowStep[];
}

export function ReadReceiptSummary({ steps }: ReadReceiptSummaryProps) {
  const sentSteps = steps.filter((s) => s.status !== 'pending');
  const openedSteps = steps.filter((s) => s.readReceipt);

  if (sentSteps.length === 0) {
    return null;
  }

  const allOpened = openedSteps.length === sentSteps.length;
  const noneOpened = openedSteps.length === 0;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
        allOpened
          ? 'text-emerald-600 bg-emerald-50'
          : noneOpened
          ? 'text-neutral-500 bg-neutral-100'
          : 'text-amber-600 bg-amber-50'
      }`}
    >
      {allOpened ? <Eye size={12} /> : noneOpened ? <EyeOff size={12} /> : <Eye size={12} />}
      <span>
        {openedSteps.length}/{sentSteps.length} ouvert{openedSteps.length > 1 ? 's' : ''}
      </span>
    </div>
  );
}
