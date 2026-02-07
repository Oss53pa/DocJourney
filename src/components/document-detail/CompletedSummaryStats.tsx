import { Clock, Users, CheckCircle2, XCircle, PenTool, MessageSquare, Layers, FileCheck } from 'lucide-react';
import type { Workflow, WorkflowStep } from '../../types';
import { formatDuration, getDecisionLabel } from '../../utils';

interface CompletedSummaryStatsProps {
  workflow: Workflow;
  completedSteps: WorkflowStep[];
  signatureCount: number;
  commentCount: number;
  annotationCount: number;
  isRejected: boolean;
}

export default function CompletedSummaryStats({
  workflow,
  completedSteps,
  signatureCount,
  commentCount,
  annotationCount,
  isRejected,
}: CompletedSummaryStatsProps) {
  const totalSteps = workflow.steps.length;
  const doneSteps = completedSteps.length;
  const uniqueParticipants = new Set(completedSteps.map(s => s.participant.email)).size;

  // Find final decision
  const finalStep = isRejected
    ? workflow.steps.find(s => s.status === 'rejected')
    : workflow.steps[workflow.steps.length - 1];
  const finalDecision = finalStep?.response?.decision;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Resume */}
      <div className="card p-5 space-y-3">
        <h3 className="section-title">Résumé</h3>
        <div className="space-y-2.5">
          {/* Duration */}
          {workflow.completedAt && (
            <div className="flex items-center gap-2.5">
              <Clock size={15} className="text-neutral-400 flex-shrink-0" />
              <span className="text-sm text-neutral-700">
                Durée totale : <strong className="text-neutral-900">{formatDuration(workflow.createdAt, workflow.completedAt)}</strong>
              </span>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-center gap-2.5">
            <Users size={15} className="text-neutral-400 flex-shrink-0" />
            <span className="text-sm text-neutral-700">
              {uniqueParticipants} intervenant{uniqueParticipants > 1 ? 's' : ''}
            </span>
          </div>

          {/* Final decision */}
          {finalDecision && (
            <div className="flex items-center gap-2.5">
              {isRejected
                ? <XCircle size={15} className="text-red-500 flex-shrink-0" />
                : <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
              }
              <span className="text-sm text-neutral-700">
                Décision finale :{' '}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-normal ${
                  isRejected ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                }`}>
                  {getDecisionLabel(finalDecision)}
                </span>
              </span>
            </div>
          )}

          {/* Signatures status */}
          {signatureCount > 0 && (
            <div className="flex items-center gap-2.5">
              <PenTool size={15} className="text-neutral-400 flex-shrink-0" />
              <span className="text-sm text-neutral-700">
                {signatureCount} signature{signatureCount > 1 ? 's' : ''} apposée{signatureCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="card p-5 space-y-3">
        <h3 className="section-title">Statistiques</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <Layers size={16} className="mx-auto text-neutral-400 mb-1" />
            <p className="text-lg font-medium text-neutral-900">{doneSteps}/{totalSteps}</p>
            <p className="text-[11px] text-neutral-500">Étapes</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <FileCheck size={16} className="mx-auto text-neutral-400 mb-1" />
            <p className="text-lg font-medium text-neutral-900">{annotationCount}</p>
            <p className="text-[11px] text-neutral-500">Annotations</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <PenTool size={16} className="mx-auto text-neutral-400 mb-1" />
            <p className="text-lg font-medium text-neutral-900">{signatureCount}</p>
            <p className="text-[11px] text-neutral-500">Signatures</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <MessageSquare size={16} className="mx-auto text-neutral-400 mb-1" />
            <p className="text-lg font-medium text-neutral-900">{commentCount}</p>
            <p className="text-[11px] text-neutral-500">Commentaires</p>
          </div>
        </div>
      </div>
    </div>
  );
}
