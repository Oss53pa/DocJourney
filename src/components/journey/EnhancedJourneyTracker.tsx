import React from 'react';
import { Check, X, FileText, Flag, SkipForward } from 'lucide-react';
import type { Workflow } from '../../types';
import { formatDateShort, formatDuration, getRoleAction, getParticipantColor } from '../../utils';

interface EnhancedJourneyTrackerProps {
  workflow: Workflow;
}

export default function EnhancedJourneyTracker({ workflow }: EnhancedJourneyTrackerProps) {
  const { steps } = workflow;
  const rejectedIndex = steps.findIndex(s => s.status === 'rejected');
  const isRejected = rejectedIndex >= 0;

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="section-title mb-5">Parcours de validation</h2>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start min-w-max px-1">
          {/* Start node */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center ring-4 ring-white shadow-sm">
              <FileText size={16} className="text-white" />
            </div>
            <span className="text-[10px] text-neutral-400 mt-2">Départ</span>
          </div>

          {/* Steps */}
          {steps.map((step, i) => {
            const isDone = step.status === 'completed';
            const isRej = step.status === 'rejected';
            const isSkipped = step.status === 'skipped';
            const isCancelled = isRejected && i > rejectedIndex;
            const color = getParticipantColor(i);

            // Line style
            let lineColorClass = 'bg-neutral-200';
            if (isDone) lineColorClass = 'bg-emerald-400';
            else if (isRej) lineColorClass = 'bg-red-400';
            else if (isSkipped) lineColorClass = 'bg-amber-300';
            const lineDashed = isCancelled || (isRejected && i === rejectedIndex);

            // Dot style
            let dotBg = 'bg-neutral-200';
            let dotText = 'text-neutral-400';
            if (isDone) { dotBg = 'bg-emerald-500'; dotText = 'text-white'; }
            else if (isRej) { dotBg = 'bg-red-500'; dotText = 'text-white'; }
            else if (isSkipped) { dotBg = 'bg-amber-400'; dotText = 'text-white'; }
            else if (isCancelled) { dotBg = 'bg-neutral-100'; dotText = 'text-neutral-300'; }

            return (
              <React.Fragment key={step.id}>
                {/* Line */}
                <div className={`h-[3px] w-12 sm:w-16 self-center mt-[-12px] mx-0.5 rounded-full ${
                  lineDashed ? 'journey-line-dashed' : lineColorClass
                }`} />

                {/* Step node */}
                <div className={`flex flex-col items-center min-w-[80px] ${isCancelled ? 'opacity-40' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${dotBg} ${dotText}`}>
                    {isDone ? <Check size={16} strokeWidth={3} />
                      : isRej ? <X size={16} strokeWidth={3} />
                      : isSkipped ? <SkipForward size={14} />
                      : <span className="text-xs font-normal">{i + 1}</span>
                    }
                  </div>

                  {/* Labels */}
                  <div className="text-center mt-2 space-y-0.5">
                    <p className="text-xs font-normal text-neutral-800 truncate max-w-[80px]">
                      {step.participant.name.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-neutral-400">{getRoleAction(step.role)}</p>
                    {step.completedAt && (
                      <p className="text-[10px] text-neutral-400">{formatDateShort(step.completedAt)}</p>
                    )}
                    {step.sentAt && step.completedAt && (
                      <p className="text-[10px] font-normal" style={{ color }}>
                        {formatDuration(step.sentAt, step.completedAt)}
                      </p>
                    )}
                    {isCancelled && (
                      <p className="text-[10px] text-neutral-300 italic">Annulée</p>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Line to end */}
          <div className={`h-[3px] w-12 sm:w-16 self-center mt-[-12px] mx-0.5 rounded-full ${
            isRejected ? 'journey-line-dashed' : 'bg-emerald-400'
          }`} />

          {/* End node */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${
              isRejected ? 'bg-red-500' : 'bg-emerald-500'
            }`}>
              <Flag size={16} className="text-white" />
            </div>
            <span className="text-[10px] text-neutral-400 mt-2">
              {isRejected ? 'Rejeté' : 'Terminé'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
