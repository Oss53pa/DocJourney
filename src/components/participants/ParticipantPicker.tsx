import React, { useState, useRef, useEffect } from 'react';
import { Search, UserCircle, Users, AlertTriangle, ChevronDown } from 'lucide-react';
import type { Participant, ParticipantRecord, ParticipantGroup } from '../../types';
import { searchParticipants } from '../../services/participantService';
import { getAllGroups } from '../../services/participantGroupService';
import { db } from '../../db';

interface ParticipantPickerProps {
  value: Participant;
  onChange: (p: Participant) => void;
  placeholder?: string;
}

export default function ParticipantPicker({ value, onChange, placeholder = 'Rechercher un contact...' }: ParticipantPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ParticipantRecord[]>([]);
  const [groups, setGroups] = useState<ParticipantGroup[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<ParticipantRecord[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getAllGroups().then(setGroups);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const data = await searchParticipants(query);
      setResults(data);
      setLoading(false);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExpandGroup = async (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
      setGroupMembers([]);
      return;
    }
    setExpandedGroup(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const all = await db.participants.toArray();
      setGroupMembers(all.filter(p => group.memberEmails.includes(p.email)));
    }
  };

  const handleSelect = (p: ParticipantRecord) => {
    onChange({ name: p.name, email: p.email, organization: p.organization });
    setQuery('');
    setShowDropdown(false);
  };

  const showResults = showDropdown && (results.length > 0 || groups.length > 0 || query.trim().length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={query || (value.name ? `${value.name} (${value.email})` : '')}
          onChange={e => {
            setQuery(e.target.value);
            setShowDropdown(true);
            if (!e.target.value) {
              onChange({ name: '', email: '', organization: '' });
            }
          }}
          onFocus={() => {
            if (value.name) {
              setQuery('');
            }
            setShowDropdown(true);
            if (!query.trim()) {
              searchParticipants('').then(setResults);
            }
          }}
          className="input pl-9 pr-8"
          placeholder={placeholder}
        />
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300" />
      </div>

      {showResults && (
        <div className="absolute z-40 w-full mt-1 bg-white rounded-xl shadow-lg ring-1 ring-neutral-200 max-h-64 overflow-auto">
          {/* Contact results */}
          {results.length > 0 && (
            <div className="p-1.5">
              <p className="px-3 py-1 text-[10px] text-neutral-400 uppercase tracking-wide font-medium">Contacts</p>
              {results.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-50 text-left transition-colors"
                >
                  <UserCircle size={16} className="text-neutral-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{p.email}{p.organization ? ` — ${p.organization}` : ''}</p>
                  </div>
                  {p.isAbsent && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] flex-shrink-0">
                      <AlertTriangle size={10} /> Absent
                    </span>
                  )}
                  {p.isFavorite && (
                    <span className="text-amber-400 text-xs flex-shrink-0">★</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Groups */}
          {groups.length > 0 && (
            <div className="p-1.5 border-t border-neutral-100">
              <p className="px-3 py-1 text-[10px] text-neutral-400 uppercase tracking-wide font-medium">Groupes</p>
              {groups.map(g => (
                <div key={g.id}>
                  <button
                    type="button"
                    onClick={() => handleExpandGroup(g.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-50 text-left transition-colors"
                  >
                    <Users size={16} className="text-neutral-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-800">{g.name}</p>
                      <p className="text-[11px] text-neutral-400">{g.memberEmails.length} membre{g.memberEmails.length !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronDown size={14} className={`text-neutral-300 transition-transform ${expandedGroup === g.id ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedGroup === g.id && groupMembers.length > 0 && (
                    <div className="pl-8 pb-1">
                      {groupMembers.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelect(m)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-50 text-left transition-colors"
                        >
                          <UserCircle size={14} className="text-neutral-400 flex-shrink-0" />
                          <span className="text-[13px] text-neutral-700 truncate">{m.name}</span>
                          {m.isAbsent && <AlertTriangle size={10} className="text-amber-500 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {results.length === 0 && groups.length === 0 && query.trim() && !loading && (
            <div className="p-4 text-center text-sm text-neutral-400">
              Aucun résultat
            </div>
          )}
        </div>
      )}
    </div>
  );
}
