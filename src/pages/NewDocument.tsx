import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, Plus, Trash2, ArrowRight, ArrowLeft, AlertCircle, Check, Save, Layers, FileEdit } from 'lucide-react';
import { importDocument } from '../services/documentService';
import { createWorkflow, type StepConfig } from '../services/workflowService';
import { useSettings } from '../hooks/useSettings';
import { useDocumentGroups } from '../hooks/useDocumentGroups';
import { addDocumentsToGroup } from '../services/documentGroupService';
import { useWorkflowTemplates } from '../hooks/useWorkflowTemplates';
import { incrementUsage } from '../services/workflowTemplateService';
import { saveCurrentAsTemplate } from '../services/workflowTemplateService';
import { formatFileSize, getParticipantColor } from '../utils';
import { getParticipant } from '../services/participantService';
import type { ParticipantRole, DocJourneyDocument, Participant } from '../types';
import ParticipantPicker from '../components/participants/ParticipantPicker';

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

const emptyStep = (): StepFormData => ({
  id: crypto.randomUUID(),
  name: '', email: '', organization: '', role: 'reviewer', instructions: '',
});

export default function NewDocument() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { templates, refresh: refreshTemplates } = useWorkflowTemplates();
  const { groups: docGroups } = useDocumentGroups();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<DocJourneyDocument | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [steps, setSteps] = useState<StepFormData[]>([emptyStep()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateSaveName, setTemplateSaveName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const [deadline, setDeadline] = useState('');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleNext = async () => {
    if (!file) return;
    try {
      const imported = await importDocument(file);
      if (category) imported.metadata.category = category;
      if (description) imported.metadata.description = description;
      setDoc(imported);
      if (selectedGroupId) {
        await addDocumentsToGroup(selectedGroupId, [imported.id]);
      }
      setWorkflowName(`Validation de ${file.name}`);
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError("Erreur lors de l'importation du fichier.");
    }
  };

  const handleSaveAsDraft = async () => {
    if (!file) return;
    try {
      const imported = await importDocument(file);
      if (category) imported.metadata.category = category;
      if (description) imported.metadata.description = description;
      if (selectedGroupId) {
        await addDocumentsToGroup(selectedGroupId, [imported.id]);
      }
      navigate(`/document/${imported.id}`);
    } catch {
      setError("Erreur lors de l'importation.");
    }
  };

  const addStep = () => { if (steps.length < 10) setSteps([...steps, emptyStep()]); };
  const removeStep = (index: number) => { if (steps.length > 1) setSteps(steps.filter((_, i) => i !== index)); };
  const [absenceWarnings, setAbsenceWarnings] = useState<Record<number, boolean>>({});

  const updateStep = (index: number, field: keyof StepFormData, value: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleParticipantSelect = async (index: number, p: Participant) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], name: p.name, email: p.email, organization: p.organization || '' };
    setSteps(updated);
    // Check absence
    if (p.email) {
      const record = await getParticipant(p.email);
      setAbsenceWarnings(prev => ({ ...prev, [index]: !!record?.isAbsent }));
    }
  };

  const applyTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const newSteps: StepFormData[] = template.steps.map(s => ({
      id: crypto.randomUUID(),
      name: s.participantName || '',
      email: s.participantEmail || '',
      organization: s.participantOrganization || '',
      role: s.role,
      instructions: s.instructions || '',
    }));
    setSteps(newSteps);
    await incrementUsage(templateId);
  };

  const handleSaveAsTemplate = async () => {
    if (!templateSaveName.trim()) return;
    await saveCurrentAsTemplate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { steps: steps.map((s, i) => ({ id: s.id, order: i + 1, participant: { name: s.name, email: s.email, organization: s.organization || undefined }, role: s.role as ParticipantRole, status: 'pending' as const, instructions: s.instructions || undefined })) } as any,
      templateSaveName,
    );
    setTemplateSaved(true);
    setShowSaveTemplate(false);
    setTemplateSaveName('');
    await refreshTemplates();
    setTimeout(() => setTemplateSaved(false), 3000);
  };

  const handleSubmit = async () => {
    if (!doc) return;
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].name.trim() || !steps[i].email.trim()) {
        setError(`Remplissez le nom et l'email de l'étape ${i + 1}.`);
        return;
      }
    }
    if (!settings.ownerName || !settings.ownerEmail) {
      setError('Configurez votre profil dans les paramètres d\'abord.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const stepConfigs: StepConfig[] = steps.map(s => ({
        participant: { name: s.name, email: s.email, organization: s.organization || undefined },
        role: s.role,
        instructions: s.instructions || undefined,
      }));
      await createWorkflow(doc.id, workflowName, stepConfigs, {
        name: settings.ownerName, email: settings.ownerEmail, organization: settings.ownerOrganization,
      }, deadline ? new Date(deadline) : undefined);
      navigate(`/document/${doc.id}`);
    } catch {
      setError('Erreur lors de la création du workflow.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button onClick={() => navigate('/')} className="btn-ghost btn-sm -ml-2">
        <ArrowLeft size={14} /> Tableau de bord
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 tracking-tight">
          Nouveau document
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Importez un document et configurez son circuit de validation
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[13px] font-normal transition-colors ${
          currentStep === 1 ? 'bg-neutral-900 text-white shadow-md' : 'bg-neutral-100 text-neutral-400'
        }`}>
          {currentStep > 1 ? <Check size={14} /> : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>}
          <span className="hidden sm:inline">Document</span>
          <span className="sm:hidden">Doc</span>
        </div>
        <div className={`h-0.5 w-6 sm:w-10 rounded-full ${currentStep >= 2 ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
        <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[13px] font-normal transition-colors ${
          currentStep === 2 ? 'bg-neutral-900 text-white shadow-md' : 'bg-neutral-100 text-neutral-400'
        }`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
          Workflow
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-normal ring-1 ring-red-200 animate-slide-down">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ═══ STEP 1: IMPORT ═══ */}
      {currentStep === 1 && (
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              card border-2 border-dashed p-8 sm:p-14
              flex flex-col items-center justify-center cursor-pointer
              transition-all duration-300
              ${dragOver
                ? 'border-neutral-900 bg-neutral-900/[0.02] scale-[1.01]'
                : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
              }
            `}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              dragOver ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
            }`}>
              <Upload size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-normal text-neutral-700 text-center">
              {dragOver ? 'Déposez ici' : 'Glissez-déposez un fichier'}
            </p>
            <p className="text-xs text-neutral-400 mt-1.5 text-center">
              ou cliquez pour parcourir — PDF, Word, Excel, Images, Texte
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.md"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </div>

          {/* Accepted formats info */}
          {!file && (
            <div className="card p-5">
              <p className="text-xs font-normal text-neutral-500 mb-3">Formats acceptés</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'PDF', ext: '.pdf', color: 'bg-red-50 text-red-600' },
                  { label: 'Word', ext: '.doc, .docx', color: 'bg-blue-50 text-blue-600' },
                  { label: 'Excel', ext: '.xls, .xlsx', color: 'bg-green-50 text-green-600' },
                  { label: 'PowerPoint', ext: '.ppt, .pptx', color: 'bg-orange-50 text-orange-600' },
                  { label: 'Images', ext: '.jpg, .png, .gif', color: 'bg-purple-50 text-purple-600' },
                  { label: 'Texte', ext: '.txt, .csv, .md', color: 'bg-neutral-100 text-neutral-600' },
                ].map(f => (
                  <div key={f.label} className={`px-3 py-1.5 rounded-lg text-xs font-normal ${f.color}`}>
                    <span className="font-medium">{f.label}</span>
                    <span className="ml-1 opacity-60">{f.ext}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 mt-3">Taille maximale : 10 Mo</p>
            </div>
          )}

          {/* Template shortcut hint */}
          {!file && templates.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <Layers size={14} className="text-neutral-400" />
              <p className="text-xs text-neutral-400">
                Vous avez {templates.length} modèle{templates.length > 1 ? 's' : ''} de circuit disponible{templates.length > 1 ? 's' : ''}.
                <button onClick={() => { /* just scroll info */ }} className="text-neutral-600 underline ml-1">
                  Importer d'abord un document
                </button>
                {' '}pour les utiliser.
              </p>
            </div>
          )}

          {/* File preview */}
          {file && (
            <div className="card p-5 space-y-4 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0 relative">
                  <FileText size={20} className="text-white" />
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-neutral-700 text-white text-[9px] font-medium rounded uppercase">
                    {file.name.split('.').pop()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-neutral-900 truncate">{file.name}</p>
                  <p className="text-xs text-neutral-400 font-normal">{formatFileSize(file.size)}</p>
                </div>
                <button onClick={() => setFile(null)} className="btn-icon hover:bg-red-50 text-neutral-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Catégorie</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                    <option value="">Sélectionner...</option>
                    <option value="Contrat">Contrat</option>
                    <option value="Facture">Facture</option>
                    <option value="Rapport">Rapport</option>
                    <option value="Devis">Devis</option>
                    <option value="Note de service">Note de service</option>
                    <option value="Avenant">Avenant</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="label">Description</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="Optionnel..." />
                </div>
                <div>
                  <label className="label">Groupe</label>
                  <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="input">
                    <option value="">Aucun groupe</option>
                    {docGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {file && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Que voulez-vous faire ?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handleNext} className="card p-4 text-left hover:shadow-lg hover:border-neutral-300 hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center">
                      <ArrowRight size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Configurer un circuit</span>
                  </div>
                  <p className="text-xs text-neutral-400">Definir les etapes et lancer la validation</p>
                </button>
                <button onClick={handleSaveAsDraft} className="card p-4 text-left hover:shadow-lg hover:border-neutral-300 hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <FileEdit size={16} className="text-neutral-500" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Enregistrer en brouillon</span>
                  </div>
                  <p className="text-xs text-neutral-400">Sauvegarder pour configurer le circuit plus tard</p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 2: WORKFLOW ═══ */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <button onClick={() => setCurrentStep(1)} className="btn-ghost btn-sm -ml-2">
            <ArrowLeft size={14} /> Retour
          </button>

          {/* Template selector */}
          {templates.length > 0 && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-purple-500" />
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
          <div className="card p-5 space-y-4">
            <div>
              <label className="label">Nom du workflow</label>
              <input type="text" value={workflowName} onChange={e => setWorkflowName(e.target.value)} className="input" placeholder="Ex: Validation contrat de prestation" />
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

          {/* Steps */}
          <div className="flex items-center justify-between">
            <h3 className="section-title">Étapes du circuit ({steps.length}/10)</h3>
            <button onClick={addStep} disabled={steps.length >= 10} className="btn-secondary btn-sm">
              <Plus size={14} /> Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={step.id} className="card p-4 sm:p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-normal flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: getParticipantColor(i) }}
                  >
                    {i + 1}
                  </div>
                  <h4 className="text-sm font-medium text-neutral-800 flex-1">Étape {i + 1}</h4>
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="btn-icon hover:bg-red-50 text-neutral-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Participant picker */}
                <div className="mb-3">
                  <label className="label">Participant (recherche rapide)</label>
                  <ParticipantPicker
                    value={{ name: step.name, email: step.email, organization: step.organization }}
                    onChange={p => handleParticipantSelect(i, p)}
                  />
                  {absenceWarnings[i] && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Ce participant est actuellement absent
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nom *</label>
                    <input type="text" value={step.name} onChange={e => updateStep(i, 'name', e.target.value)} className="input" placeholder="Jean Dupont" />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input type="email" value={step.email} onChange={e => updateStep(i, 'email', e.target.value)} className="input" placeholder="jean@example.com" />
                  </div>
                  <div>
                    <label className="label">Organisation</label>
                    <input type="text" value={step.organization} onChange={e => updateStep(i, 'organization', e.target.value)} className="input" placeholder="Optionnel" />
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
              {steps.length} étape{steps.length > 1 ? 's' : ''} configurée{steps.length > 1 ? 's' : ''}
            </p>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary btn-lg w-full sm:w-auto">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création...</>
              ) : (
                <>Créer le circuit <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
