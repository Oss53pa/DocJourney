import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Clock, AlertCircle, CheckCircle2, XCircle,
  Upload, FileText, ArrowRight, Inbox, ChevronRight, AlertTriangle, Mail, FileEdit,
  FolderKanban, Trash2, Cloud, CloudOff, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db } from '../db';
import type { DocJourneyDocument, Workflow, ActivityEntry, ActivityType } from '../types';
import { formatRelativeTime, formatRelativeTimeShort, getRoleAction, formatFileSize } from '../utils';
import { DocumentStatusBadge } from '../components/common/StatusBadge';
import { JourneyTrackerMini } from '../components/journey/JourneyTracker';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { deleteDocument } from '../services/documentService';
import { parseReturnFile } from '../services/packageService';
import { processReturn } from '../services/workflowService';
import { useUpcomingDeadlines } from '../hooks/useReminders';
import { generateMailtoLink } from '../services/reminderService';
import { useSettings } from '../hooks/useSettings';
import BlockedWorkflowsList from '../components/blockage/BlockedWorkflowsList';
import { useFirebaseSync } from '../hooks/useFirebaseSync';

interface DocWithWorkflow {
  doc: DocJourneyDocument;
  workflow: Workflow | null;
}

type DashboardTab = 'in_progress' | 'drafts' | 'completed' | 'rejected';

