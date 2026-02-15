import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, Cloud, Loader2 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { testFirebaseConnection } from '../../services/firebaseSyncService';

export default function FirebaseSyncSection() {
  const { settings, loading, updateSettings } = useSettings();
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [databaseURL, setDatabaseURL] = useState('');
  const [projectId, setProjectId] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!loading) {
      setEnabled(settings.firebaseSyncEnabled ?? false);
      setApiKey(settings.firebaseApiKey ?? '');
      setDatabaseURL(settings.firebaseDatabaseURL ?? '');
      setProjectId(settings.firebaseProjectId ?? '');
    }
  }, [settings, loading]);

  const handleSave = async () => {
    await updateSettings({
      firebaseSyncEnabled: enabled,
      firebaseApiKey: apiKey,
      firebaseDatabaseURL: databaseURL,
      firebaseProjectId: projectId,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!apiKey || !databaseURL || !projectId) {
      setTestResult({ success: false, message: 'Veuillez remplir tous les champs' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testFirebaseConnection({ enabled: true, apiKey, databaseURL, projectId });
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : 'Erreur de test' });
    } finally {
      setTesting(false);
    }
  };

  return (
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
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
        <span className="text-sm font-normal text-neutral-700">Activer la synchronisation automatique</span>
      </label>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">API Key <span className="text-red-400">*</span></label>
          <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} className="input" placeholder="Ex: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX" disabled={!enabled} />
        </div>
        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">Database URL <span className="text-red-400">*</span></label>
          <input type="text" value={databaseURL} onChange={e => setDatabaseURL(e.target.value)} className="input" placeholder="Ex: https://votre-projet.firebaseio.com" disabled={!enabled} />
        </div>
        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">Project ID <span className="text-red-400">*</span></label>
          <input type="text" value={projectId} onChange={e => setProjectId(e.target.value)} className="input" placeholder="Ex: votre-projet-firebase" disabled={!enabled} />
        </div>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
          {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {testResult.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={enabled && (!apiKey || !databaseURL || !projectId)} className="btn-primary btn-sm">
          <Save size={14} /> Enregistrer
        </button>
        <button onClick={handleTest} disabled={!enabled || !apiKey || !databaseURL || !projectId || testing} className="btn-secondary btn-sm">
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
          {testing ? 'Test...' : 'Tester la connexion'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-normal animate-fade-in">
            <CheckCircle2 size={16} /> Enregistré
          </span>
        )}
      </div>
    </div>
  );
}
