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
      {/* Dots + lines + plane indicator */}
      <div className="flex items-center px-1">
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
                  <span className="text-[10px] font-bold">{i + 1}</span>
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

        {/* Line to end node */}
        <div
          className={`journey-line ${
            isCompleted
              ? 'bg-emerald-400'
              : isRejected
              ? 'bg-red-400'
              : 'bg-neutral-200'
          }`}
        />

        {/* End node: Terminé */}
        <div>
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
        </div>
      </div>

      {/* Labels (desktop only if not compact) */}
      {!compact && (
        <div className="hidden sm:flex mt-3 px-0">
          {steps.map((step) => {
            const isParallel = step.isParallel && step.parallelParticipants;
            const firstName = step.participant.name.split(' ')[0];
            const isCorrection = step.status === 'correction_requested';
            const isCurrent = !isFinished && steps.indexOf(step) === workflow.currentStepIndex;

            return (
              <div key={step.id} className="text-center flex-1 min-w-0 px-1">
                {/* Plane icon above the current participant's name */}
                <div className="h-5 flex items-center justify-center">
                  {isCurrent && (
                    <Send size={14} strokeWidth={2.5} className="text-sky-500 animate-bounce" />
                  )}
                </div>
                {isParallel ? (
                  <>
                    <p className={`text-xs font-normal truncate ${isCurrent ? 'text-sky-700 font-medium' : 'text-purple-700'}`}>
                      {step.parallelParticipants!.length} signataires
                    </p>
                    <p className={`text-[10px] font-normal ${isCurrent ? 'text-sky-500' : 'text-purple-500'}`}>
                      {step.parallelMode === 'all' ? 'Tous' : 'Un seul'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`text-xs truncate ${
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
            );
          })}
          {/* End label */}
          <div className="text-center min-w-[48px] px-1">
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
        </div>
      )}
    </div>
  );
}

export function JourneyTrackerMini({ workflow }: { workflow: Workflow }) {
  return <JourneyTracker workflow={workflow} compact />;
}
