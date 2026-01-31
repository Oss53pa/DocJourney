import React, { useState, useEffect } from 'react';
import { UserX, UserCheck, Calendar, ArrowRight } from 'lucide-react';
import type { ParticipantRecord, Participant } from '../../types';
import { setAbsence, clearAbsence } from '../../services/participantService';
import { detectBlockedWorkflows } from '../../services/blockageService';
import ParticipantPicker from './ParticipantPicker';

interface AbsenceManagerProps {
  participant: ParticipantRecord;
  onDone: () => void;
}

export default function AbsenceManager({ participant, onDone }: AbsenceManagerProps) {
  const [absent, setAbsentState] = useState(participant.isAbsent || false);
  const [startDate, setStartDate] = useState(
    participant.absenceStart ? new Date(participant.absenceStart).toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    participant.absenceEnd ? new Date(participant.absenceEnd).toISOString().split('T')[0] : ''
  );
  const [substitute, setSubstitute] = useState<Participant>({
    name: '', email: participant.substituteEmail || '',
  });
  const [affectedCount, setAffectedCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Count affected workflows
    detectBlockedWorkflows().then(blocked => {
      const count = blocked.filter(b => b.blockedParticipant.email === participant.email).length;
      setAffectedCount(count);
    });
  }, [participant.email]);

  const handleSave = async () => {
    setSaving(true);
    if (absent) {
      await setAbsence(
        participant.id,
        true,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        substitute.email || undefined
      );
    } else {
      await clearAbsence(participant.id);
    }
    setSaving(false);
    onDone();
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAbsentState(!absent)}
          className={`relative w-12 h-7 rounded-full transition-colors ${absent ? 'bg-amber-500' : 'bg-neutral-300'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${absent ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
        <div className="flex items-center gap-2">
          {absent ? <UserX size={16} className="text-amber-600" /> : <UserCheck size={16} className="text-emerald-600" />}
          <span className="text-sm font-medium text-neutral-800">
            {absent ? 'Absent' : 'Présent'}
          </span>
        </div>
      </div>

      {/* Absence details */}
      {absent && (
        <div className="space-y-3 animate-slide-down">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={12} /> Début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={12} /> Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Substitute */}
          <div>
            <label className="label">Remplaçant</label>
            <ParticipantPicker
              value={substitute}
              onChange={setSubstitute}
              placeholder="Sélectionner un remplaçant..."
            />
          </div>

          {/* Warning */}
          {affectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl ring-1 ring-amber-200">
              <UserX size={14} className="text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700">
                {affectedCount} workflow{affectedCount !== 1 ? 's' : ''} en cours sera{affectedCount !== 1 ? 'ont' : ''} affecté{affectedCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm flex-1">
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Enregistrer <ArrowRight size={14} /></>
          )}
        </button>
        <button onClick={onDone} className="btn-ghost btn-sm">
          Annuler
        </button>
      </div>
    </div>
  );
}
