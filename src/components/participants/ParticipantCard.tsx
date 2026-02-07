import React, { useState } from 'react';
import { Mail, Phone, Building, FileText, Star, StarOff, UserX, UserCheck, Save, X } from 'lucide-react';
import type { ParticipantRecord } from '../../types';
import { updateParticipant, toggleFavorite } from '../../services/participantService';
import { getRoleLabel, formatDateShort } from '../../utils';

interface ParticipantCardProps {
  participant: ParticipantRecord;
  onUpdate: () => void;
  onManageAbsence: (p: ParticipantRecord) => void;
}

export default function ParticipantCard({ participant, onUpdate, onManageAbsence }: ParticipantCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(participant.name);
  const [email, setEmail] = useState(participant.email);
  const [phone, setPhone] = useState(participant.phone || '');
  const [department, setDepartment] = useState(participant.department || '');
  const [organization, setOrganization] = useState(participant.organization || '');
  const [notes, setNotes] = useState(participant.notes || '');

  const handleSave = async () => {
    await updateParticipant(participant.id, {
      name,
      email,
      phone: phone || undefined,
      department: department || undefined,
      organization: organization || undefined,
      notes: notes || undefined,
    });
    setEditing(false);
    onUpdate();
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite(participant.id);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
          style={{ backgroundColor: participant.color }}
        >
          {participant.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input text-sm font-medium"
            />
          ) : (
            <h3 className="text-sm font-medium text-neutral-900">{participant.name}</h3>
          )}
          {editing ? (
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input text-xs mt-1"
              placeholder="email@example.com"
            />
          ) : (
            <p className="text-xs text-neutral-400 mt-0.5">{participant.email}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleToggleFavorite}
            className="btn-icon hover:bg-amber-50 text-neutral-400 hover:text-amber-500"
          >
            {participant.isFavorite ? <Star size={14} className="text-amber-400 fill-amber-400" /> : <StarOff size={14} />}
          </button>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
              Modifier
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleSave} className="btn-primary btn-sm"><Save size={12} /></button>
              <button onClick={() => setEditing(false)} className="btn-ghost btn-sm"><X size={12} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Absence badge */}
      {participant.isAbsent && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl ring-1 ring-amber-200">
          <UserX size={14} className="text-amber-600" />
          <span className="text-sm text-amber-700">
            Absent{participant.absenceStart ? ` du ${formatDateShort(participant.absenceStart)}` : ''}
            {participant.absenceEnd ? ` au ${formatDateShort(participant.absenceEnd)}` : ''}
          </span>
          {participant.substituteEmail && (
            <span className="text-xs text-amber-500 ml-auto">Remplaçant : {participant.substituteEmail}</span>
          )}
        </div>
      )}

      {/* Editable fields */}
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Téléphone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="Optionnel" />
          </div>
          <div>
            <label className="label">Organisation</label>
            <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} className="input" placeholder="Optionnel" />
          </div>
          <div>
            <label className="label">Département</label>
            <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className="input" placeholder="Optionnel" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input" rows={2} placeholder="Notes sur ce contact..." />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {participant.organization && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Building size={14} className="text-neutral-400" />
              <span>{participant.organization}</span>
            </div>
          )}
          {participant.phone && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Phone size={14} className="text-neutral-400" />
              <span>{participant.phone}</span>
            </div>
          )}
          {participant.department && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <FileText size={14} className="text-neutral-400" />
              <span>{participant.department}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Mail size={14} className="text-neutral-400" />
            <span>{participant.email}</span>
          </div>
          {participant.notes && (
            <p className="text-sm text-neutral-500 italic mt-1">"{participant.notes}"</p>
          )}
        </div>
      )}

      {/* Stats & Roles */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
        {participant.roles.map(role => (
          <span key={role} className="badge-neutral text-[11px]">{getRoleLabel(role)}</span>
        ))}
        <span className="text-[11px] text-neutral-400 ml-auto">
          {participant.totalWorkflows} workflow{participant.totalWorkflows !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Absence action */}
      <button
        onClick={() => onManageAbsence(participant)}
        className={`btn-ghost btn-sm w-full ${participant.isAbsent ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
      >
        {participant.isAbsent ? <UserCheck size={14} /> : <UserX size={14} />}
        {participant.isAbsent ? 'Marquer présent' : 'Marquer absent'}
      </button>
    </div>
  );
}
