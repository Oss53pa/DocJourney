import React from 'react';
import { Check, X, Circle } from 'lucide-react';
import type { Workflow } from '../../types';
import { getRoleAction } from '../../utils';

interface JourneyTrackerProps {
  workflow: Workflow;
  compact?: boolean;
}

export default function JourneyTracker({ workflow, compact = false }: JourneyTrackerProps) {
  const { steps } = workflow;
  const isCompleted = !!workflow.completedAt;
  const isRejected = steps.some(s => s.status === 'rejected');

  return (
    <div className={compact ? '' : 'py-1'}>
      {/* Dots + lines */}
      <div className="flex items-center px-1">
        {steps.map((step, i) => {
          const isDone = step.status === 'completed';
          const isRej = step.status === 'rejected';
          const isCurrent = !isCompleted && !isRejected && i === workflow.currentStepIndex;

          let dotClass = 'journey-dot-pending';
          if (isDone) dotClass = 'journey-dot-completed';
          else if (isRej) dotClass = 'journey-dot-rejected';
          else if (isCurrent) dotClass = 'journey-dot-current';

          return (
            <React.Fragment key={step.id}>
              <div
                className={dotClass}
                title={`${step.participant.name} — ${getRoleAction(step.role)}`}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={3} />
                ) : isRej ? (
                  <X size={14} strokeWidth={3} />
                ) : isCurrent ? (
                  <Circle size={10} fill="white" strokeWidth={0} />
                ) : (
                  <span className="text-[10px] font-normal">{i + 1}</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`journey-line ${
                    isDone
                      ? 'bg-emerald-400'
                      : isRej
                      ? 'bg-red-400'
                      : 'bg-neutral-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Labels (desktop only if not compact) */}
      {!compact && (
        <div className="hidden sm:flex justify-between mt-3 px-0">
          {steps.map((step) => {
            const firstName = step.participant.name.split(' ')[0];
            return (
              <div key={step.id} className="text-center flex-1 min-w-0 px-1">
                <p className="text-xs font-normal text-neutral-800 truncate">{firstName}</p>
                <p className="text-[10px] text-neutral-400 font-normal">{getRoleAction(step.role)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function JourneyTrackerMini({ workflow }: { workflow: Workflow }) {
  return <JourneyTracker workflow={workflow} compact />;
}
