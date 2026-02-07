import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, FileText, MessageSquare, Loader2 } from 'lucide-react';
import type { Workflow, WorkflowStep } from '../../types';
import { resubmitStepAfterCorrection } from '../../services/workflowService';

interface CorrectionRequestBannerProps {
  workflow: Workflow;
  onResubmit?: () => void;
}

export default function CorrectionRequestBanner({
  workflow,
  onResubmit,
}: CorrectionRequestBannerProps) {
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!workflow.awaitingCorrection || workflow.correctionStepIndex === undefined) {
    return null;
  }

  const step = workflow.steps[workflow.correctionStepIndex];
  if (!step || step.status !== 'correction_requested') {
    return null;
  }

  const lastCorrection = step.correctionHistory?.[step.correctionHistory.length - 1];
  const reason = lastCorrection?.reason || step.response?.generalComment || step.response?.rejectionDetails?.reason;

  const handleResubmit = async () => {
    setIsResubmitting(true);
    try {
      const result = await resubmitStepAfterCorrection(workflow.id, workflow.correctionStepIndex!);
      if (result.success && onResubmit) {
        onResubmit();
      }
    } finally {
      setIsResubmitting(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-amber-900">
            Correction demandée
          </h3>
          <p className="text-xs text-amber-700 mt-0.5">
            {step.participant.name} a demandé des modifications avant de continuer.
            {step.correctionCount && step.correctionCount > 1 && (
              <span className="ml-1 text-amber-600">
                ({step.correctionCount}e demande)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Correction reason */}
      {reason && (
        <div className="bg-white/60 rounded-lg p-3 border border-amber-100">
          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800 mb-1">Raison de la demande :</p>
              <p className="text-sm text-amber-900">{reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Correction history */}
      {step.correctionHistory && step.correctionHistory.length > 1 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-amber-600 hover:text-amber-800 underline"
        >
          {showDetails ? 'Masquer' : 'Voir'} l'historique ({step.correctionHistory.length} demandes)
        </button>
      )}

      {showDetails && step.correctionHistory && (
        <div className="space-y-2 animate-fade-in">
          {step.correctionHistory.map((entry, index) => (
            <div
              key={index}
              className="bg-white/40 rounded-lg p-2 text-xs border border-amber-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-amber-700">
                  Demande #{index + 1} par {entry.requestedBy.name}
                </span>
                <span className="text-amber-500">
                  {new Date(entry.requestedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {entry.reason && (
                <p className="text-amber-800 mt-1">{entry.reason}</p>
              )}
              {entry.correctedAt && (
                <p className="text-emerald-600 mt-1">
                  Corrigé le {new Date(entry.correctedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={handleResubmit}
          disabled={isResubmitting}
          className="btn-primary btn-sm"
        >
          {isResubmitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {isResubmitting ? 'Envoi...' : 'Renvoyer pour validation'}
        </button>
        <p className="text-xs text-amber-600">
          Le document sera renvoyé à {step.participant.name}
        </p>
      </div>
    </div>
  );
}
