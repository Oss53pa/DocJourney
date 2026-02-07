import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  GitBranch,
  FileCheck,
  Activity,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import {
  getStorageQuota,
  getStorageBreakdown,
  getLargestDocuments,
  getCleanableDocuments,
  cleanupActivityLogs,
  cleanupOrphanedReports,
  requestPersistentStorage,
  isStoragePersistent,
  formatBytes,
  type StorageQuotaInfo,
  type StorageBreakdown,
} from '../../services/storageQuotaService';
import { deleteDocument } from '../../services/documentService';

export default function StorageManagementSection() {
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [largestDocs, setLargestDocs] = useState<Awaited<ReturnType<typeof getLargestDocuments>>>([]);
  const [cleanableDocs, setCleanableDocs] = useState<Awaited<ReturnType<typeof getCleanableDocuments>>>([]);
  const [isPersistent, setIsPersistent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCleanable, setShowCleanable] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const loadData = async () => {
    try {
      const [q, b, ld, cd, p] = await Promise.all([
        getStorageQuota(),
        getStorageBreakdown(),
        getLargestDocuments(5),
        getCleanableDocuments(),
        isStoragePersistent(),
      ]);
      setQuota(q);
      setBreakdown(b);
      setLargestDocs(ld);
      setCleanableDocs(cd);
      setIsPersistent(p);
    } catch (error) {
      console.error('Error loading storage data:', error);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRequestPersistent = async () => {
    const result = await requestPersistentStorage();
    setIsPersistent(result);
    if (result) {
      setCleanupMessage({ type: 'success', text: 'Stockage persistant activé !' });
    } else {
      setCleanupMessage({ type: 'error', text: 'Impossible d\'activer le stockage persistant' });
    }
    setTimeout(() => setCleanupMessage(null), 3000);
  };

  const handleCleanupLogs = async () => {
    setCleaning(true);
    try {
      const count = await cleanupActivityLogs(90);
      const orphans = await cleanupOrphanedReports();
      await loadData();
      setCleanupMessage({
        type: 'success',
        text: `${count} log(s) et ${orphans} rapport(s) orphelin(s) supprimés`,
      });
    } catch (error) {
      setCleanupMessage({ type: 'error', text: 'Erreur lors du nettoyage' });
    }
    setCleaning(false);
    setTimeout(() => setCleanupMessage(null), 3000);
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement "${name}" ?`)) return;

    setCleaning(true);
    try {
      await deleteDocument(id);
      await loadData();
      setCleanupMessage({ type: 'success', text: `"${name}" supprimé` });
    } catch (error) {
      setCleanupMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
    setCleaning(false);
    setTimeout(() => setCleanupMessage(null), 3000);
  };

  const handleCleanAllSuggested = async () => {
    if (!confirm(`Supprimer ${cleanableDocs.length} document(s) suggéré(s) ?`)) return;

    setCleaning(true);
    try {
      for (const doc of cleanableDocs) {
        await deleteDocument(doc.id);
      }
      await loadData();
      setCleanupMessage({
        type: 'success',
        text: `${cleanableDocs.length} document(s) supprimé(s)`,
      });
    } catch (error) {
      setCleanupMessage({ type: 'error', text: 'Erreur lors du nettoyage' });
    }
    setCleaning(false);
    setTimeout(() => setCleanupMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-neutral-400" size={24} />
        </div>
      </div>
    );
  }

  const getUsageColor = () => {
    if (!quota) return 'bg-neutral-200';
    if (quota.isCritical) return 'bg-red-500';
    if (quota.isLow) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getUsageTextColor = () => {
    if (!quota) return 'text-neutral-600';
    if (quota.isCritical) return 'text-red-600';
    if (quota.isLow) return 'text-amber-600';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <HardDrive size={16} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-900">Espace de stockage</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Utilisation de IndexedDB</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <RefreshCw size={16} className={`text-neutral-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Quota Bar */}
        {quota && (
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <span className={`text-2xl font-normal ${getUsageTextColor()}`}>
                  {quota.formattedUsed}
                </span>
                <span className="text-sm text-neutral-400 ml-1">
                  / {quota.formattedQuota}
                </span>
              </div>
              <span className={`text-sm font-normal ${getUsageTextColor()}`}>
                {quota.usagePercent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor()} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(quota.usagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500">
              {quota.formattedRemaining} disponible
            </p>
          </div>
        )}

        {/* Alerts */}
        {quota?.isCritical && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Stockage critique</p>
              <p className="text-xs text-red-700 mt-0.5">
                Supprimez des documents pour éviter les erreurs de sauvegarde.
              </p>
            </div>
          </div>
        )}

        {quota?.isLow && !quota.isCritical && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Stockage limité</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Pensez à nettoyer les anciens documents.
              </p>
            </div>
          </div>
        )}

        {/* Persistent Storage */}
        {!isPersistent && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Shield size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Protection des données</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Activez le stockage persistant pour empêcher le navigateur de supprimer vos données.
                  </p>
                </div>
              </div>
              <button onClick={handleRequestPersistent} className="btn-secondary btn-sm whitespace-nowrap">
                Activer
              </button>
            </div>
          </div>
        )}

        {isPersistent && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 size={16} />
            <span>Stockage persistant activé</span>
          </div>
        )}

        {/* Breakdown Toggle */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
        >
          {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Détail par catégorie
        </button>

        {/* Breakdown */}
        {showBreakdown && breakdown && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
            {[
              { label: 'Documents', value: breakdown.documents, icon: FileText, color: 'text-blue-600 bg-blue-50' },
              { label: 'Workflows', value: breakdown.workflows, icon: GitBranch, color: 'text-purple-600 bg-purple-50' },
              { label: 'Rapports', value: breakdown.validationReports, icon: FileCheck, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Activités', value: breakdown.activityLog, icon: Activity, color: 'text-amber-600 bg-amber-50' },
              { label: 'Participants', value: breakdown.participants, icon: Users, color: 'text-pink-600 bg-pink-50' },
              { label: 'Autre', value: breakdown.other, icon: HardDrive, color: 'text-neutral-600 bg-neutral-100' },
            ].map(item => (
              <div key={item.label} className="bg-neutral-50 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 truncate">{item.label}</p>
                  <p className="text-sm font-normal text-neutral-900">{formatBytes(item.value)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cleanup Message */}
      {cleanupMessage && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down ${
          cleanupMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-red-50 text-red-700 ring-1 ring-red-200'
        }`}>
          {cleanupMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {cleanupMessage.text}
        </div>
      )}

      {/* Largest Documents */}
      {largestDocs.length > 0 && (
        <div className="card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-900">Documents les plus volumineux</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Top 5 par taille</p>
            </div>
          </div>

          <div className="space-y-2">
            {largestDocs.map((doc, index) => (
              <div
                key={doc.id}
                className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-neutral-400 w-4">{index + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-700 truncate">{doc.name}</p>
                    <p className="text-xs text-neutral-400">{doc.status}</p>
                  </div>
                </div>
                <span className="text-sm font-normal text-neutral-600 flex-shrink-0">
                  {doc.formattedSize}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cleanable Documents */}
      {cleanableDocs.length > 0 && (
        <div className="card p-5 sm:p-6 space-y-4 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-neutral-900">Nettoyage suggéré</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {cleanableDocs.length} document(s) - {formatBytes(cleanableDocs.reduce((s, d) => s + d.size, 0))}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCleanable(!showCleanable)}
              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              {showCleanable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showCleanable && (
            <div className="space-y-2 animate-fade-in">
              {cleanableDocs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-2 px-3 bg-amber-50/50 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-700 truncate">{doc.name}</p>
                    <p className="text-xs text-amber-600">{doc.reason}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-neutral-500">{doc.formattedSize}</span>
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.name)}
                      disabled={cleaning}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCleanAllSuggested}
              disabled={cleaning}
              className="btn-danger btn-sm"
            >
              {cleaning ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Tout supprimer
            </button>
          </div>
        </div>
      )}

      {/* System Cleanup */}
      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={16} className="text-neutral-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Maintenance système</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Nettoyage des données obsolètes</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCleanupLogs}
            disabled={cleaning}
            className="btn-secondary btn-sm"
          >
            {cleaning ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
            Nettoyer les logs (+90j)
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          Supprime les journaux d'activité de plus de 90 jours et les rapports orphelins.
        </p>
      </div>
    </div>
  );
}
