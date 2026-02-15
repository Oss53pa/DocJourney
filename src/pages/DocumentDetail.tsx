import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Send, Upload, FileText, Clock, CheckCircle2,
  XCircle, AlertCircle, Eye, EyeOff, MessageSquare, Ban, Mail, Cloud,
} from 'lucide-react';
import { db } from '../db';
import type { DocJourneyDocument, Workflow, Annotation } from '../types';
import {
  formatDate, formatRelativeTime, formatDuration, getRoleLabel, getRoleAction,
  getDecisionLabel, getParticipantColor, formatFileSize, generateId,
} from '../utils';
import JourneyTracker from '../components/journey/JourneyTracker';
import { DocumentStatusBadge } from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { generatePackage, downloadFile, parseReturnFile } from '../services/packageService';
import { processReturn, cancelWorkflow } from '../services/workflowService';
import { autoAdvanceToNextStep } from '../services/autoAdvanceService';
import { generateValidationReport, downloadReport, getReport } from '../services/reportService';
import { generateEmailTemplate } from '../services/emailService';
import { uploadPackageToStorage, isSyncConfigured, getFirebaseConfig } from '../services/firebaseSyncService';
import { generateMailtoLink } from '../services/reminderService';
import { useSettings } from '../hooks/useSettings';
import { useWorkflowTemplates } from '../hooks/useWorkflowTemplates';
import CloudExportModal from '../components/cloud/CloudExportModal';
import BlockageAlert from '../components/blockage/BlockageAlert';
import { detectBlockedWorkflows } from '../services/blockageService';
import { useFirebaseSyncContext } from '../components/layout/AppLayout';
import { useDocumentRetention } from '../hooks/useRetention';
import { protectDocument, unprotectDocument, restoreFromCloud } from '../services/retentionService';
import RetentionBadge from '../components/retention/RetentionBadge';
import DeletionWarningBanner from '../components/retention/DeletionWarningBanner';
import ProtectDocumentButton from '../components/retention/ProtectDocumentButton';
import ExtendRetentionModal from '../components/retention/ExtendRetentionModal';
import type { BlockedWorkflowInfo } from '../types';
import CompletedDocumentView from '../components/document-detail/CompletedDocumentView';
import WorkflowSetupSection from '../components/document-detail/WorkflowSetupSection';
import EmailPreviewModal from '../components/document-detail/EmailPreviewModal';

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
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [blockageInfo, setBlockageInfo] = useState<BlockedWorkflowInfo | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const returnFileRef = useRef<HTMLInputElement>(null);
  const firebaseSync = useFirebaseSyncContext();
  const lastProcessedCountRef = useRef(firebaseSync?.processedCount ?? 0);

  const { retention, refresh: refreshRetention } = useDocumentRetention(id);
  const { templates } = useWorkflowTemplates();

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const document = await db.documents.get(id);
    setDoc(document || null);
    if (document?.workflowId) {
      const wf = await db.workflows.get(document.workflowId);
      setWorkflow(wf || null);
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

  useEffect(() => {
    if (firebaseSync?.processedCount && firebaseSync.processedCount > lastProcessedCountRef.current) {
      loadData();
    }
    lastProcessedCountRef.current = firebaseSync?.processedCount ?? 0;
  }, [firebaseSync?.processedCount, loadData]);

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

      setGeneratedPackageHtml(html);

      const syncEnabled = isSyncConfigured(settings);
      const firebaseConfig = getFirebaseConfig(settings);
      let hostedUrl: string | undefined;

      if (syncEnabled && firebaseConfig) {
        try {
          const packageId = generateId();
          const uploadResult = await uploadPackageToStorage(html, packageId, step.participant.name, doc.name, firebaseConfig);
          if (uploadResult.success && uploadResult.url) {
            hostedUrl = uploadResult.url;
            setGeneratedHostedUrl(uploadResult.url);
            const existing = workflow.storagePackageIds ?? [];
            await db.workflows.update(workflow.id, { storagePackageIds: [...existing, packageId] });
          }
        } catch {
          setGeneratedHostedUrl('');
        }
      } else {
        setGeneratedHostedUrl('');
      }

      const email = generateEmailTemplate(doc, workflow, workflow.currentStepIndex, syncEnabled, hostedUrl);
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
      if (result.success && returnData.decision !== 'rejected' && returnData.decision !== 'modification_requested') {
        await autoAdvanceToNextStep(workflow.id);
      }
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

  // Delegate to enhanced view for completed/rejected documents
  if ((isCompleted || isRejected) && workflow) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => navigate('/')} className="btn-ghost btn-sm -ml-2">
          <ArrowLeft size={14} /> Tableau de bord
        </button>
        <CompletedDocumentView
          doc={doc}
          workflow={workflow}
          retention={retention}
          onRefreshData={loadData}
          onRefreshRetention={refreshRetention}
          settings={settings}
        />
      </div>
    );
  }

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
            <RetentionBadge retention={retention} />
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

      {/* Retention Warning Banner */}
      {retention && !retention.isProtected && (retention.notificationSent || retention.deletedAt) && (
        <DeletionWarningBanner
          retention={retention}
          onProtect={async () => {
            await protectDocument(doc.id);
            await refreshRetention();
            showMsg('Document protégé contre la suppression');
          }}
          onExtend={() => setShowExtendModal(true)}
          onRestore={retention.cloudBackupStatus === 'completed' ? async () => {
            const success = await restoreFromCloud(doc.id);
            if (success) {
              showMsg('Document restauré depuis le cloud');
              await loadData();
              await refreshRetention();
            } else {
              showMsg('Erreur lors de la restauration', 'error');
            }
          } : undefined}
        />
      )}

      {/* Workflow Setup — shown when document is draft with no workflow */}
      {doc.status === 'draft' && !workflow && (
        <WorkflowSetupSection
          doc={doc}
          templates={templates}
          settings={settings}
          onCreated={loadData}
          onMessage={showMsg}
        />
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
          <button onClick={() => setShowCloudModal(true)} className="btn-secondary">
            <Cloud size={15} />
            <span className="hidden sm:inline">Cloud</span>
          </button>
          {retention && (
            <ProtectDocumentButton
              documentId={doc.id}
              isProtected={retention.isProtected}
              onToggle={async () => {
                if (retention.isProtected) {
                  await unprotectDocument(doc.id);
                } else {
                  await protectDocument(doc.id);
                }
                await refreshRetention();
              }}
            />
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
      {doc && workflow && (
        <EmailPreviewModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          doc={doc}
          workflow={workflow}
          emailHtml={emailHtml}
          generatedPackageHtml={generatedPackageHtml}
          generatedHostedUrl={generatedHostedUrl}
          settings={settings}
          onMessage={showMsg}
          onSent={() => {
            setGeneratedPackageHtml('');
            setGeneratedHostedUrl('');
          }}
        />
      )}

      {/* Cloud Export Modal */}
      {doc && (
        <CloudExportModal
          isOpen={showCloudModal}
          onClose={() => setShowCloudModal(false)}
          document={doc}
        />
      )}

      {/* Extend Retention Modal */}
      {retention && (
        <ExtendRetentionModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          documentId={doc.id}
          currentEndDate={retention.scheduledDeletionAt}
          onExtended={async () => {
            await refreshRetention();
            showMsg('Rétention prolongée');
          }}
        />
      )}
    </div>
  );
}
