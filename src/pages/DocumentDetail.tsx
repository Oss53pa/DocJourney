import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Send, Upload, FileText, Clock, CheckCircle2,
  XCircle, AlertCircle, Eye, EyeOff, MessageSquare, Ban, Mail,
  Plus, Trash2, ArrowRight, Save, Check, Layers
} from 'lucide-react';
import { db } from '../db';
import type { DocJourneyDocument, Workflow, Annotation, ParticipantRole } from '../types';
import {
  formatDate, formatRelativeTime, formatDuration, getRoleLabel, getRoleAction,
  getDecisionLabel, getParticipantColor, formatFileSize, getRejectionCategoryLabel
} from '../utils';
import JourneyTracker from '../components/journey/JourneyTracker';
import { DocumentStatusBadge } from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { generatePackage, downloadFile, parseReturnFile } from '../services/packageService';
import { createWorkflow, processReturn, cancelWorkflow, type StepConfig } from '../services/workflowService';
import { generateValidationReport, downloadReport, getReport } from '../services/reportService';
import { generateEmailTemplate, copyToClipboard, sendEmailViaEmailJS, isEmailJSConfigured } from '../services/emailService';
import { uploadPackageToStorage, isSyncConfigured, getFirebaseConfig } from '../services/firebaseSyncService';
import { generateId } from '../utils';
import { generateMailtoLink } from '../services/reminderService';
import { useSettings } from '../hooks/useSettings';
import { useWorkflowTemplates } from '../hooks/useWorkflowTemplates';
import { incrementUsage, saveCurrentAsTemplate } from '../services/workflowTemplateService';
import BlockageAlert from '../components/blockage/BlockageAlert';
import { detectBlockedWorkflows } from '../services/blockageService';
import type { BlockedWorkflowInfo } from '../types';

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

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [doc, setDoc] = useState<DocJourneyDocument | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [filterParticipant, setFilterParticipant] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailHtml, setEmailHtml] = useState('');
  const [generatedPackageHtml, setGeneratedPackageHtml] = useState('');
  const [generatedHostedUrl, setGeneratedHostedUrl] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [blockageInfo, setBlockageInfo] = useState<BlockedWorkflowInfo | null>(null);
  const returnFileRef = useRef<HTMLInputElement>(null);

  // Workflow setup state
  const { templates } = useWorkflowTemplates();
  const [workflowName, setWorkflowName] = useState('');
  const [wfSteps, setWfSteps] = useState<StepFormData[]>([{
    id: crypto.randomUUID(), name: '', email: '', organization: '', role: 'reviewer', instructions: '',
  }]);
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateSaveName, setTemplateSaveName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const document = await db.documents.get(id);
    setDoc(document || null);
    if (document?.workflowId) {
      const wf = await db.workflows.get(document.workflowId);
      setWorkflow(wf || null);
      // Check for blockage
      if (wf && !wf.completedAt) {
        const blocked = await detectBlockedWorkflows();
        const match = blocked.find(b => b.workflowId === wf.id);
        setBlockageInfo(match || null);
      } else {
        setBlockageInfo(null);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Set default workflow name when document loads
  useEffect(() => {
    if (doc && !workflowName) {
      setWorkflowName(`Validation de ${doc.name}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleGeneratePackage = async () => {
    if (!doc || !workflow) return;
    setGenerating(true);
    try {
      const html = await generatePackage(doc, workflow, workflow.currentStepIndex);
      const step = workflow.steps[workflow.currentStepIndex];
      const filename = `${doc.name.replace(/\.[^.]+$/, '')}_${step.participant.name.replace(/\s+/g, '_')}.html`;
      downloadFile(html, filename);

      // Store the generated package for potential email upload
      setGeneratedPackageHtml(html);

      // Try to upload to Firebase Storage if sync is enabled
      const syncEnabled = isSyncConfigured(settings);
      const firebaseConfig = getFirebaseConfig(settings);
      let hostedUrl: string | undefined;

      console.log('=== FIREBASE STORAGE UPLOAD CHECK ===');
      console.log('syncEnabled:', syncEnabled);
      console.log('firebaseConfig:', firebaseConfig);
      console.log('settings.firebaseSyncEnabled:', settings.firebaseSyncEnabled);
      console.log('settings.firebaseApiKey:', settings.firebaseApiKey ? 'SET' : 'NOT SET');
      console.log('settings.firebaseDatabaseURL:', settings.firebaseDatabaseURL);
      console.log('settings.firebaseProjectId:', settings.firebaseProjectId);

      if (syncEnabled && firebaseConfig) {
        console.log('Sync is enabled, attempting upload...');
        try {
          const packageId = generateId();
          console.log('Generated packageId:', packageId);
          const uploadResult = await uploadPackageToStorage(
            html,
            packageId,
            step.participant.name,
            doc.name,
            firebaseConfig
          );
          console.log('Upload result:', uploadResult);
          if (uploadResult.success && uploadResult.url) {
            hostedUrl = uploadResult.url;
            setGeneratedHostedUrl(uploadResult.url);
            console.log('Package uploaded for preview:', hostedUrl);
          } else {
            console.error('Upload failed:', uploadResult.error);
          }
        } catch (error) {
          console.error('Error uploading package for preview:', error);
          setGeneratedHostedUrl('');
        }
      } else {
        console.log('Sync NOT enabled or no config - skipping upload');
        setGeneratedHostedUrl('');
      }

      // Generate email template preview with hosted URL if available
      console.log('=== GENERATING EMAIL TEMPLATE ===');
      console.log('syncEnabled:', syncEnabled);
      console.log('hostedUrl:', hostedUrl || 'NONE');
      const email = generateEmailTemplate(doc, workflow, workflow.currentStepIndex, syncEnabled, hostedUrl);
      console.log('Email template generated, length:', email.length);
      console.log('Contains "Ouvrir la page":', email.includes('Ouvrir la page'));
      setEmailHtml(email);
      setShowEmailModal(true);

      showMsg(`Paquet HTML généré pour ${step.participant.name}`);
      await loadData();
    } catch {
      showMsg('Erreur lors de la génération', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleReturnImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workflow) return;
    try {
      const text = await file.text();
      const returnData = parseReturnFile(text);
      if (!returnData) { showMsg('Fichier invalide', 'error'); return; }
      const result = await processReturn(workflow.id, returnData);
      showMsg(result.message, result.success ? 'success' : 'error');
      await loadData();
    } catch {
      showMsg("Erreur d'importation", 'error');
    }
    if (returnFileRef.current) returnFileRef.current.value = '';
  };

  const handleGenerateCRV = async () => {
    if (!doc || !workflow) return;
    setGenerating(true);
    try {
      let report = await getReport(workflow.id);
      if (!report) report = await generateValidationReport(workflow, doc);
      downloadReport(report, doc.name);
      showMsg('CRV généré');
    } catch {
      showMsg('Erreur de génération', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = async () => {
    if (!workflow) return;
    await cancelWorkflow(workflow.id);
    setShowCancelModal(false);
    showMsg('Circuit annulé');
    await loadData();
  };

  // Workflow setup handlers
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
    if (!doc) return;
    for (let i = 0; i < wfSteps.length; i++) {
      if (!wfSteps[i].name.trim() || !wfSteps[i].email.trim()) {
        showMsg(`Remplissez le nom et l'email de l'étape ${i + 1}.`, 'error');
        return;
      }
    }
    if (!settings.ownerName || !settings.ownerEmail) {
      showMsg('Configurez votre profil dans les paramètres d\'abord.', 'error');
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
      showMsg('Circuit de validation créé avec succès');
      await loadData();
    } catch {
      showMsg('Erreur lors de la création du workflow.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAllAnnotations = (): Annotation[] => {
    if (!workflow) return [];
    return workflow.steps.flatMap(s => s.response?.annotations || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">Document introuvable</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">Retour</button>
      </div>
    );
  }

  const isInProgress = doc.status === 'in_progress';
  const isCompleted = doc.status === 'completed';
  const isRejected = doc.status === 'rejected';
  const allAnnotations = getAllAnnotations();
  const completedSteps = workflow?.steps.filter(s => s.status === 'completed' || s.status === 'rejected' || s.status === 'skipped') || [];
  const pendingSteps = workflow?.steps.filter(s => s.status === 'pending' || s.status === 'sent') || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation */}
      <button onClick={() => navigate('/')} className="btn-ghost btn-sm -ml-2">
        <ArrowLeft size={14} /> Tableau de bord
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
          <FileText size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-medium text-neutral-900 tracking-tight break-words">
            {doc.name}
          </h1>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <DocumentStatusBadge status={doc.status} />
            <span className="text-xs text-neutral-400 font-normal">{formatFileSize(doc.size)}</span>
            {doc.metadata.category && <span className="badge-neutral">{doc.metadata.category}</span>}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down ${
          messageType === 'success'
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-red-50 text-red-700 ring-1 ring-red-200'
        }`}>
          {messageType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message}
        </div>
      )}

      {/* Workflow Setup — shown when document is draft with no workflow */}
      {doc.status === 'draft' && !workflow && (
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
      )}

      {/* Journey Tracker */}
      {workflow && (
        <div className="card p-5 sm:p-6">
          <h2 className="section-title mb-5">Journey Tracker</h2>
          <JourneyTracker workflow={workflow} />

          {/* Current step */}
          {isInProgress && (
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-sky-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-normal text-neutral-900">
                    Étape {workflow.currentStepIndex + 1}/{workflow.steps.length} — {getRoleAction(workflow.steps[workflow.currentStepIndex].role)}
                  </p>
                  <p className="text-sm text-neutral-600 mt-0.5 truncate">
                    {workflow.steps[workflow.currentStepIndex].participant.name}
                    <span className="text-neutral-400"> ({workflow.steps[workflow.currentStepIndex].participant.email})</span>
                  </p>
                  {workflow.steps[workflow.currentStepIndex].sentAt && (
                    <p className="text-xs text-neutral-400 mt-1 font-normal">
                      Envoyé {formatRelativeTime(workflow.steps[workflow.currentStepIndex].sentAt!)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Blockage alert */}
          {isInProgress && blockageInfo && (
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <BlockageAlert info={blockageInfo} onResolved={loadData} />
            </div>
          )}

          {/* Completed/rejected summary */}
          {(isCompleted || isRejected) && workflow.completedAt && (
            <div className="mt-5 pt-5 border-t border-neutral-100 flex items-center gap-3">
              {isCompleted
                ? <CheckCircle2 size={20} className="text-emerald-500" />
                : <XCircle size={20} className="text-red-500" />
              }
              <div>
                <p className="text-sm font-normal text-neutral-900">
                  Circuit {isCompleted ? 'terminé' : 'rejeté'} le {formatDate(workflow.completedAt)}
                </p>
                <p className="text-xs text-neutral-400 font-normal">
                  Durée : {formatDuration(workflow.createdAt, workflow.completedAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {workflow && (
        <div className="flex flex-wrap gap-2">
          {isInProgress && (
            <>
              <button onClick={handleGeneratePackage} disabled={generating} className="btn-primary">
                {generating
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={15} />
                }
                <span className="hidden sm:inline">Générer le paquet HTML</span>
                <span className="sm:hidden">Générer paquet</span>
              </button>
              <label className="btn-secondary cursor-pointer">
                <Upload size={15} />
                <span className="hidden sm:inline">Importer un retour</span>
                <span className="sm:hidden">Retour</span>
                <input ref={returnFileRef} type="file" accept=".docjourney" className="hidden" onChange={handleReturnImport} />
              </label>
              {workflow.steps[workflow.currentStepIndex] && settings.ownerName && (
                <a
                  href={generateMailtoLink(
                    workflow.steps[workflow.currentStepIndex].participant.email,
                    workflow.steps[workflow.currentStepIndex].participant.name,
                    doc.name,
                    settings.ownerName
                  )}
                  className="btn-secondary"
                >
                  <Mail size={15} />
                  <span className="hidden sm:inline">Relancer</span>
                </a>
              )}
              <button onClick={() => setShowCancelModal(true)} className="btn-ghost text-red-600 hover:bg-red-50">
                <Ban size={15} />
                <span className="hidden sm:inline">Annuler</span>
              </button>
            </>
          )}
          {(isCompleted || isRejected) && (
            <button onClick={handleGenerateCRV} disabled={generating} className="btn-primary">
              {generating
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Download size={15} />
              }
              Télécharger le CRV
            </button>
          )}
        </div>
      )}

      {/* Content grid — hidden when draft with no workflow */}
      {(workflow || doc.status !== 'draft') && <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Step History */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="section-title">Historique des étapes</h2>

          {completedSteps.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-sm text-neutral-400">Aucune étape complétée</p>
            </div>
          ) : (
            <div className="card divide-y divide-neutral-100">
              {completedSteps.map((step, i) => {
                const isStepRejected = step.status === 'rejected';
                const isStepSkipped = step.status === 'skipped';
                const isModificationRequested = step.response?.decision === 'modification_requested';
                const color = getParticipantColor(workflow!.steps.indexOf(step));
                return (
                  <div key={step.id} className="p-3 animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-medium" style={{ backgroundColor: isStepSkipped ? '#f59e0b' : color }}>
                        {step.order}
                      </span>
                      <span className="text-xs font-medium text-neutral-700">
                        {step.participant.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isModificationRequested ? 'bg-amber-100 text-amber-700'
                        : isStepRejected ? 'bg-red-100 text-red-700'
                        : isStepSkipped ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isStepSkipped ? 'Passée' : getDecisionLabel(step.response?.decision || '')}
                      </span>
                      {step.response?.annotations && step.response.annotations.length > 0 && (
                        <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                          <MessageSquare size={10} /> {step.response.annotations.length}
                        </span>
                      )}
                      {step.response?.signature && (
                        <span className="text-[10px] text-neutral-400">✍️</span>
                      )}
                      <span className="text-[10px] text-neutral-400 ml-auto">
                        {step.completedAt && formatDate(step.completedAt)}
                        {step.sentAt && step.completedAt && ` · ${formatDuration(step.sentAt, step.completedAt)}`}
                      </span>
                    </div>
                    {(step.response?.generalComment || step.response?.rejectionDetails) && (
                      <p className="text-[11px] text-neutral-500 mt-1 ml-7 line-clamp-2">
                        {step.response.rejectionDetails?.reason || step.response.generalComment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending steps */}
          {pendingSteps.length > 0 && (
            <>
              <h3 className="section-title mt-6 text-neutral-300">À venir</h3>
              {pendingSteps.map(step => (
                <div key={step.id} className="card px-4 py-3 opacity-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 font-normal">
                      {step.order}
                    </div>
                    <span className="text-sm text-neutral-500">{step.participant.name} — {getRoleLabel(step.role)}</span>
                    {step.status === 'sent' && <span className="badge-info">Envoyé</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Annotations */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Annotations ({allAnnotations.length})</h2>
            {allAnnotations.length > 0 && (
              <button onClick={() => setShowAnnotations(!showAnnotations)} className="btn-ghost btn-sm">
                {showAnnotations ? <EyeOff size={14} /> : <Eye size={14} />}
                <span className="hidden sm:inline">{showAnnotations ? 'Masquer' : 'Afficher'}</span>
              </button>
            )}
          </div>

          {allAnnotations.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-sm text-neutral-400">Aucune annotation</p>
            </div>
          ) : showAnnotations ? (
            <>
              {/* Legend */}
              <div className="card p-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {workflow?.steps
                    .filter(s => s.response?.annotations && s.response.annotations.length > 0)
                    .map(step => {
                      const color = getParticipantColor(workflow.steps.indexOf(step));
                      const isActive = !filterParticipant || filterParticipant === step.id;
                      return (
                        <button
                          key={step.id}
                          onClick={() => setFilterParticipant(filterParticipant === step.id ? null : step.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-normal transition-all ${
                            isActive ? 'opacity-100 ring-1' : 'opacity-40'
                          }`}
                          style={{ backgroundColor: `${color}10`, color, ringColor: `${color}30` }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {step.participant.name.split(' ')[0]}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Annotation list */}
              <div className="space-y-2">
                {allAnnotations
                  .filter(a => {
                    if (!filterParticipant) return true;
                    const step = workflow?.steps.find(s => s.id === filterParticipant);
                    return step?.response?.annotations.some(c => c.id === a.id);
                  })
                  .map(ann => (
                    <div key={ann.id} className="card p-3.5" style={{ borderLeft: `3px solid ${ann.color}` }}>
                      <p className="text-[13px] text-neutral-700 leading-relaxed">{ann.content}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ann.color }} />
                        <span className="text-[11px] text-neutral-400 font-normal">
                          {ann.participantName} — p.{ann.position.page}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : null}
        </div>
      </div>}

      {/* Cancel Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Annuler le circuit" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl ring-1 ring-red-200">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Cette action est irréversible. Le circuit de validation sera définitivement annulé.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCancelModal(false)} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleCancel} className="btn-danger flex-1">Confirmer</button>
          </div>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="Email d'accompagnement" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            {isEmailJSConfigured(settings)
              ? 'Envoyez cet email directement au participant. Le fichier HTML devra être joint séparément.'
              : 'Configurez EmailJS dans les paramètres pour envoyer directement depuis l\'application.'
            }
          </p>
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 max-h-80 overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {doc && workflow && isEmailJSConfigured(settings) && (
              <button
                onClick={async () => {
                  if (!doc || !workflow) return;
                  setSendingEmail(true);
                  try {
                    await sendEmailViaEmailJS(doc, workflow, workflow.currentStepIndex, settings, generatedPackageHtml, generatedHostedUrl);
                    showMsg(`Email envoyé à ${workflow.steps[workflow.currentStepIndex].participant.name}`);
                    setShowEmailModal(false);
                    setGeneratedPackageHtml(''); // Clear after successful send
                    setGeneratedHostedUrl(''); // Clear hosted URL too
                  } catch (err) {
                    showMsg(err instanceof Error ? err.message : 'Erreur lors de l\'envoi', 'error');
                  } finally {
                    setSendingEmail(false);
                  }
                }}
                disabled={sendingEmail}
                className="btn-primary flex-1"
              >
                {sendingEmail
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={15} />
                }
                {sendingEmail ? 'Envoi en cours...' : 'Envoyer par email'}
              </button>
            )}
            <button
              onClick={() => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = emailHtml;
                copyToClipboard(tempDiv.innerText);
                showMsg('Email copié dans le presse-papier');
                setShowEmailModal(false);
              }}
              className="btn-secondary flex-1"
            >
              <Mail size={15} /> Copier le texte
            </button>
            <button onClick={() => setShowEmailModal(false)} className="btn-ghost flex-1">
              Fermer
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
