import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Trash2, FileText, Plus, Pencil, Save, CheckCircle2 } from 'lucide-react';
import { useWorkflowTemplates } from '../../hooks/useWorkflowTemplates';
import { deleteTemplate, updateTemplate } from '../../services/workflowTemplateService';
import { getRoleLabel } from '../../utils';
import type { WorkflowTemplate, WorkflowTemplateStep, ParticipantRole } from '../../types';
import Modal from '../common/Modal';

const ROLES: { value: ParticipantRole; label: string }[] = [
  { value: 'reviewer', label: 'Annotateur' },
  { value: 'validator', label: 'Validateur' },
  { value: 'approver', label: 'Approbateur' },
  { value: 'signer', label: 'Signataire' },
];

interface EditState {
  id: string;
  name: string;
  description: string;
  steps: WorkflowTemplateStep[];
}

export default function WorkflowTemplatesSection() {
  const navigate = useNavigate();
  const { templates, loading, refresh } = useWorkflowTemplates();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTemplate(deleteId);
    setDeleteId(null);
    await refresh();
  };

  const openEdit = (template: WorkflowTemplate) => {
    setEditing({
      id: template.id,
      name: template.name,
      description: template.description || '',
      steps: template.steps.map(s => ({ ...s })),
    });
    setSaved(false);
  };

  const closeEdit = () => {
    setEditing(null);
    setSaved(false);
  };

  const updateEditStep = (index: number, field: keyof WorkflowTemplateStep, value: string) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[index] = { ...steps[index], [field]: value };
    setEditing({ ...editing, steps });
  };

  const addEditStep = () => {
    if (!editing || editing.steps.length >= 10) return;
    setEditing({
      ...editing,
      steps: [...editing.steps, { role: 'reviewer' as ParticipantRole }],
    });
  };

  const removeEditStep = (index: number) => {
    if (!editing || editing.steps.length <= 1) return;
    setEditing({
      ...editing,
      steps: editing.steps.filter((_, i) => i !== index),
    });
  };

  const handleSaveEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    await updateTemplate(editing.id, {
      name: editing.name.trim(),
      description: editing.description.trim() || undefined,
      steps: editing.steps,
    });
    setSaving(false);
    setSaved(true);
    await refresh();
    setTimeout(() => {
      closeEdit();
    }, 800);
  };

  return (
    <>
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Layers size={16} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Modèles de workflow</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Configurations de workflow réutilisables</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={24} className="text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">Aucun modèle sauvegardé</p>
            <p className="text-xs text-neutral-300 mt-1">Créez un modèle depuis la page "Nouveau document"</p>
            <button
              onClick={() => navigate('/new')}
              className="btn-primary btn-sm mt-4"
            >
              <Plus size={14} />
              Nouveau document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(template => (
              <div key={template.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-neutral-800 truncate">{template.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-neutral-400 font-normal">
                      {template.steps.length} étape{template.steps.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-[11px] text-neutral-300">•</span>
                    <span className="text-[11px] text-neutral-400">
                      {template.steps.map(s => getRoleLabel(s.role)).join(' → ')}
                    </span>
                    <span className="text-[11px] text-neutral-300">•</span>
                    <span className="text-[11px] text-neutral-400">
                      {template.usageCount} utilisation{template.usageCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(template)}
                  className="btn-icon hover:bg-purple-50 text-neutral-300 hover:text-purple-500"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(template.id)}
                  className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer le modèle" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-neutral-600">Ce modèle sera définitivement supprimé.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleDelete} className="btn-danger flex-1">Supprimer</button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={closeEdit} title="Modifier le modèle" size="lg">
        {editing && (
          <div className="space-y-5">
            {/* Name + Description */}
            <div className="space-y-3">
              <div>
                <label className="label">Nom du modèle *</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Validation complète"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  className="input"
                  placeholder="Optionnel"
                />
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Étapes ({editing.steps.length}/10)</label>
                <button onClick={addEditStep} disabled={editing.steps.length >= 10} className="btn-secondary btn-sm">
                  <Plus size={13} /> Ajouter
                </button>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {editing.steps.map((step, i) => (
                  <div key={i} className="p-3.5 bg-neutral-50 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-normal text-neutral-500 uppercase tracking-wider">
                        Étape {i + 1}
                      </span>
                      {editing.steps.length > 1 && (
                        <button onClick={() => removeEditStep(i)} className="btn-icon text-neutral-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-normal text-neutral-400 mb-1">Rôle *</label>
                        <select
                          value={step.role}
                          onChange={e => updateEditStep(i, 'role', e.target.value)}
                          className="input text-sm"
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-normal text-neutral-400 mb-1">Nom</label>
                        <input
                          type="text"
                          value={step.participantName || ''}
                          onChange={e => updateEditStep(i, 'participantName', e.target.value)}
                          className="input text-sm"
                          placeholder="Pré-remplir le nom"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-normal text-neutral-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={step.participantEmail || ''}
                          onChange={e => updateEditStep(i, 'participantEmail', e.target.value)}
                          className="input text-sm"
                          placeholder="Pré-remplir l'email"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-normal text-neutral-400 mb-1">Organisation</label>
                        <input
                          type="text"
                          value={step.participantOrganization || ''}
                          onChange={e => updateEditStep(i, 'participantOrganization', e.target.value)}
                          className="input text-sm"
                          placeholder="Optionnel"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-normal text-neutral-400 mb-1">Instructions</label>
                      <textarea
                        value={step.instructions || ''}
                        onChange={e => updateEditStep(i, 'instructions', e.target.value)}
                        className="input text-sm"
                        rows={2}
                        placeholder="Instructions pour cet intervenant..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
              <button onClick={handleSaveEdit} disabled={saving || !editing.name.trim()} className="btn-primary flex-1">
                {saved ? (
                  <><CheckCircle2 size={15} /> Enregistré</>
                ) : saving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement...</>
                ) : (
                  <><Save size={15} /> Enregistrer</>
                )}
              </button>
              <button onClick={closeEdit} className="btn-secondary flex-1">
                Annuler
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
