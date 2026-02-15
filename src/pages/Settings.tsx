import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Trash2, AlertCircle, Database, Shield, Layout, Mail, HardDrive, Download, Upload, Lock, FolderOpen, Globe, Loader2 } from 'lucide-react';
import TemplatesSection from '../components/settings/TemplatesSection';
import CloudConnectionsSection from '../components/settings/CloudConnectionsSection';
import WorkflowTemplatesSection from '../components/settings/WorkflowTemplatesSection';
import SecuritySettingsSection from '../components/settings/SecuritySettingsSection';
import RetentionSettingsSection from '../components/retention/RetentionSettingsSection';
import RetentionDashboard from '../components/retention/RetentionDashboard';
import StorageManagementSection from '../components/settings/StorageManagementSection';
import DomainsSection from '../components/settings/DomainsSection';
import RestoreBackupModal from '../components/settings/RestoreBackupModal';
import EmailJSSection from '../components/settings/EmailJSSection';
import FirebaseSyncSection from '../components/settings/FirebaseSyncSection';
import { useSettings } from '../hooks/useSettings';
import { db, initializeDB } from '../db';
import { createBackup, downloadBackup, shouldAutoBackup, performAutoBackup, selectBackupFolder, saveBackupToFolder, clearBackupFolder, isFileSystemAccessSupported } from '../services/backupService';

type TabId = 'services' | 'models' | 'data' | 'security' | 'domains' | 'about';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'services', label: 'Services', icon: <Mail size={15} /> },
  { id: 'models', label: 'Modèles', icon: <Layout size={15} /> },
  { id: 'data', label: 'Données', icon: <Database size={15} /> },
  { id: 'security', label: 'Sécurité', icon: <Lock size={15} /> },
  { id: 'domains', label: 'Domaines', icon: <Globe size={15} /> },
  { id: 'about', label: 'À propos', icon: <Shield size={15} /> },
];

