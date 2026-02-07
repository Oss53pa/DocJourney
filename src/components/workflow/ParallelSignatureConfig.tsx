import React, { useState } from 'react';
import { Users, Plus, X, UserPlus } from 'lucide-react';
import type { Participant } from '../../types';

interface ParallelSignatureConfigProps {
  participants: Participant[];
  mode: 'all' | 'any';
  onParticipantsChange: (participants: Participant[]) => void;
  onModeChange: (mode: 'all' | 'any') => void;
  onRemove: () => void;
  existingParticipants?: Array<{ name: string; email: string }>;
}

export default function ParallelSignatureConfig({
  participants,
  mode,
  onParticipantsChange,
  onModeChange,
  onRemove,
  existingParticipants = [],
}: ParallelSignatureConfigProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleAddParticipant = () => {
    if (!newName.trim() || !newEmail.trim()) return;

    const newParticipant: Participant = {
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
    };

    // Check for duplicates
    if (participants.some(p => p.email === newParticipant.email)) {
      return;
    }

    onParticipantsChange([...participants, newParticipant]);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const handleRemoveParticipant = (index: number) => {
    const updated = participants.filter((_, i) => i !== index);
    onParticipantsChange(updated);
  };

  const handleSelectExisting = (participant: { name: string; email: string }) => {
    if (participants.some(p => p.email === participant.email)) {
      return;
    }
    onParticipantsChange([...participants, participant]);
  };

  return (
    <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-600" />
          <span className="text-sm font-medium text-purple-900">Signatures parallèles</span>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
            {participants.length} participant(s)
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-500"
          title="Supprimer la signature parallèle"
        >
          <X size={14} />
        </button>
      </div>

      {/* Mode selection */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange('all')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            mode === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
          }`}
        >
          Tous doivent signer
        </button>
        <button
          onClick={() => onModeChange('any')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            mode === 'any'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
          }`}
        >
          Un seul suffit
        </button>
      </div>

      <p className="text-[11px] text-purple-600">
        {mode === 'all'
          ? 'Le workflow avancera quand tous les participants auront signé.'
          : 'Le workflow avancera dès qu\'un participant aura signé.'}
      </p>

      {/* Participants list */}
      <div className="space-y-2">
        {participants.map((participant, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-100"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {participant.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">{participant.email}</p>
            </div>
            <button
              onClick={() => handleRemoveParticipant(index)}
              className="p-1 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add participant */}
      {!showAddForm ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary btn-sm flex-1"
          >
            <Plus size={14} />
            Ajouter un participant
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-3 border border-purple-100 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nom"
              className="input text-sm"
            />
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email"
              className="input text-sm"
            />
          </div>

          {/* Existing participants suggestions */}
          {existingParticipants.length > 0 && (
            <div>
              <p className="text-[11px] text-neutral-500 mb-1.5">Contacts existants :</p>
              <div className="flex flex-wrap gap-1.5">
                {existingParticipants
                  .filter(p => !participants.some(pp => pp.email === p.email))
                  .slice(0, 5)
                  .map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectExisting(p)}
                      className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2 py-1 rounded-lg"
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewEmail('');
              }}
              className="btn-secondary btn-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleAddParticipant}
              disabled={!newName.trim() || !newEmail.trim()}
              className="btn-primary btn-sm"
            >
              <UserPlus size={14} />
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
