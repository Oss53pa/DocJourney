import React, { useState } from 'react';
import { RefreshCw, SkipForward, CalendarPlus, Ban, AlertCircle } from 'lucide-react';
import type { BlockedWorkflowInfo, Participant } from '../../types';
import { reassignStep, skipStep, extendDeadline } from '../../services/blockageService';
import { cancelWorkflow } from '../../services/workflowService';
import Modal from '../common/Modal';
import ParticipantPicker from '../participants/ParticipantPicker';

interface UnblockActionsProps {
  info: BlockedWorkflowInfo;
  onClose: () => void;
  onResolved: () => void;
}

type ActionTab = 'reassign' | 'skip' | 'extend' | 'cancel';

export default function UnblockActions({ info, onClose, onResolved }: UnblockActionsProps) {
  const [activeTab, setActiveTab] = useState<ActionTab>('reassign');
  const [newParticipant, setNewParticipant] = useState<Participant>(
    info.substituteAvailable || { name: '', email: '' }
  );
  const [skipReason, setSkipReason] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleReassign = async () => {
    if (!newParticipant.email.trim()) return;
    setProcessing(true);
    await reassignStep(info.workflowId, info.blockedStepIndex, newParticipant);
    setProcessing(false);
    onResolved();
  };

  const handleSkip = async () => {
    if (!skipReason.trim()) return;
    setProcessing(true);
    await skipStep(info.workflowId, info.blockedStepIndex, skipReason);
    setProcessing(false);
    onResolved();
  };

  const handleExtend = async () => {
    if (!newDeadline) return;
    setProcessing(true);
    await extendDeadline(info.workflowId, new Date(newDeadline));
    setProcessing(false);
    onResolved();
  };

  const handleCancel = async () => {
    setProcessing(true);
    await cancelWorkflow(info.workflowId);
    setProcessing(false);
    onResolved();
  };

  const tabs: { id: ActionTab; label: string; icon: React.ReactNode }[] = [
    { id: 'reassign', label: 'Réassigner', icon: <RefreshCw size={14} /> },
    { id: 'skip', label: 'Passer', icon: <SkipForward size={14} /> },
    { id: 'extend', label: 'Prolonger', icon: <CalendarPlus size={14} /> },
    { id: 'cancel', label: 'Annuler', icon: <Ban size={14} /> },
  ];

  return (
    <Modal isOpen onClose={onClose} title="Débloquer le workflow" size="md">
      <div className="space-y-5">
        {/* Info */}
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-xl">
          <AlertCircle size={14} className="text-neutral-500" />
          <span className="text-sm text-neutral-600">
            <span className="font-medium">{info.documentName}</span> — Étape {info.blockedStepIndex + 1}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'reassign' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">
              Réassigner cette étape à un autre participant.
            </p>
            <ParticipantPicker
              value={newParticipant}
              onChange={setNewParticipant}
              placeholder="Sélectionner le nouveau participant..."
            />
            <button
              onClick={handleReassign}
              disabled={!newParticipant.email.trim() || processing}
              className="btn-primary w-full"
            >
              {processing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><RefreshCw size={14} /> Réassigner à {newParticipant.name || '...'}</>
              )}
            </button>
          </div>
        )}

        {activeTab === 'skip' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">
              Passer cette étape et avancer au participant suivant.
            </p>
            <div>
              <label className="label">Raison *</label>
              <textarea
                value={skipReason}
                onChange={e => setSkipReason(e.target.value)}
                className="input"
                rows={3}
                placeholder="Expliquez pourquoi cette étape est passée..."
              />
            </div>
            <button
              onClick={handleSkip}
              disabled={!skipReason.trim() || processing}
              className="btn-primary w-full"
            >
              {processing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><SkipForward size={14} /> Passer cette étape</>
              )}
            </button>
          </div>
        )}

        {activeTab === 'extend' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">
              Définir une nouvelle échéance pour ce workflow.
            </p>
            <div>
              <label className="label">Nouvelle échéance *</label>
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <button
              onClick={handleExtend}
              disabled={!newDeadline || processing}
              className="btn-primary w-full"
            >
              {processing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><CalendarPlus size={14} /> Prolonger l'échéance</>
              )}
            </button>
          </div>
        )}

        {activeTab === 'cancel' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl ring-1 ring-red-200">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Cette action est irréversible. Le circuit de validation sera définitivement annulé et le document marqué comme rejeté.
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={processing}
              className="w-full px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Ban size={14} /> Annuler le circuit</>
              )}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
