import React, { useState, useMemo } from 'react';
import { Search, Star, UserX, Trash2, Building, Mail } from 'lucide-react';
import type { ParticipantRecord } from '../../types';
import { useParticipants } from '../../hooks/useParticipants';
import { deleteParticipant, toggleFavorite } from '../../services/participantService';
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
      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-2">
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
