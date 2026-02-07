import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import type { Workflow, Participant } from '../../types';
import { cancelWorkflow } from '../../services/workflowService';

interface CancelWorkflowModalProps {
  workflow: Workflow;
  currentUser: Participant;
  onClose: () => void;
  onCancelled: () => void;
}

export default function CancelWorkflowModal({
  workflow,
  currentUser,
  onClose,
  onCancelled,
}: CancelWorkflowModalProps) {
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const result = await cancelWorkflow(workflow.id, currentUser, reason || undefined);
      if (result.success) {
        onCancelled();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setIsCancelling(false);
    }
  };

  // Count steps that will be affected
  const pendingSteps = workflow.steps.filter(
    s => s.status === 'pending' || s.status === 'sent' || s.status === 'correction_requested'
  );
  const completedSteps = workflow.steps.filter(s => s.status === 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-medium text-neutral-900">Annuler le workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800 font-medium mb-2">
              Cette action est irréversible
            </p>
            <p className="text-xs text-red-700">
              L'annulation marquera le document comme rejeté et interrompra toutes les étapes en cours.
            </p>
          </div>

          {/* Impact summary */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-neutral-700">Impact de l'annulation :</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-lg font-medium text-neutral-900">{completedSteps.length}</p>
                <p className="text-[11px] text-neutral-500">Étape(s) terminée(s)</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-lg font-medium text-red-600">{pendingSteps.length}</p>
                <p className="text-[11px] text-neutral-500">Étape(s) annulée(s)</p>
              </div>
            </div>
          </div>

          {/* Reason input */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              Raison de l'annulation (optionnel)
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Document obsolète, erreur de saisie..."
              className="input min-h-[80px] resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-100">
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="btn-secondary btn-sm"
          >
            Retour
          </button>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="btn-danger btn-sm"
          >
            {isCancelling ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <AlertTriangle size={14} />
            )}
            {isCancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
          </button>
        </div>
      </div>
    </div>
  );
}
