import React, { useState } from 'react';
import { Send, Plus, Trash2, ArrowRight, Save, Check, Layers } from 'lucide-react';
import type { DocJourneyDocument, ParticipantRole, WorkflowTemplate } from '../../types';
import { getParticipantColor } from '../../utils';
import type { StepConfig } from '../../services/workflowService';
import { createWorkflow } from '../../services/workflowService';
import { incrementUsage, saveCurrentAsTemplate } from '../../services/workflowTemplateService';

const ROLES: { value: ParticipantRole; label: string; desc: string }[] = [
  { value: 'reviewer', label: 'Annotateur', desc: 'Annote et commente' },
  { value: 'validator', label: 'Validateur', desc: 'Valide ou rejette' },
  { value: 'approver', label: 'Approbateur', desc: 'Approbation finale' },
  { value: 'signer', label: 'Signataire', desc: 'Appose sa signature' },
];

interface StepFormData {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: ParticipantRole;
  instructions: string;
}

interface WorkflowSetupSectionProps {
  doc: DocJourneyDocument;
  templates: WorkflowTemplate[];
  settings: { ownerName: string; ownerEmail: string; ownerOrganization?: string };
  onCreated: () => void;
  onMessage: (msg: string, type: 'success' | 'error') => void;
}

export default function WorkflowSetupSection({
  doc,
  templates,
  settings,
  onCreated,
  onMessage,
}: WorkflowSetupSectionProps) {
  const [workflowName, setWorkflowName] = useState(`Validation de ${doc.name}`);
  const [wfSteps, setWfSteps] = useState<StepFormData[]>([{
    id: crypto.randomUUID(), name: '', email: '', organization: '', role: 'reviewer', instructions: '',
  }]);
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateSaveName, setTemplateSaveName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);

  const addStep = () => {
    if (wfSteps.length < 10) setWfSteps([...wfSteps, {
      id: crypto.randomUUID(), name: '', email: '', organization: '', role: 'reviewer', instructions: '',
    }]);
  };

  const removeStep = (index: number) => {
    if (wfSteps.length > 1) setWfSteps(wfSteps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepFormData, value: string) => {
    const updated = [...wfSteps];
    updated[index] = { ...updated[index], [field]: value };
    setWfSteps(updated);
  };

  const applyTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setWfSteps(template.steps.map(s => ({
      id: crypto.randomUUID(),
      name: s.participantName || '',
      email: s.participantEmail || '',
      organization: s.participantOrganization || '',
      role: s.role,
      instructions: s.instructions || '',
    })));
    await incrementUsage(templateId);
  };

  const handleSaveAsTemplate = async () => {
    if (!templateSaveName.trim()) return;
    await saveCurrentAsTemplate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { steps: wfSteps.map((s, i) => ({ id: s.id, order: i + 1, participant: { name: s.name, email: s.email, organization: s.organization || undefined }, role: s.role as ParticipantRole, status: 'pending' as const, instructions: s.instructions || undefined })) } as any,
      templateSaveName,
    );
    setTemplateSaved(true);
    setShowSaveTemplate(false);
    setTemplateSaveName('');
    setTimeout(() => setTemplateSaved(false), 3000);
  };

  const handleCreateWorkflow = async () => {
    for (let i = 0; i < wfSteps.length; i++) {
      if (!wfSteps[i].name.trim() || !wfSteps[i].email.trim()) {
        onMessage(`Remplissez le nom et l'email de l'étape ${i + 1}.`, 'error');
        return;
      }
    }
    if (!settings.ownerName || !settings.ownerEmail) {
      onMessage('Configurez votre profil dans les paramètres d\'abord.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const stepConfigs: StepConfig[] = wfSteps.map(s => ({
        participant: { name: s.name, email: s.email, organization: s.organization || undefined },
        role: s.role,
        instructions: s.instructions || undefined,
      }));
      await createWorkflow(doc.id, workflowName || `Validation de ${doc.name}`, stepConfigs, {
        name: settings.ownerName, email: settings.ownerEmail, organization: settings.ownerOrganization,
      }, deadline ? new Date(deadline) : undefined);
      onMessage('Circuit de validation créé avec succès', 'success');
      onCreated();
    } catch {
      onMessage('Erreur lors de la création du workflow.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6 space-y-4 border-sky-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
            <Send size={16} className="text-sky-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Configurer le circuit de validation</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Ajoutez les étapes et participants du circuit</p>
          </div>
        </div>

        {/* Template selector */}
        {templates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-purple-500" />
              <label className="text-xs font-normal text-neutral-500">Appliquer un modèle</label>
            </div>
            <select
              value={selectedTemplateId}
              onChange={e => applyTemplate(e.target.value)}
              className="input"
            >
              <option value="">Aucun modèle</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.steps.length} étape{t.steps.length > 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Workflow name + deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nom du workflow</label>
            <input
              type="text"
              value={workflowName}
              onChange={e => setWorkflowName(e.target.value)}
              className="input"
              placeholder={`Validation de ${doc.name}`}
            />
          </div>
          <div>
            <label className="label">Échéance (optionnelle)</label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="input"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        <h3 className="section-title">Étapes du circuit ({wfSteps.length}/10)</h3>
        <button onClick={addStep} disabled={wfSteps.length >= 10} className="btn-secondary btn-sm">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <div className="space-y-3">
        {wfSteps.map((step, i) => (
          <div key={step.id} className="card p-4 sm:p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-normal flex-shrink-0 shadow-sm"
                style={{ backgroundColor: getParticipantColor(i) }}
              >
                {i + 1}
              </div>
              <h4 className="text-sm font-medium text-neutral-800 flex-1">Étape {i + 1}</h4>
              {wfSteps.length > 1 && (
                <button onClick={() => removeStep(i)} className="btn-icon hover:bg-red-50 text-neutral-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Nom *</label>
                <input
                  type="text"
                  name={`step-${i}-name`}
                  autoComplete="off"
                  value={step.name}
                  onChange={e => updateStep(i, 'name', e.target.value)}
                  className="input"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  name={`step-${i}-email`}
                  autoComplete="off"
                  value={step.email}
                  onChange={e => updateStep(i, 'email', e.target.value)}
                  className="input"
                  placeholder="jean@example.com"
                />
              </div>
              <div>
                <label className="label">Organisation</label>
                <input
                  type="text"
                  name={`step-${i}-organization`}
                  autoComplete="off"
                  value={step.organization}
                  onChange={e => updateStep(i, 'organization', e.target.value)}
                  className="input"
                  placeholder="Optionnel"
                />
              </div>
              <div>
                <label className="label">Rôle *</label>
                <select value={step.role} onChange={e => updateStep(i, 'role', e.target.value)} className="input">
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="label">Instructions</label>
              <textarea value={step.instructions} onChange={e => updateStep(i, 'instructions', e.target.value)} className="input" rows={2} placeholder="Instructions pour cet intervenant..." />
            </div>
          </div>
        ))}
      </div>

      {/* Save as template */}
      {!showSaveTemplate ? (
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSaveTemplate(true)} className="btn-ghost btn-sm text-purple-600 hover:bg-purple-50">
            <Save size={14} /> Sauvegarder comme modèle
          </button>
          {templateSaved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-normal animate-fade-in">
              <Check size={14} /> Modèle sauvegardé
            </span>
          )}
        </div>
      ) : (
        <div className="card p-4 space-y-3 animate-slide-up border-purple-200">
          <label className="label">Nom du modèle</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={templateSaveName}
              onChange={e => setTemplateSaveName(e.target.value)}
              className="input flex-1"
              placeholder="Ex: Circuit validation standard"
              autoFocus
            />
            <button onClick={handleSaveAsTemplate} disabled={!templateSaveName.trim()} className="btn-primary btn-sm">
              <Save size={14} /> Sauvegarder
            </button>
            <button onClick={() => { setShowSaveTemplate(false); setTemplateSaveName(''); }} className="btn-ghost btn-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-100">
        <p className="text-xs text-neutral-400 font-normal">
          {wfSteps.length} étape{wfSteps.length > 1 ? 's' : ''} configurée{wfSteps.length > 1 ? 's' : ''}
        </p>
        <button onClick={handleCreateWorkflow} disabled={submitting} className="btn-primary btn-lg w-full sm:w-auto">
          {submitting ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création...</>
          ) : (
            <>Créer le circuit <ArrowRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}
