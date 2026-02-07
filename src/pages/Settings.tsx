import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Trash2, AlertCircle, Database, Shield, Layout, Mail, HardDrive, Download, Cloud, Loader2, Lock, FolderOpen, Globe } from 'lucide-react';
import TemplatesSection from '../components/settings/TemplatesSection';
import CloudConnectionsSection from '../components/settings/CloudConnectionsSection';
import WorkflowTemplatesSection from '../components/settings/WorkflowTemplatesSection';
import SecuritySettingsSection from '../components/settings/SecuritySettingsSection';
import RetentionSettingsSection from '../components/retention/RetentionSettingsSection';
import RetentionDashboard from '../components/retention/RetentionDashboard';
import StorageManagementSection from '../components/settings/StorageManagementSection';
import DomainsSection from '../components/settings/DomainsSection';
import { useSettings } from '../hooks/useSettings';
import { db } from '../db';
import { createBackup, downloadBackup, shouldAutoBackup, performAutoBackup, selectBackupFolder, saveBackupToFolder, clearBackupFolder, isFileSystemAccessSupported } from '../services/backupService';
import { testFirebaseConnection } from '../services/firebaseSyncService';

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('settings_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('services');
  const [stats, setStats] = useState({ docs: 0, workflows: 0, participants: 0, activities: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [emailjsServiceId, setEmailjsServiceId] = useState('');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState('');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [lastAutoBackup, setLastAutoBackup] = useState<Date | undefined>();
  const [backupSaved, setBackupSaved] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  // Firebase sync settings
  const [firebaseSyncEnabled, setFirebaseSyncEnabled] = useState(false);
  const [firebaseApiKey, setFirebaseApiKey] = useState('');
  const [firebaseDatabaseURL, setFirebaseDatabaseURL] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebaseSaved, setFirebaseSaved] = useState(false);
  const [firebaseTesting, setFirebaseTesting] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  // Backup to folder
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupFolderName, setBackupFolderName] = useState<string>('');
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);

  useEffect(() => {
    if (!loading) {
      setEmailjsServiceId(settings.emailjsServiceId ?? '');
      setEmailjsTemplateId(settings.emailjsTemplateId ?? '');
      setEmailjsPublicKey(settings.emailjsPublicKey ?? '');
      setAutoBackupEnabled(settings.autoBackupEnabled ?? false);
      setAutoBackupFrequency(settings.autoBackupFrequency ?? 'weekly');
      setLastAutoBackup(settings.lastAutoBackup);
      setBackupFolderName(settings.backupFolderName ?? '');
      // Firebase sync
      setFirebaseSyncEnabled(settings.firebaseSyncEnabled ?? false);
      setFirebaseApiKey(settings.firebaseApiKey ?? '');
      setFirebaseDatabaseURL(settings.firebaseDatabaseURL ?? '');
      setFirebaseProjectId(settings.firebaseProjectId ?? '');
    }
  }, [settings, loading]);

  // Check for auto backup on load
  useEffect(() => {
    if (!loading && autoBackupEnabled && shouldAutoBackup(lastAutoBackup, autoBackupFrequency)) {
      performAutoBackup().then(() => {
        setLastAutoBackup(new Date());
      });
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

  const handleSaveEmail = async () => {
    await updateSettings({
      emailjsServiceId: emailjsServiceId,
      emailjsTemplateId: emailjsTemplateId,
      emailjsPublicKey: emailjsPublicKey,
    });
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
  };

  const handleSaveBackup = async () => {
    await updateSettings({
      autoBackupEnabled: autoBackupEnabled,
      autoBackupFrequency: autoBackupFrequency,
    });
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

  const handleSaveFirebase = async () => {
    await updateSettings({
      firebaseSyncEnabled: firebaseSyncEnabled,
      firebaseApiKey: firebaseApiKey,
      firebaseDatabaseURL: firebaseDatabaseURL,
      firebaseProjectId: firebaseProjectId,
    });
    setFirebaseSaved(true);
    setTimeout(() => setFirebaseSaved(false), 3000);
  };

  const handleTestFirebase = async () => {
    if (!firebaseApiKey || !firebaseDatabaseURL || !firebaseProjectId) {
      setFirebaseTestResult({ success: false, message: 'Veuillez remplir tous les champs' });
      return;
    }

    setFirebaseTesting(true);
    setFirebaseTestResult(null);

    try {
      const result = await testFirebaseConnection({
        enabled: true,
        apiKey: firebaseApiKey,
        databaseURL: firebaseDatabaseURL,
        projectId: firebaseProjectId,
      });
      setFirebaseTestResult(result);
    } catch (error) {
      setFirebaseTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de test',
      });
    } finally {
      setFirebaseTesting(false);
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = 'Atokp0879*';
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('settings_auth', 'true');
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

  // Password gate
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
                onChange={e => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                className={`input w-full ${passwordError ? 'ring-2 ring-red-300 border-red-300' : ''}`}
                placeholder="Mot de passe"
                autoFocus
              />
              {passwordError && (
                <p className="text-xs text-red-500 mt-1.5">Mot de passe incorrect</p>
              )}
            </div>
            <button type="submit" className="btn-primary w-full">
              <Lock size={15} />
              Accéder aux paramètres
            </button>
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
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-normal transition-all flex-1 justify-center
              ${activeTab === tab.id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-6 animate-fade-in" key={activeTab}>

        {/* ====== SERVICES ====== */}
        {activeTab === 'services' && (
          <>
            {/* EmailJS */}
            <div className="card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="text-sky-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-neutral-900">Envoi d'emails (EmailJS)</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Envoyer les emails de validation directement depuis l'application</p>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <p className="text-xs text-sky-800 leading-relaxed">
                  <strong>Configuration requise :</strong> Créez un compte gratuit sur{' '}
                  <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">emailjs.com</a>,
                  connectez votre service email (Gmail, Outlook...), puis créez un template avec les variables :
                  <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{to_email}}'}</code>,{' '}
                  <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{to_name}}'}</code>,{' '}
                  <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{subject}}'}</code>,{' '}
                  <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{message_html}}'}</code>.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                    Service ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailjsServiceId}
                    onChange={e => setEmailjsServiceId(e.target.value)}
                    className="input"
                    placeholder="Ex: service_xxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                    Template ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailjsTemplateId}
                    onChange={e => setEmailjsTemplateId(e.target.value)}
                    className={`input ${emailjsTemplateId && emailjsTemplateId === emailjsServiceId ? 'ring-2 ring-red-300' : ''}`}
                    placeholder="Ex: template_xxxxxxx"
                  />
                  {emailjsTemplateId && emailjsTemplateId === emailjsServiceId && (
                    <p className="text-xs text-red-500 mt-1.5">
                      ⚠️ Le Template ID ne doit pas être identique au Service ID. Trouvez le Template ID sur emailjs.com &gt; Email Templates (commence par "template_").
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                    Clé publique (Public Key) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailjsPublicKey}
                    onChange={e => setEmailjsPublicKey(e.target.value)}
                    className="input"
                    placeholder="Ex: xXxXxXxXxXxXx"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSaveEmail}
                  disabled={!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey}
                  className="btn-primary btn-sm"
                >
                  <Save size={14} /> Enregistrer
                </button>
                {emailSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-normal animate-fade-in">
                    <CheckCircle2 size={16} /> Enregistré
                  </span>
                )}
              </div>
            </div>

            {/* Firebase Sync */}
            <div className="card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Cloud size={16} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-neutral-900">Synchronisation automatique (Firebase)</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Recevez les retours automatiquement sans fichier email</p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs text-orange-800 leading-relaxed">
                  <strong>Fonctionnement :</strong> Quand un participant approuve/rejette un document, sa réponse est
                  automatiquement synchronisée vers DocJourney. L'email contient un lien cliquable vers la page de validation hébergée !
                </p>
                <p className="text-xs text-orange-700 mt-2 leading-relaxed">
                  <strong>Configuration requise :</strong> Créez un projet gratuit sur{' '}
                  <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Firebase Console</a>,
                  activez <strong>"Realtime Database"</strong>, <strong>"Storage"</strong> (pour héberger les pages) et <strong>"Anonymous Authentication"</strong>, puis copiez les credentials ci-dessous.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={firebaseSyncEnabled}
                  onChange={e => setFirebaseSyncEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-sm font-normal text-neutral-700">Activer la synchronisation automatique</span>
              </label>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                    API Key <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={firebaseApiKey}
                    onChange={e => setFirebaseApiKey(e.target.value)}
                    className="input"
                    placeholder="Ex: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    disabled={!firebaseSyncEnabled}
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                    Database URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={firebaseDatabaseURL}
                    onChange={e => setFirebaseDatabaseURL(e.target.value)}
                    className="input"
                    placeholder="Ex: https://votre-projet.firebaseio.com"
                    disabled={!firebaseSyncEnabled}
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                    Project ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={firebaseProjectId}
                    onChange={e => setFirebaseProjectId(e.target.value)}
                    className="input"
                    placeholder="Ex: votre-projet-firebase"
                    disabled={!firebaseSyncEnabled}
                  />
                </div>
              </div>

              {firebaseTestResult && (
                <div className={`flex items-center gap-2 text-sm ${firebaseTestResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {firebaseTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {firebaseTestResult.message}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleSaveFirebase}
                  disabled={firebaseSyncEnabled && (!firebaseApiKey || !firebaseDatabaseURL || !firebaseProjectId)}
                  className="btn-primary btn-sm"
                >
                  <Save size={14} /> Enregistrer
                </button>
                <button
                  onClick={handleTestFirebase}
                  disabled={!firebaseSyncEnabled || !firebaseApiKey || !firebaseDatabaseURL || !firebaseProjectId || firebaseTesting}
                  className="btn-secondary btn-sm"
                >
                  {firebaseTesting ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                  {firebaseTesting ? 'Test...' : 'Tester la connexion'}
                </button>
                {firebaseSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-normal animate-fade-in">
                    <CheckCircle2 size={16} /> Enregistré
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* ====== MODÈLES ====== */}
        {activeTab === 'models' && (
          <>
            <TemplatesSection />
            <WorkflowTemplatesSection />
          </>
        )}

        {/* ====== DONNÉES ====== */}
        {activeTab === 'data' && (
          <>
            {/* Storage Management */}
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

            {/* Backup Section */}
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
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={e => setAutoBackupEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="text-sm font-normal text-neutral-700">Activer la sauvegarde automatique</span>
                </label>

                <div>
                  <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                    Fréquence de sauvegarde
                  </label>
                  <select
                    value={autoBackupFrequency}
                    onChange={e => setAutoBackupFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="input"
                    disabled={!autoBackupEnabled}
                  >
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </div>

                {lastAutoBackup && (
                  <p className="text-xs text-neutral-500">
                    Dernière sauvegarde : {new Date(lastAutoBackup).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button onClick={handleSaveBackup} className="btn-primary btn-sm">
                  <Save size={14} /> Enregistrer
                </button>
                <button
                  onClick={handleManualBackup}
                  disabled={isBackingUp}
                  className="btn-secondary btn-sm"
                >
                  <Download size={14} />
                  {isBackingUp ? 'Sauvegarde...' : 'Sauvegarder maintenant'}
                </button>
                {backupSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-normal animate-fade-in">
                    <CheckCircle2 size={16} /> Enregistré
                  </span>
                )}
              </div>
            </div>

            {/* Backup Section */}
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
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down ${
                  backupMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                }`}>
                  {backupMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {backupMessage.text}
                </div>
              )}

              {!isFileSystemAccessSupported() ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800">
                    Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome ou Edge pour cette fonctionnalité.
                  </p>
                </div>
              ) : (
                <>
                  {/* Folder Selection */}
                  {backupFolderName ? (
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <FolderOpen size={18} className="text-emerald-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-800">Dossier configuré</p>
                          <p className="text-xs text-emerald-600 truncate">{backupFolderName}</p>
                        </div>
                        <button
                          onClick={async () => {
                            await clearBackupFolder();
                            await updateSettings({ backupFolderName: '' });
                            setBackupFolderName('');
                            setBackupMessage({ type: 'success', text: 'Dossier de sauvegarde supprimé' });
                          }}
                          className="text-xs text-neutral-500 hover:text-red-600"
                        >
                          Changer
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setBackupMessage(null);
                            const result = await saveBackupToFolder();
                            if (result.success) {
                              setBackupMessage({ type: 'success', text: `Sauvegarde créée : ${result.filename}` });
                              setLastAutoBackup(new Date());
                            } else {
                              setBackupMessage({ type: 'error', text: result.error || 'Erreur' });
                            }
                          }}
                          className="btn-primary btn-sm flex-1"
                        >
                          <Download size={14} />
                          Sauvegarder maintenant
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-600">
                        Les sauvegardes automatiques iront dans ce dossier. Un sous-dossier <strong>DocJourney-Backups</strong> a été créé.
                      </p>
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
                      <button
                        onClick={async () => {
                          setIsSelectingFolder(true);
                          setBackupMessage(null);
                          try {
                            const result = await selectBackupFolder();
                            if (result) {
                              await updateSettings({ backupFolderName: result.name });
                              setBackupFolderName(result.name);
                              setBackupMessage({ type: 'success', text: `Dossier "${result.name}" configuré !` });
                            }
                          } finally {
                            setIsSelectingFolder(false);
                          }
                        }}
                        disabled={isSelectingFolder}
                        className="btn-primary btn-sm w-full"
                      >
                        {isSelectingFolder ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
                        {isSelectingFolder ? 'Sélection...' : 'Choisir un dossier'}
                      </button>
                      <p className="text-[11px] text-neutral-500">
                        <strong>Astuce :</strong> Sélectionnez votre dossier OneDrive pour une synchronisation cloud automatique.
                      </p>
                    </div>
                  )}

                  {/* Manual download fallback */}
                  <div className="border-t border-neutral-100 pt-4">
                    <button
                      onClick={async () => {
                        const backup = await createBackup();
                        downloadBackup(backup);
                        setBackupMessage({ type: 'success', text: 'Sauvegarde téléchargée !' });
                      }}
                      className="btn-secondary btn-sm"
                    >
                      <Download size={14} />
                      Télécharger (manuel)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Cloud Connections */}
            <CloudConnectionsSection />

            {/* Retention Settings */}
            <RetentionSettingsSection />

            {/* Retention Dashboard */}
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

              {!showClearConfirm ? (
                <button onClick={() => setShowClearConfirm(true)} className="btn-danger btn-sm">
                  <Trash2 size={14} />
                  Effacer toutes les données
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 animate-fade-in">
                  <p className="text-sm text-red-700 font-normal leading-relaxed">
                    Cette action supprimera définitivement tous les documents, workflows et données associées.
                    Cette action est irréversible.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button onClick={handleClearData} className="btn-danger btn-sm">
                      Confirmer la suppression
                    </button>
                    <button onClick={() => setShowClearConfirm(false)} className="btn-secondary btn-sm">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ====== SÉCURITÉ ====== */}
        {activeTab === 'security' && (
          <SecuritySettingsSection />
        )}

        {/* ====== DOMAINES ====== */}
        {activeTab === 'domains' && (
          <DomainsSection />
        )}

        {/* ====== À PROPOS ====== */}
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
              <p>Application 100% locale — Aucune donnée envoyée vers un serveur</p>
              <p>Stockage : IndexedDB (navigateur)</p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">Développé par <span className="font-normal text-neutral-700">Pamela Atokouna</span></p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Tous droits réservés — Décembre 2025</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
