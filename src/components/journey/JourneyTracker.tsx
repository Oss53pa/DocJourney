import React from 'react';
import { Check, X, RotateCcw, Users, Send, Flag } from 'lucide-react';
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
  const isFinished = isCompleted || isRejected || isCancelled;

  return (
    <div className={compact ? '' : 'py-1'}>
      <div className="flex items-start px-1">
        {steps.map((step, i) => {
          const isDone = step.status === 'completed';
          const isRej = step.status === 'rejected';
          const isCorrection = step.status === 'correction_requested';
          const isCurrent = !isFinished && i === workflow.currentStepIndex;
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

          const firstName = step.participant.name.split(' ')[0];

          return (
            <React.Fragment key={step.id}>
              {/* Step column: dot + plane + label */}
              <div className="flex flex-col items-center min-w-0" style={{ width: compact ? undefined : 80 }}>
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
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  ) : (
                    <span className="text-[10px] font-normal">{i + 1}</span>
                  )}
                </div>

                {/* Plane + label below dot */}
                {!compact && (
                  <div className="hidden sm:flex flex-col items-center mt-2">
                    <div className="h-5 flex items-center justify-center">
                      {isCurrent && (
                        <Send size={14} strokeWidth={2.5} className="text-sky-500 animate-bounce" />
                      )}
                    </div>
                    {isParallel ? (
                      <>
                        <p className={`text-xs font-normal truncate max-w-[76px] ${isCurrent ? 'text-sky-700 font-medium' : 'text-purple-700'}`}>
                          {step.parallelParticipants!.length} signataires
                        </p>
                        <p className={`text-[10px] font-normal ${isCurrent ? 'text-sky-500' : 'text-purple-500'}`}>
                          {step.parallelMode === 'all' ? 'Tous' : 'Un seul'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`text-xs truncate max-w-[76px] ${
                          isCurrent ? 'font-medium text-sky-700' : isCorrection ? 'font-normal text-amber-700' : 'font-normal text-neutral-800'
                        }`}>
                          {firstName}
                        </p>
                        <p className={`text-[10px] font-normal ${
                          isCurrent ? 'text-sky-500' : isCorrection ? 'text-amber-500' : 'text-neutral-400'
                        }`}>
                          {isCorrection ? 'Correction' : getRoleAction(step.role)}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Line between steps */}
              {i < steps.length - 1 && (
                <div
                  className={`journey-line self-center mt-[14px] ${
                    isDone
                      ? 'bg-emerald-400'
                      : isRej
                      ? 'bg-red-400'
                      : isCorrection
                      ? 'bg-amber-400'
                      : 'bg-neutral-200'
                  }`}
                  style={{ marginTop: 18 }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Line to end node */}
        <div
          className={`journey-line ${
            isCompleted
              ? 'bg-emerald-400'
              : isRejected
              ? 'bg-red-400'
              : 'bg-neutral-200'
          }`}
          style={{ marginTop: 18 }}
        />

        {/* End column: Terminé */}
        <div className="flex flex-col items-center">
          <div
            className={`journey-dot ${
              isCompleted
                ? 'bg-emerald-500 text-white'
                : isRejected
                ? 'bg-red-500 text-white'
                : isCancelled
                ? 'bg-neutral-400 text-white'
                : 'bg-neutral-200 text-neutral-400'
            }`}
            title={isCompleted ? 'Terminé' : isRejected ? 'Rejeté' : isCancelled ? 'Annulé' : 'En attente'}
          >
            <Flag size={14} strokeWidth={2.5} />
          </div>

          {!compact && (
            <div className="hidden sm:flex flex-col items-center mt-2">
              <div className="h-5 flex items-center justify-center">
                {isFinished && (
                  <Send size={14} strokeWidth={2.5} className={`animate-bounce ${
                    isRejected ? 'text-red-500' : 'text-emerald-500'
                  }`} />
                )}
              </div>
              <p className={`text-xs font-normal ${
                isCompleted ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-neutral-400'
              }`}>
                {isRejected ? 'Rejeté' : 'Terminé'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function JourneyTrackerMini({ workflow }: { workflow: Workflow }) {
  return <JourneyTracker workflow={workflow} compact />;
}
