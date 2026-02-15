import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import Modal from '../common/Modal';
import { addDays } from '../../utils/dateUtils';
import { extendRetention } from '../../services/retentionService';

interface ExtendRetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentEndDate: Date;
  onExtended: () => void;
}

const PRESETS = [
  { label: '7 jours', days: 7 },
  { label: '14 jours', days: 14 },
  { label: '30 jours', days: 30 },
];

export default function ExtendRetentionModal({
  isOpen,
  onClose,
  documentId,
  currentEndDate,
  onExtended,
}: ExtendRetentionModalProps) {
  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const newDate = addDays(new Date(currentEndDate), days);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await extendRetention(documentId, days);
      onExtended();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prolonger la rétention" size="sm">
      <div className="space-y-5">
        <div className="space-y-3">
          <label className="block text-xs font-normal text-neutral-500">
            Nombre de jours supplémentaires
          </label>

          {/* Presets */}
          <div className="flex gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.days}
                onClick={() => setDays(preset.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-normal transition-all ${
                  days === preset.days
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 1))}
            className="input w-full"
          />
        </div>

        {/* Preview */}
        <div className="bg-neutral-50 rounded-xl p-4 space-y-1">
          <p className="text-xs text-neutral-500">
            Date actuelle de suppression : <strong>{new Date(currentEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </p>
          <p className="text-xs text-neutral-700">
            Nouvelle date : <strong className="text-neutral-900">{newDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={submitting} className="btn-primary flex-1">
            <CalendarPlus size={14} />
            {submitting ? 'Prolongement...' : 'Prolonger'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
