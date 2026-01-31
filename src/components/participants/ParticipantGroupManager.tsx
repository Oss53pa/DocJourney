import React, { useState } from 'react';
import { Plus, Trash2, Users, UserPlus, X } from 'lucide-react';
import type { ParticipantGroup, ParticipantRecord, Participant } from '../../types';
import { useParticipantGroups } from '../../hooks/useParticipantGroups';
import { createGroup, deleteGroup, addMember, removeMember } from '../../services/participantGroupService';
import { db } from '../../db';
import ParticipantPicker from './ParticipantPicker';

export default function ParticipantGroupManager() {
  const { groups, loading, refresh } = useParticipantGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<ParticipantRecord[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState<Participant>({ name: '', email: '' });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createGroup(newName.trim(), newDesc.trim() || undefined);
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce groupe ?')) {
      await deleteGroup(id);
      if (expandedId === id) setExpandedId(null);
      refresh();
    }
  };

  const handleExpand = async (group: ParticipantGroup) => {
    if (expandedId === group.id) {
      setExpandedId(null);
      setMembers([]);
      return;
    }
    setExpandedId(group.id);
    const all = await db.participants.toArray();
    setMembers(all.filter(p => group.memberEmails.includes(p.email)));
  };

  const handleAddMember = async () => {
    if (!expandedId || !newMember.email.trim()) return;
    await addMember(expandedId, newMember.email);
    setNewMember({ name: '', email: '' });
    setAddingMember(false);
    refresh();
    // Reload members
    const group = groups.find(g => g.id === expandedId);
    if (group) {
      const updatedGroup = { ...group, memberEmails: [...group.memberEmails, newMember.email] };
      const all = await db.participants.toArray();
      setMembers(all.filter(p => updatedGroup.memberEmails.includes(p.email)));
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!expandedId) return;
    await removeMember(expandedId, email);
    setMembers(members.filter(m => m.email !== email));
    refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      {!showCreate ? (
        <button onClick={() => setShowCreate(true)} className="btn-secondary btn-sm">
          <Plus size={14} /> Nouveau groupe
        </button>
      ) : (
        <div className="card p-4 space-y-3 animate-slide-up">
          <div>
            <label className="label">Nom du groupe *</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="input"
              placeholder="Ex: Équipe juridique"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="input"
              placeholder="Optionnel"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newName.trim()} className="btn-primary btn-sm">
              Créer
            </button>
            <button onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }} className="btn-ghost btn-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="card px-5 py-10 text-center">
          <p className="text-sm text-neutral-400">Aucun groupe créé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(group => (
            <div key={group.id} className="card overflow-hidden">
              <div
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => handleExpand(group)}
              >
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800">{group.name}</p>
                  <p className="text-[11px] text-neutral-400">
                    {group.memberEmails.length} membre{group.memberEmails.length !== 1 ? 's' : ''}
                    {group.description ? ` — ${group.description}` : ''}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(group.id); }}
                  className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Expanded content */}
              {expandedId === group.id && (
                <div className="border-t border-neutral-100 p-4 space-y-3 animate-slide-down">
                  {members.length === 0 ? (
                    <p className="text-sm text-neutral-400 text-center py-2">Aucun membre</p>
                  ) : (
                    <div className="space-y-1.5">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] flex-shrink-0"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-neutral-700 flex-1 truncate">{m.name}</span>
                          <span className="text-[11px] text-neutral-400 hidden sm:block">{m.email}</span>
                          <button
                            onClick={() => handleRemoveMember(m.email)}
                            className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add member */}
                  {addingMember ? (
                    <div className="space-y-2">
                      <ParticipantPicker
                        value={newMember}
                        onChange={setNewMember}
                        placeholder="Sélectionner un contact..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddMember}
                          disabled={!newMember.email.trim()}
                          className="btn-primary btn-sm"
                        >
                          Ajouter
                        </button>
                        <button
                          onClick={() => { setAddingMember(false); setNewMember({ name: '', email: '' }); }}
                          className="btn-ghost btn-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingMember(true)}
                      className="btn-ghost btn-sm text-purple-600 hover:bg-purple-50"
                    >
                      <UserPlus size={14} /> Ajouter un membre
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
