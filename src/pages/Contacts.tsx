import React, { useState } from 'react';
import { Users, BookUser } from 'lucide-react';
import ParticipantDirectory from '../components/participants/ParticipantDirectory';
import ParticipantGroupManager from '../components/participants/ParticipantGroupManager';
import ParticipantCard from '../components/participants/ParticipantCard';
import AbsenceManager from '../components/participants/AbsenceManager';
import type { ParticipantRecord } from '../types';
import Modal from '../components/common/Modal';

type Tab = 'directory' | 'groups';

export default function Contacts() {
  const [activeTab, setActiveTab] = useState<Tab>('directory');
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantRecord | null>(null);
  const [showAbsenceManager, setShowAbsenceManager] = useState(false);
  const [absenceParticipant, setAbsenceParticipant] = useState<ParticipantRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleManageAbsence = (p: ParticipantRecord) => {
    setAbsenceParticipant(p);
    setShowAbsenceManager(true);
  };

  const handleAbsenceDone = () => {
    setShowAbsenceManager(false);
    setAbsenceParticipant(null);
    setRefreshKey(k => k + 1);
    setSelectedParticipant(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 tracking-tight">
            Contacts
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gérez votre annuaire de participants et vos groupes
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 max-w-xs">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] transition-colors ${
            activeTab === 'directory'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <BookUser size={14} /> Annuaire
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] transition-colors ${
            activeTab === 'groups'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Users size={14} /> Groupes
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'directory' && (
        <ParticipantDirectory
          key={refreshKey}
          onSelect={p => setSelectedParticipant(p)}
        />
      )}

      {activeTab === 'groups' && (
        <ParticipantGroupManager />
      )}

      {/* Contact detail slide-over */}
      <Modal
        isOpen={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        title="Fiche contact"
        size="md"
      >
        {selectedParticipant && (
          <ParticipantCard
            participant={selectedParticipant}
            onUpdate={() => {
              setRefreshKey(k => k + 1);
              // Reload the selected participant
              setSelectedParticipant(null);
            }}
            onManageAbsence={handleManageAbsence}
          />
        )}
      </Modal>

      {/* Absence manager modal */}
      <Modal
        isOpen={showAbsenceManager && !!absenceParticipant}
        onClose={() => { setShowAbsenceManager(false); setAbsenceParticipant(null); }}
        title={`Gestion d'absence — ${absenceParticipant?.name || ''}`}
        size="sm"
      >
        {absenceParticipant && (
          <AbsenceManager
            participant={absenceParticipant}
            onDone={handleAbsenceDone}
          />
        )}
      </Modal>
    </div>
  );
}
