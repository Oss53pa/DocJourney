import React from 'react';
import { Check, X, Circle, RotateCcw, Users } from 'lucide-react';
import type { Workflow } from '../../types';
import { getRoleAction } from '../../utils';

interface JourneyTrackerProps {
  workflow: Workflow;
  compact?: boolean;
}

export default function JourneyTracker({ workflow, compact = false }: JourneyTrackerProps) {
  const { steps } = workflow;
  const isCompleted = !!workflow.completedAt;
  const isRejected = steps.some(s => s.status === 'rejected') && !workflow.awaitingCorrection;
  const isCancelled = !!workflow.cancelledAt;

  return (
    <div className={compact ? '' : 'py-1'}>
      {/* Dots + lines */}
      <div className="flex items-center px-1">
        {steps.map((step, i) => {
          const isDone = step.status === 'completed';
          const isRej = step.status === 'rejected';
          const isCorrection = step.status === 'correction_requested';
          const isCurrent = !isCompleted && !isRejected && !isCancelled && i === workflow.currentStepIndex;
          const isParallel = step.isParallel && step.parallelParticipants;

          let dotClass = 'journey-dot-pending';
          if (isDone) dotClass = 'journey-dot-completed';
          else if (isRej) dotClass = 'journey-dot-rejected';
          else if (isCorrection) dotClass = 'journey-dot-correction';
          else if (isCurrent) dotClass = 'journey-dot-current';

          // Build tooltip
          let tooltip = `${step.participant.name} — ${getRoleAction(step.role)}`;
          if (isParallel) {
            const names = step.parallelParticipants!.map(p => p.participant.name).join(', ');
            tooltip = `Signatures parallèles: ${names}`;
          }
          if (isCorrection) {
            tooltip += ' (correction demandée)';
          }

          return (
            <React.Fragment key={step.id}>
              <div
                className={dotClass}
                title={tooltip}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={3} />
                ) : isRej ? (
                  <X size={14} strokeWidth={3} />
                ) : isCorrection ? (
                  <RotateCcw size={12} strokeWidth={2.5} />
                ) : isParallel ? (
                  <Users size={12} strokeWidth={2} />
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
                      : isCorrection
                      ? 'bg-amber-400'
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
            const isParallel = step.isParallel && step.parallelParticipants;
            const firstName = step.participant.name.split(' ')[0];
            const isCorrection = step.status === 'correction_requested';

            return (
              <div key={step.id} className="text-center flex-1 min-w-0 px-1">
                {isParallel ? (
                  <>
                    <p className="text-xs font-normal text-purple-700 truncate">
                      {step.parallelParticipants!.length} signataires
                    </p>
                    <p className="text-[10px] text-purple-500 font-normal">
                      {step.parallelMode === 'all' ? 'Tous' : 'Un seul'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`text-xs font-normal truncate ${isCorrection ? 'text-amber-700' : 'text-neutral-800'}`}>
                      {firstName}
                    </p>
                    <p className={`text-[10px] font-normal ${isCorrection ? 'text-amber-500' : 'text-neutral-400'}`}>
                      {isCorrection ? 'Correction' : getRoleAction(step.role)}
                    </p>
                  </>
                )}
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
