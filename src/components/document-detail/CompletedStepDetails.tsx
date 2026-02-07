import { Check, X, SkipForward, MessageSquare, PenTool, FileSignature } from 'lucide-react';
import type { Workflow, WorkflowStep } from '../../types';
import { formatDate, formatDuration, getRoleLabel, getDecisionLabel, getParticipantColor } from '../../utils';

interface CompletedStepDetailsProps {
  workflow: Workflow;
}

export default function CompletedStepDetails({ workflow }: CompletedStepDetailsProps) {
  const { steps } = workflow;
  const rejectedIndex = steps.findIndex(s => s.status === 'rejected');
  const isRejected = rejectedIndex >= 0;

  return (
    <div className="card p-5 space-y-3">
      <h3 className="section-title">Détails des étapes</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isCancelled = isRejected && i > rejectedIndex;
          return (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              color={getParticipantColor(i)}
              isCancelled={isCancelled}
            />
          );
        })}
      </div>
    </div>
  );
}

function StepCard({ step, index, color, isCancelled }: {
  step: WorkflowStep;
  index: number;
  color: string;
  isCancelled: boolean;
}) {
  const isDone = step.status === 'completed';
  const isRej = step.status === 'rejected';
  const isSkipped = step.status === 'skipped';
  const isModReq = step.response?.decision === 'modification_requested';

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isCancelled
        ? 'border-dashed border-neutral-200 bg-neutral-50/50 opacity-50'
        : isRej
        ? 'border-red-200 bg-red-50/30'
        : 'border-neutral-200'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-white font-normal flex-shrink-0"
          style={{ backgroundColor: isCancelled ? '#d4d4d4' : color }}
        >
          {isDone ? <Check size={13} strokeWidth={3} />
            : isRej ? <X size={13} strokeWidth={3} />
            : isSkipped ? <SkipForward size={11} />
            : index + 1
          }
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-neutral-800">{step.participant.name}</span>
          <span className="text-xs text-neutral-400 ml-2">{getRoleLabel(step.role)}</span>
        </div>

        {/* Decision badge */}
        {step.response?.decision && !isCancelled && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-normal ${
            isModReq ? 'bg-amber-100 text-amber-700'
            : isRej ? 'bg-red-100 text-red-700'
            : 'bg-emerald-100 text-emerald-700'
          }`}>
            {getDecisionLabel(step.response.decision)}
          </span>
        )}
        {isSkipped && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-normal bg-amber-100 text-amber-700">
            Passée
          </span>
        )}
        {isCancelled && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-normal bg-neutral-100 text-neutral-400">
            Annulée
          </span>
        )}
      </div>

      {/* Details (only for non-cancelled steps) */}
      {!isCancelled && (isDone || isRej || isSkipped) && (
        <div className="mt-3 ml-9 space-y-2">
          {/* Dates */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
            {step.sentAt && <span>Reçu le {formatDate(step.sentAt)}</span>}
            {step.completedAt && <span>Terminé le {formatDate(step.completedAt)}</span>}
            {step.sentAt && step.completedAt && (
              <span className="font-normal" style={{ color }}>
                Durée : {formatDuration(step.sentAt, step.completedAt)}
              </span>
            )}
          </div>

          {/* Skipped reason */}
          {isSkipped && step.skippedReason && (
            <p className="text-xs text-amber-600 italic">{step.skippedReason}</p>
          )}

          {/* Comment */}
          {step.response?.generalComment && (
            <div className="flex items-start gap-2">
              <MessageSquare size={12} className="text-neutral-400 mt-0.5 flex-shrink-0" />
              <blockquote className="text-xs text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2 border-l-2 border-neutral-200 flex-1">
                {step.response.generalComment}
              </blockquote>
            </div>
          )}

          {/* Rejection details */}
          {step.response?.rejectionDetails?.reason && step.response.rejectionDetails.reason !== step.response.generalComment && (
            <div className="flex items-start gap-2">
              <X size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
              <blockquote className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border-l-2 border-red-200 flex-1">
                {step.response.rejectionDetails.reason}
              </blockquote>
            </div>
          )}

          {/* Signature indicator (image not shown for security) */}
          {step.response?.signature && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <PenTool size={11} className="flex-shrink-0" />
              <span>Signature apposée</span>
            </div>
          )}

          {/* Initials indicator (image not shown for security) */}
          {step.response?.initials && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <FileSignature size={11} className="flex-shrink-0" />
              <span>Paraphe apposé</span>
            </div>
          )}

          {/* Annotations count */}
          {step.response?.annotations && step.response.annotations.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <MessageSquare size={11} />
              {step.response.annotations.length} annotation{step.response.annotations.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