const activityLabels: Partial<Record<ActivityType, string>> = {
  document_imported: 'Document importé',
  workflow_created: 'Circuit créé',
  workflow_started: 'Circuit démarré',
  package_generated: 'Paquet généré',
  return_imported: 'Retour importé',
  step_completed: 'Étape terminée',
  workflow_completed: 'Circuit terminé',
  workflow_rejected: 'Circuit rejeté',
  report_generated: 'Rapport généré',
  document_archived: 'Document archivé',
  template_created: 'Modèle créé',
  template_used: 'Modèle utilisé',
  template_deleted: 'Modèle supprimé',
  reminder_sent: 'Relance envoyée',
  group_created: 'Groupe créé',
  group_updated: 'Groupe mis à jour',
  group_deleted: 'Groupe supprimé',
  cloud_exported: 'Export cloud',
  cloud_connected: 'Cloud connecté',
  cloud_disconnected: 'Cloud déconnecté',
  step_skipped: 'Étape ignorée',
  step_reassigned: 'Étape réassignée',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { deadlines } = useUpcomingDeadlines(14);
  const firebaseSync = useFirebaseSync();
  const [drafts, setDrafts] = useState<DocWithWorkflow[]>([]);
  const [inProgress, setInProgress] = useState<DocWithWorkflow[]>([]);
  const [completed, setCompleted] = useState<DocWithWorkflow[]>([]);
  const [rejected, setRejected] = useState<DocWithWorkflow[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [importMessage, setImportMessage] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('in_progress');
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const returnFileRef = useRef<HTMLInputElement>(null);
  const lastProcessedCountRef = useRef(firebaseSync.processedCount);

  const loadData = useCallback(async () => {
    setLoading(true);
    const docs = await db.documents.orderBy('updatedAt').reverse().toArray();
    const workflows = await db.workflows.toArray();
    const wfMap = new Map(workflows.map(w => [w.documentId, w]));

    const withWf: DocWithWorkflow[] = docs.map(doc => ({
      doc,
      workflow: wfMap.get(doc.id) || null,
    }));

    const lower = search.toLowerCase();
    const filtered = search
      ? withWf.filter(d => d.doc.name.toLowerCase().includes(lower))
      : withWf;

    setDrafts(filtered.filter(d => d.doc.status === 'draft'));
    setInProgress(filtered.filter(d => d.doc.status === 'in_progress'));
    setCompleted(filtered.filter(d => d.doc.status === 'completed'));
    setRejected(filtered.filter(d => d.doc.status === 'rejected'));

    const activity = await db.activityLog.orderBy('timestamp').reverse().limit(5).toArray();
    // Filter out corrupted entries where description is not a string
    const validActivity = activity.filter(a => typeof a.description === 'string');
    setRecentActivity(validActivity);

    // Clean up corrupted entries in background
    const corruptedIds = activity.filter(a => typeof a.description !== 'string').map(a => a.id);
    if (corruptedIds.length > 0) {
      console.warn('Cleaning up corrupted activity entries:', corruptedIds);
      await Promise.all(corruptedIds.map(id => db.activityLog.delete(id)));
    }

    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  // Show notification when a new return is processed via Firebase sync
  useEffect(() => {
    if (firebaseSync.processedCount > lastProcessedCountRef.current) {
      setSyncNotification('Nouveau retour reçu automatiquement !');
      loadData(); // Refresh the data
      setTimeout(() => setSyncNotification(null), 4000);
    }
    lastProcessedCountRef.current = firebaseSync.processedCount;
  }, [firebaseSync.processedCount, loadData]);

  const handleReturnImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const returnData = parseReturnFile(text);
    if (!returnData) {
      setImportMessage('Fichier de retour invalide.');
      setImportSuccess(false);
    } else {
      const result = await processReturn(returnData.workflowId, returnData);
      setImportMessage(result.message);
      setImportSuccess(result.success);
      await loadData();
    }
    if (returnFileRef.current) returnFileRef.current.value = '';
    setTimeout(() => setImportMessage(''), 4000);
  };

  const handleDeleteDoc = async () => {
    if (!deleteId) return;
    await deleteDocument(deleteId);
    setDeleteId(null);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = settings.ownerName
    ? settings.ownerName.split(' ')[0]
    : '';

  const now = new Date();
  const formattedDate = format(now, "EEEE d MMMM yyyy", { locale: fr });

  const completedThisMonth = completed.filter(({ workflow }) => {
    if (!workflow?.completedAt) return false;
    const d = new Date(workflow.completedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const rejectedThisMonth = rejected.filter(({ workflow }) => {
    if (!workflow?.completedAt) return false;
    const d = new Date(workflow.completedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const hasAlerts = deadlines.length > 0;

  const tabDefs: { id: DashboardTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'in_progress', label: 'En cours',    icon: <Clock size={15} />,        count: inProgress.length },
    { id: 'drafts',      label: 'Brouillons',  icon: <FileEdit size={15} />,     count: drafts.length },
    { id: 'completed',   label: 'Terminés',    icon: <CheckCircle2 size={15} />, count: completed.length },
    { id: 'rejected',    label: 'Rejetés',     icon: <XCircle size={15} />,      count: rejected.length },
  ];

  const activeDocuments = activeTab === 'in_progress' ? inProgress
    : activeTab === 'drafts' ? drafts
    : activeTab === 'completed' ? completed
    : rejected;

  // Show welcome hero when no documents exist
  const showWelcomeHero = drafts.length === 0 && inProgress.length === 0 && completed.length === 0 && rejected.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Hero - shown when no documents */}
      {showWelcomeHero ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-8 sm:p-12 text-white">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <h1 className="font-brand text-4xl sm:text-5xl mb-4">DocJourney</h1>
            <p className="text-xl sm:text-2xl text-neutral-300 mb-2">
              Le voyage du document à travers son circuit de validation
            </p>
            <p className="text-neutral-400 mb-8 max-w-lg">
              Simplifiez vos processus de validation documentaire. Créez des circuits personnalisés,
              suivez l'avancement en temps réel et collectez les signatures électroniques.
            </p>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/new')} className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3 rounded-xl font-medium hover:bg-neutral-100 transition-colors">
                <Plus size={18} />
                Créer mon premier document
              </button>
              <label className="inline-flex items-center gap-2 bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors cursor-pointer">
                <Upload size={18} />
                Importer un retour
                <input ref={returnFileRef} type="file" accept=".docjourney" className="hidden" onChange={handleReturnImport} />
              </label>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-6 mt-10 pt-8 border-t border-white/10">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                  <FileText size={20} />
                </div>
                <h3 className="font-medium mb-1">Circuits personnalisés</h3>
                <p className="text-sm text-neutral-400">Définissez les étapes et les participants de validation</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                  <Cloud size={20} />
                </div>
                <h3 className="font-medium mb-1">Synchronisation auto</h3>
                <p className="text-sm text-neutral-400">Les retours arrivent automatiquement dans votre app</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="font-medium mb-1">Signatures électroniques</h3>
                <p className="text-sm text-neutral-400">Collectez les signatures directement dans le navigateur</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Regular greeting header */
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 tracking-tight">
              Bonjour{firstName ? ` ${firstName}` : ''} {'\u{1F44B}'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1 capitalize">
              {formattedDate}
            </p>
          </div>
          <div className="flex gap-2">
            <label className="btn-secondary cursor-pointer">
              <Upload size={15} />
              <span className="hidden sm:inline">Importer retour</span>
              <span className="sm:hidden">Retour</span>
              <input ref={returnFileRef} type="file" accept=".docjourney" className="hidden" onChange={handleReturnImport} />
            </label>
            <button onClick={() => navigate('/new')} className="btn-primary">
              <Plus size={15} />
              <span className="hidden sm:inline">Nouveau document</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        </div>
      )}

      {/* Sync notification */}
      {syncNotification && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down bg-sky-50 text-sky-700 ring-1 ring-sky-200">
          <Cloud size={16} />
          {syncNotification}
        </div>
      )}

      {/* Import message */}
      {importMessage && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down ${
          importSuccess
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-red-50 text-red-700 ring-1 ring-red-200'
        }`}>
          {importSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {importMessage}
        </div>
      )}

      {/* Stats cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className="bg-white border rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-shadow hover:shadow-md hover:border-neutral-300"
          onClick={() => setActiveTab('drafts')}
        >
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <FileEdit size={18} className="text-neutral-500" />
          </div>
          <div>
            <p className="text-2xl font-medium text-neutral-900">{drafts.length}</p>
            <p className="text-xs text-neutral-500">Brouillons</p>
          </div>
        </div>
        <div
          className="bg-white border rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-shadow hover:shadow-md hover:border-neutral-300"
          onClick={() => setActiveTab('in_progress')}
        >
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-medium text-neutral-900">{inProgress.length}</p>
            <p className="text-xs text-neutral-500">En cours</p>
          </div>
        </div>
        <div
          className="bg-white border rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-shadow hover:shadow-md hover:border-neutral-300"
          onClick={() => setActiveTab('completed')}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-medium text-neutral-900">{completedThisMonth}</p>
            <p className="text-xs text-neutral-500">Terminés ce mois</p>
          </div>
        </div>
        <div
          className="bg-white border rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-shadow hover:shadow-md hover:border-neutral-300"
          onClick={() => setActiveTab('rejected')}
        >
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-medium text-neutral-900">{rejectedThisMonth}</p>
            <p className="text-xs text-neutral-500">Rejetés ce mois</p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column: tabs + search + documents */}
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
            {tabDefs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-normal transition-all flex-1 justify-center
                  ${activeTab === tab.id
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                  }
                `}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`
                  text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                  ${activeTab === tab.id
                    ? 'bg-neutral-100 text-neutral-700'
                    : 'bg-neutral-200/60 text-neutral-400'
                  }
                `}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>

          {/* Tab content */}
          <div key={activeTab} className="animate-fade-in">
            {/* In Progress tab */}
            {activeTab === 'in_progress' && (
              activeDocuments.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={Inbox}
                    title="Aucun document en cours"
                    description="Importez un document pour démarrer un circuit de validation."
                    action={
                      <button onClick={() => navigate('/new')} className="btn-primary btn-sm">
                        <Plus size={14} /> Nouveau document
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeDocuments.map(({ doc, workflow }) => (
                    <div
                      key={doc.id}
                      className="card-interactive p-4 sm:p-5"
                      onClick={() => navigate(`/document/${doc.id}`)}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={20} className="text-neutral-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-medium text-neutral-900 text-sm sm:text-[15px] truncate">
                                {doc.name}
                              </h3>
                              {workflow && (
                                <p className="text-xs text-neutral-400 mt-0.5 font-normal">
                                  Etape {workflow.currentStepIndex + 1}/{workflow.steps.length}
                                </p>
                              )}
                            </div>
                            <DocumentStatusBadge status={doc.status} />
                          </div>
                          {workflow && (
                            <div className="mt-3">
                              <JourneyTrackerMini workflow={workflow} />
                            </div>
                          )}
                          {workflow && (
                            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                <AlertCircle size={12} className="flex-shrink-0" />
                                <span className="truncate">
                                  <span className="font-normal text-neutral-700">
                                    {workflow.steps[workflow.currentStepIndex]?.participant.name}
                                  </span>
                                  {' '}({getRoleAction(workflow.steps[workflow.currentStepIndex]?.role)})
                                </span>
                              </div>
                              {workflow.steps[workflow.currentStepIndex]?.sentAt && (
                                <span className="text-[11px] text-neutral-400 font-normal">
                                  Envoyé {formatRelativeTime(workflow.steps[workflow.currentStepIndex].sentAt!)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-neutral-300 flex-shrink-0 mt-3 hidden sm:block" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Drafts tab */}
            {activeTab === 'drafts' && (
              activeDocuments.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={FileEdit}
                    title="Aucun brouillon"
                    description="Les documents importés sans circuit apparaîtront ici."
                    action={
                      <button onClick={() => navigate('/new')} className="btn-primary btn-sm">
                        <Plus size={14} /> Nouveau document
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeDocuments.map(({ doc }) => (
                    <div key={doc.id} className="card p-4 space-y-3">
                      <div className="flex items-start gap-3 cursor-pointer" onClick={() => navigate(`/document/${doc.id}`)}>
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-neutral-900 text-sm truncate">{doc.name}</h3>
                          <p className="text-[11px] text-neutral-400 font-normal mt-0.5">
                            {formatFileSize(doc.size)} {doc.metadata.pageCount ? `• ${doc.metadata.pageCount} pages` : ''} • {formatRelativeTime(doc.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
                        <button onClick={() => navigate(`/document/${doc.id}`)} className="btn-ghost btn-sm text-xs flex-shrink-0">
                          <ArrowRight size={12} /> Configurer le circuit
                        </button>
                        <button onClick={() => navigate(`/document/${doc.id}`)} className="btn-ghost btn-sm text-xs flex-shrink-0">
                          <FolderKanban size={12} /> Grouper
                        </button>
                        <button onClick={() => setDeleteId(doc.id)} className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500 ml-auto w-7 h-7">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Completed tab */}
            {activeTab === 'completed' && (
              activeDocuments.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={CheckCircle2}
                    title="Aucun document terminé"
                    description="Les circuits de validation terminés apparaîtront ici."
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  {activeDocuments.map(({ doc, workflow }) => (
                    <div
                      key={doc.id}
                      className="card-interactive px-4 py-3 flex items-center gap-3"
                      onClick={() => navigate(`/document/${doc.id}`)}
                    >
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-sm font-normal text-neutral-800 truncate flex-1">{doc.name}</span>
                      <span className="text-[11px] text-neutral-400 font-normal flex-shrink-0 hidden sm:block">
                        {workflow?.completedAt ? formatRelativeTime(workflow.completedAt) : ''}
                      </span>
                      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
                    </div>
                  ))}
                  <button onClick={() => navigate('/archives')} className="btn-ghost btn-sm self-start mt-1">
                    Voir toutes les archives <ArrowRight size={14} />
                  </button>
                </div>
              )
            )}

            {/* Rejected tab */}
            {activeTab === 'rejected' && (
              activeDocuments.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={XCircle}
                    title="Aucun document rejeté"
                    description="Les circuits rejetés apparaîtront ici."
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  {activeDocuments.map(({ doc, workflow }) => (
                    <div
                      key={doc.id}
                      className="card-interactive px-4 py-3 flex items-center gap-3"
                      onClick={() => navigate(`/document/${doc.id}`)}
                    >
                      <XCircle size={16} className="text-red-400 flex-shrink-0" />
                      <span className="text-sm font-normal text-neutral-800 truncate flex-1">{doc.name}</span>
                      <span className="text-[11px] text-neutral-400 font-normal flex-shrink-0 hidden sm:block">
                        {workflow?.completedAt ? formatRelativeTime(workflow.completedAt) : ''}
                      </span>
                      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right column: sync status + alerts + blocked workflows + activity */}
        <div className="space-y-4">
          {/* Sync Status (only shown if enabled) */}
          {firebaseSync.isEnabled && (
            <section className="card p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  firebaseSync.status === 'connected' ? 'bg-emerald-100' :
                  firebaseSync.status === 'connecting' ? 'bg-sky-100' :
                  firebaseSync.status === 'error' ? 'bg-red-100' : 'bg-neutral-100'
                }`}>
                  {firebaseSync.status === 'connecting' ? (
                    <Loader2 size={14} className="text-sky-600 animate-spin" />
                  ) : firebaseSync.status === 'connected' ? (
                    <Cloud size={14} className="text-emerald-600" />
                  ) : firebaseSync.status === 'error' ? (
                    <CloudOff size={14} className="text-red-600" />
                  ) : (
                    <CloudOff size={14} className="text-neutral-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className={`section-title ${
                    firebaseSync.status === 'connected' ? 'text-emerald-600' :
                    firebaseSync.status === 'connecting' ? 'text-sky-600' :
                    firebaseSync.status === 'error' ? 'text-red-600' : 'text-neutral-500'
                  }`}>
                    Sync {firebaseSync.status === 'connected' ? 'Actif' :
                          firebaseSync.status === 'connecting' ? 'Connexion...' :
                          firebaseSync.status === 'error' ? 'Erreur' : 'Inactif'}
                  </h2>
                </div>
                {firebaseSync.processedCount > 0 && (
                  <span className="text-[11px] text-neutral-400">
                    {firebaseSync.processedCount} retour(s) reçu(s)
                  </span>
                )}
              </div>
              {firebaseSync.status === 'connected' && (
                <p className="text-xs text-neutral-500">
                  Les retours des participants sont reçus automatiquement.
                </p>
              )}
              {firebaseSync.status === 'error' && firebaseSync.lastError && (
                <p className="text-xs text-red-600">
                  {firebaseSync.lastError}
                </p>
              )}
              {firebaseSync.status === 'disconnected' && (
                <button
                  onClick={() => firebaseSync.connect()}
                  className="btn-ghost btn-sm text-xs mt-1"
                >
                  <Cloud size={12} /> Se connecter
                </button>
              )}
            </section>
          )}

          {/* Alerts */}
          <section className="card p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={14} className="text-amber-600" />
              </div>
              <h2 className="section-title text-amber-600">Alertes</h2>
            </div>

            {hasAlerts ? (
              <div className="grid gap-2">
                {deadlines.map(({ workflow, daysRemaining, documentName }) => {
                  const currentStep = workflow.steps[workflow.currentStepIndex];
                  return (
                    <div
                      key={workflow.id}
                      className="bg-neutral-50 rounded-xl px-3 py-2.5 flex items-center gap-3"
                    >
                      <AlertTriangle size={16} className={`flex-shrink-0 ${daysRemaining <= 0 ? 'text-red-500' : daysRemaining <= 3 ? 'text-amber-500' : 'text-amber-400'}`} />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/document/${workflow.documentId}`)}>
                        <p className="text-sm font-normal text-neutral-800 truncate">{documentName}</p>
                        <p className="text-[11px] text-neutral-400 font-normal truncate">
                          {daysRemaining <= 0
                            ? 'Échéance dépassée'
                            : daysRemaining === 1
                              ? 'Échéance demain'
                              : `${daysRemaining}j restants`
                          }
                          {currentStep && ` — ${currentStep.participant.name}`}
                        </p>
                      </div>
                      {currentStep && settings.ownerName && (
                        <a
                          href={generateMailtoLink(
                            currentStep.participant.email,
                            currentStep.participant.name,
                            documentName,
                            settings.ownerName
                          )}
                          className="btn-ghost btn-sm text-amber-600 hover:bg-amber-50 flex-shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <Mail size={14} /> <span className="hidden sm:inline">Relancer</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-neutral-50 rounded-xl px-4 py-6 flex flex-col items-center justify-center text-center">
                <AlertTriangle size={24} className="text-neutral-300 mb-2" />
                <p className="text-sm text-neutral-400">Aucune alerte pour le moment</p>
              </div>
            )}
          </section>

          {/* Blocked Workflows */}
          <BlockedWorkflowsList />

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <section className="card p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Clock size={14} className="text-neutral-500" />
                </div>
                <h2 className="section-title text-neutral-500">Activité récente</h2>
              </div>
              <div className="grid gap-2">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-neutral-50 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-normal text-neutral-800 truncate flex-1 min-w-0">
                        {activityLabels[activity.type] || activity.type}
                      </p>
                      <span className="text-[11px] text-neutral-400 font-normal flex-shrink-0 whitespace-nowrap">
                        {formatRelativeTimeShort(activity.timestamp)}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-[11px] text-neutral-400 font-normal truncate mt-0.5">
                        {activity.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-neutral-600">Cette action supprimera définitivement le document et son workflow.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleDeleteDoc} className="btn-danger flex-1">Supprimer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