export default function Settings() {
  const { settings, loading, updateSettings } = useSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('services');
  const [stats, setStats] = useState({ docs: 0, workflows: 0, participants: 0, activities: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [lastAutoBackup, setLastAutoBackup] = useState<Date | undefined>();
  const [backupSaved, setBackupSaved] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupFolderName, setBackupFolderName] = useState<string>('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);

  useEffect(() => {
    if (!loading) {
      setAutoBackupEnabled(settings.autoBackupEnabled ?? false);
      setAutoBackupFrequency(settings.autoBackupFrequency ?? 'weekly');
      setLastAutoBackup(settings.lastAutoBackup);
      setBackupFolderName(settings.backupFolderName ?? '');
    }
  }, [settings, loading]);

  useEffect(() => {
    if (!loading && autoBackupEnabled && shouldAutoBackup(lastAutoBackup, autoBackupFrequency)) {
      performAutoBackup().then(() => setLastAutoBackup(new Date()));
    }
  }, [loading, autoBackupEnabled, lastAutoBackup, autoBackupFrequency]);

  useEffect(() => {
    (async () => {
      setStats({
        docs: await db.documents.count(),
        workflows: await db.workflows.count(),
        participants: await db.participants.count(),
        activities: await db.activityLog.count(),
      });
    })();
  }, []);

  const handleSaveBackup = async () => {
    await updateSettings({ autoBackupEnabled, autoBackupFrequency });
    setBackupSaved(true);
    setTimeout(() => setBackupSaved(false), 3000);
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const backup = await createBackup();
      downloadBackup(backup);
      await updateSettings({ lastAutoBackup: new Date() });
      setLastAutoBackup(new Date());
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleClearData = async () => {
    await db.documents.clear();
    await db.workflows.clear();
    await db.validationReports.clear();
    await db.activityLog.clear();
    await db.participants.clear();
    await db.workflowTemplates.clear();
    await db.reminders.clear();
    await db.documentGroups.clear();
    await db.cloudConnections.clear();
    await db.documentRetention.clear();
    await db.authorizedDomains.clear();
    setShowClearConfirm(false);
    setStats({ docs: 0, workflows: 0, participants: 0, activities: 0 });
  };

  const handleResetData = async () => {
    await db.documents.clear();
    await db.workflows.clear();
    await db.validationReports.clear();
    await db.activityLog.clear();
    await db.participants.clear();
    await db.workflowTemplates.clear();
    await db.reminders.clear();
    await db.documentGroups.clear();
    await db.cloudConnections.clear();
    await db.documentRetention.clear();
    await db.authorizedDomains.clear();
    await db.settings.clear();
    await initializeDB();
    setShowResetConfirm(false);
    setStats({ docs: 0, workflows: 0, participants: 0, activities: 0 });
    window.location.reload();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = 'Atokp0879*';
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="card p-6 sm:p-8 max-w-sm w-full">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center mb-4">
              <Lock size={24} className="text-white" />
            </div>
            <h2 className="text-lg font-medium text-neutral-900">Accès protégé</h2>
            <p className="text-sm text-neutral-500 mt-1">Entrez le mot de passe pour accéder aux paramètres</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                className={`input w-full ${passwordError ? 'ring-2 ring-red-300 border-red-300' : ''}`}
                placeholder="Mot de passe"
                autoFocus
              />
              {passwordError && <p className="text-xs text-red-500 mt-1.5">Mot de passe incorrect</p>}
            </div>
            <button type="submit" className="btn-primary w-full"><Lock size={15} /> Accéder aux paramètres</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 tracking-tight">Paramètres</h1>
        <p className="text-sm text-neutral-500 mt-1">Configuration des services et de l'application</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-normal transition-all flex-1 justify-center ${
              activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6 animate-fade-in" key={activeTab}>
        {activeTab === 'services' && (
          <>
            <EmailJSSection />
            <FirebaseSyncSection />
          </>
        )}

        {activeTab === 'models' && (
          <>
            <TemplatesSection />
            <WorkflowTemplatesSection />
          </>
        )}

        {activeTab === 'data' && (
          <>
            <StorageManagementSection />

            {/* Stats */}
            <div className="card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Database size={16} className="text-neutral-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-neutral-900">Base de données locale</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Données stockées dans IndexedDB</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Documents', value: stats.docs },
                  { label: 'Workflows', value: stats.workflows },
                  { label: 'Participants', value: stats.participants },
                  { label: 'Activités', value: stats.activities },
                ].map(s => (
                  <div key={s.label} className="bg-neutral-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-normal text-neutral-900">{s.value}</p>
                    <p className="text-[11px] text-neutral-400 font-normal mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto Backup */}
            <div className="card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <HardDrive size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-neutral-900">Sauvegarde automatique</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Exportez vos données régulièrement</p>
                </div>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={autoBackupEnabled} onChange={e => setAutoBackupEnabled(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                  <span className="text-sm font-normal text-neutral-700">Activer la sauvegarde automatique</span>
                </label>
                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">Fréquence de sauvegarde</label>
                  <select value={autoBackupFrequency} onChange={e => setAutoBackupFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')} className="input" disabled={!autoBackupEnabled}>
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </div>
                {lastAutoBackup && (
                  <p className="text-xs text-neutral-500">
                    Dernière sauvegarde : {new Date(lastAutoBackup).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button onClick={handleSaveBackup} className="btn-primary btn-sm"><Save size={14} /> Enregistrer</button>
                <button onClick={handleManualBackup} disabled={isBackingUp} className="btn-secondary btn-sm">
                  <Download size={14} /> {isBackingUp ? 'Sauvegarde...' : 'Sauvegarder maintenant'}
                </button>
                {backupSaved && <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-normal animate-fade-in"><CheckCircle2 size={16} /> Enregistré</span>}
              </div>
            </div>

            {/* Backup Folder */}
            <div className="card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Download size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-neutral-900">Dossier de sauvegarde</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Choisissez un dossier une fois, les sauvegardes y iront automatiquement</p>
                </div>
              </div>

              {backupMessage && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down ${backupMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                  {backupMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {backupMessage.text}
                </div>
              )}

              {!isFileSystemAccessSupported() ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800">Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome ou Edge.</p>
                </div>
              ) : (
                <>
                  {backupFolderName ? (
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <FolderOpen size={18} className="text-emerald-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-800">Dossier configuré</p>
                          <p className="text-xs text-emerald-600 truncate">{backupFolderName}</p>
                        </div>
                        <button onClick={async () => { await clearBackupFolder(); await updateSettings({ backupFolderName: '' }); setBackupFolderName(''); setBackupMessage({ type: 'success', text: 'Dossier de sauvegarde supprimé' }); }} className="text-xs text-neutral-500 hover:text-red-600">Changer</button>
                      </div>
                      <button onClick={async () => { setBackupMessage(null); const result = await saveBackupToFolder(); if (result.success) { setBackupMessage({ type: 'success', text: `Sauvegarde créée : ${result.filename}` }); setLastAutoBackup(new Date()); } else { setBackupMessage({ type: 'error', text: result.error || 'Erreur' }); } }} className="btn-primary btn-sm w-full"><Download size={14} /> Sauvegarder maintenant</button>
                      <p className="text-[11px] text-emerald-600">Les sauvegardes automatiques iront dans ce dossier. Un sous-dossier <strong>DocJourney-Backups</strong> a été créé.</p>
                    </div>
                  ) : (
                    <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <FolderOpen size={18} className="text-neutral-500" />
                        <div>
                          <p className="text-sm font-medium text-neutral-800">Aucun dossier sélectionné</p>
                          <p className="text-xs text-neutral-400">Choisissez un dossier (local ou OneDrive) pour les sauvegardes automatiques</p>
                        </div>
                      </div>
                      <button onClick={async () => { setIsSelectingFolder(true); setBackupMessage(null); try { const result = await selectBackupFolder(); if (result) { await updateSettings({ backupFolderName: result.name }); setBackupFolderName(result.name); setBackupMessage({ type: 'success', text: `Dossier "${result.name}" configuré !` }); } } finally { setIsSelectingFolder(false); } }} disabled={isSelectingFolder} className="btn-primary btn-sm w-full">
                        {isSelectingFolder ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
                        {isSelectingFolder ? 'Sélection...' : 'Choisir un dossier'}
                      </button>
                      <p className="text-[11px] text-neutral-500"><strong>Astuce :</strong> Sélectionnez votre dossier OneDrive pour une synchronisation cloud automatique.</p>
                    </div>
                  )}
                  <div className="border-t border-neutral-100 pt-4">
                    <button onClick={async () => { const backup = await createBackup(); downloadBackup(backup); setBackupMessage({ type: 'success', text: 'Sauvegarde téléchargée !' }); }} className="btn-secondary btn-sm"><Download size={14} /> Télécharger (manuel)</button>
                  </div>
                </>
              )}
            </div>

            {/* Restore */}
            <div className="card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Upload size={16} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-neutral-900">Restaurer une sauvegarde</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Importez un fichier de sauvegarde DocJourney</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-800 leading-relaxed"><strong>Restauration :</strong> Vous pouvez importer un fichier de sauvegarde pour récupérer vos données. Choisissez de remplacer toutes les données ou de les fusionner avec les données existantes.</p>
              </div>
              <button onClick={() => setShowRestoreModal(true)} className="btn-secondary btn-sm"><Upload size={14} /> Restaurer depuis un fichier</button>
            </div>

            <CloudConnectionsSection />
            <RetentionSettingsSection />
            <RetentionDashboard />

            {/* Danger Zone */}
            <div className="card p-5 sm:p-6 space-y-5 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={16} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-red-700">Zone dangereuse</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Actions irréversibles</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-600">Effacer toutes les données</p>
                <p className="text-xs text-neutral-400">Supprime tous les documents, workflows et données sans recréer les valeurs par défaut.</p>
                {!showClearConfirm ? (
                  <button onClick={() => setShowClearConfirm(true)} className="btn-danger btn-sm"><Trash2 size={14} /> Effacer toutes les données</button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 animate-fade-in">
                    <p className="text-sm text-red-700 font-normal leading-relaxed">Cette action supprimera définitivement tous les documents, workflows et données associées. Cette action est irréversible.</p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button onClick={handleClearData} className="btn-danger btn-sm">Confirmer la suppression</button>
                      <button onClick={() => setShowClearConfirm(false)} className="btn-secondary btn-sm">Annuler</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-red-100" />

              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-600">Réinitialiser les données</p>
                <p className="text-xs text-neutral-400">Supprime tout et recrée les paramètres, modèles et domaines par défaut. L'application redémarrera.</p>
                {!showResetConfirm ? (
                  <button onClick={() => setShowResetConfirm(true)} className="btn-danger btn-sm"><Trash2 size={14} /> Réinitialiser les données</button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 animate-fade-in">
                    <p className="text-sm text-red-700 font-normal leading-relaxed">Cette action supprimera toutes les données et restaurera les paramètres d'usine. L'application sera rechargée.</p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button onClick={handleResetData} className="btn-danger btn-sm">Confirmer la réinitialisation</button>
                      <button onClick={() => setShowResetConfirm(false)} className="btn-secondary btn-sm">Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'security' && <SecuritySettingsSection />}
        {activeTab === 'domains' && <DomainsSection />}

        {activeTab === 'about' && (
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
                <Shield size={16} className="text-white" />
              </div>
              <h2 className="font-brand text-2xl text-neutral-900">DocJourney</h2>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">Le voyage du document à travers son circuit de validation.</p>
            <div className="mt-4 space-y-1.5 text-xs text-neutral-400">
              <p className="font-normal text-neutral-500">Version 1.0.0</p>
              <p>Stockage local (IndexedDB) avec synchronisation cloud optionnelle</p>
            </div>
          </div>
        )}
      </div>

      {showRestoreModal && (
        <RestoreBackupModal
          onClose={() => setShowRestoreModal(false)}
          onRestored={() => {
            setShowRestoreModal(false);
            (async () => {
              setStats({
                docs: await db.documents.count(),
                workflows: await db.workflows.count(),
                participants: await db.participants.count(),
                activities: await db.activityLog.count(),
              });
            })();
          }}
        />
      )}
    </div>
  );
}
