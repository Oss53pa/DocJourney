import React, { useState, useMemo } from 'react';
import { Search, Star, UserX, Trash2, Building, Mail, Plus, User, Phone, FileText } from 'lucide-react';
import type { ParticipantRecord } from '../../types';
import { useParticipants } from '../../hooks/useParticipants';
import { deleteParticipant, toggleFavorite, createParticipant } from '../../services/participantService';
import { getRoleLabel } from '../../utils';

interface ParticipantDirectoryProps {
  onSelect: (p: ParticipantRecord) => void;
}

export default function ParticipantDirectory({ onSelect }: ParticipantDirectoryProps) {
  const { participants, loading, refresh } = useParticipants();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed' | 'totalWorkflows'>('name');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterAbsent, setFilterAbsent] = useState(false);

  // New contact form state
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    organization: '',
    phone: '',
    department: '',
    notes: '',
  });

  const handleCreateContact = async () => {
    if (!newContact.name.trim() || !newContact.email.trim()) return;

    setCreateError('');
    try {
      await createParticipant({
        name: newContact.name.trim(),
        email: newContact.email.trim(),
        organization: newContact.organization.trim() || undefined,
        phone: newContact.phone.trim() || undefined,
        department: newContact.department.trim() || undefined,
        notes: newContact.notes.trim() || undefined,
      });
      setNewContact({ name: '', email: '', organization: '', phone: '', department: '', notes: '' });
      setShowCreate(false);
      refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const cancelCreate = () => {
    setShowCreate(false);
    setCreateError('');
    setNewContact({ name: '', email: '', organization: '', phone: '', department: '', notes: '' });
  };

  const filtered = useMemo(() => {
    let list = [...participants];

    if (search.trim()) {
      const lower = search.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(lower) ||
          p.email.toLowerCase().includes(lower) ||
          (p.organization && p.organization.toLowerCase().includes(lower))
      );
    }

    if (filterFavorites) list = list.filter(p => p.isFavorite);
    if (filterAbsent) list = list.filter(p => p.isAbsent);

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'lastUsed') return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      return b.totalWorkflows - a.totalWorkflows;
    });

    return list;
  }, [participants, search, sortBy, filterFavorites, filterAbsent]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Supprimer ce contact ?')) {
      await deleteParticipant(id);
      refresh();
    }
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(id);
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
      {/* Create button + Search & filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-secondary btn-sm">
            <Plus size={14} /> Nouveau contact
          </button>
        )}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Rechercher un contact..."
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="input w-auto"
        >
          <option value="name">Nom</option>
          <option value="lastUsed">Dernière utilisation</option>
          <option value="totalWorkflows">Nb workflows</option>
        </select>
      </div>

      {/* New contact form */}
      {showCreate && (
        <div className="card p-4 space-y-4 animate-slide-up">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <User size={16} className="text-blue-500" />
            Nouveau contact
          </div>

          {createError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                value={newContact.name}
                onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                className="input"
                placeholder="Jean Dupont"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={newContact.email}
                onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                className="input"
                placeholder="jean.dupont@exemple.fr"
              />
            </div>
            <div>
              <label className="label">Organisation</label>
              <div className="relative">
                <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={newContact.organization}
                  onChange={e => setNewContact({ ...newContact, organization: e.target.value })}
                  className="input pl-9"
                  placeholder="Société ABC"
                />
              </div>
            </div>
            <div>
              <label className="label">Téléphone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                  className="input pl-9"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>
            <div>
              <label className="label">Département</label>
              <input
                type="text"
                value={newContact.department}
                onChange={e => setNewContact({ ...newContact, department: e.target.value })}
                className="input"
                placeholder="Direction juridique"
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={newContact.notes}
                  onChange={e => setNewContact({ ...newContact, notes: e.target.value })}
                  className="input pl-9"
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreateContact}
              disabled={!newContact.name.trim() || !newContact.email.trim()}
              className="btn-primary btn-sm"
            >
              Créer le contact
            </button>
            <button onClick={cancelCreate} className="btn-ghost btn-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Filter toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`btn-sm rounded-lg transition-colors ${
            filterFavorites
              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
          }`}
        >
          <Star size={12} className={filterFavorites ? 'fill-amber-400' : ''} /> Favoris
        </button>
        <button
          onClick={() => setFilterAbsent(!filterAbsent)}
          className={`btn-sm rounded-lg transition-colors ${
            filterAbsent
              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
          }`}
        >
          <UserX size={12} /> Absents
        </button>
      </div>

      {/* Participant list */}
      {filtered.length === 0 ? (
        <div className="card px-5 py-10 text-center">
          <p className="text-sm text-neutral-400">Aucun contact trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div
              key={p.id}
              className="card-interactive p-4 flex items-center gap-3"
              onClick={() => onSelect(p)}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-800 truncate">{p.name}</p>
                  {p.isFavorite && <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                  {p.isAbsent && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] flex-shrink-0">
                      <UserX size={10} /> Absent
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-neutral-400 truncate flex items-center gap-1">
                    <Mail size={10} /> {p.email}
                  </span>
                  {p.organization && (
                    <span className="text-[11px] text-neutral-400 truncate flex items-center gap-1 hidden sm:flex">
                      <Building size={10} /> {p.organization}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="hidden sm:flex flex-wrap gap-1">
                  {p.roles.slice(0, 2).map(role => (
                    <span key={role} className="badge-neutral text-[10px]">{getRoleLabel(role)}</span>
                  ))}
                </div>
                <span className="text-[11px] text-neutral-300 hidden sm:block">
                  {p.totalWorkflows} wf
                </span>
                <button
                  onClick={e => handleToggleFavorite(p.id, e)}
                  className="btn-icon hover:bg-amber-50 text-neutral-300 hover:text-amber-500"
                >
                  <Star size={14} className={p.isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
                <button
                  onClick={e => handleDelete(p.id, e)}
                  className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
