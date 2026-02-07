import { useState, useEffect } from 'react';
import { Clock, Save, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import type { RetentionMode, DocumentStatus } from '../../types';

export default function RetentionSettingsSection() {
  const { settings, loading, updateSettings } = useSettings();
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState<RetentionMode>('content_only');
  const [notify, setNotify] = useState(true);
  const [notifyDays, setNotifyDays] = useState(2);
  const [autoBackup, setAutoBackup] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) {
      setEnabled(settings.retentionEnabled ?? true);
      setDays(settings.retentionDays ?? 7);
      setMode(settings.retentionMode ?? 'content_only');
      setNotify(settings.retentionNotifyBeforeDeletion ?? true);
      setNotifyDays(settings.retentionNotifyDaysBefore ?? 2);
      setAutoBackup(settings.retentionAutoBackupToCloud ?? true);
    }
  }, [settings, loading]);

  const handleSave = async () => {
    await updateSettings({
      retentionEnabled: enabled,
      retentionDays: days,
      retentionMode: mode,
      retentionNotifyBeforeDeletion: notify,
      retentionNotifyDaysBefore: notifyDays,
      retentionAutoBackupToCloud: autoBackup,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Politique de rétention</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Suppression automatique du contenu des documents terminés</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Fonctionnement :</strong> Quand un workflow est terminé ou rejeté, le contenu du document
          est automatiquement supprimé après le délai configuré pour économiser l'espace de stockage.
          Les métadonnées et rapports de validation sont conservés.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <span className="text-sm font-normal text-neutral-700">Activer la rétention automatique</span>
        </label>

        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">
            Délai avant suppression
          </label>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="input"
            disabled={!enabled}
          >
            <option value={7}>7 jours</option>
            <option value={14}>14 jours</option>
            <option value={30}>30 jours</option>
            <option value={60}>60 jours</option>
            <option value={90}>90 jours</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">
            Mode de suppression
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="retentionMode"
                value="content_only"
                checked={mode === 'content_only'}
                onChange={() => setMode('content_only')}
                disabled={!enabled}
                className="mt-0.5 w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <div>
                <span className="text-sm font-normal text-neutral-700">Contenu uniquement</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 ml-2">Recommandé</span>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Supprime le fichier Base64 mais conserve les métadonnées, le workflow et les rapports.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="retentionMode"
                value="full"
                checked={mode === 'full'}
                onChange={() => setMode('full')}
                disabled={!enabled}
                className="mt-0.5 w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <div>
                <span className="text-sm font-normal text-neutral-700">Suppression complète</span>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Supprime le document, le workflow et les rapports associés.
                </p>
              </div>
            </label>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notify}
            onChange={e => setNotify(e.target.checked)}
            disabled={!enabled}
            className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <span className="text-sm font-normal text-neutral-700">Alerter avant la suppression</span>
        </label>

        {notify && enabled && (
          <div className="ml-7">
            <label className="block text-xs font-normal text-neutral-500 mb-1.5">
              Jours avant la suppression
            </label>
            <input
              type="number"
              min={1}
              max={days - 1}
              value={notifyDays}
              onChange={e => setNotifyDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="input w-24"
            />
          </div>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoBackup}
            onChange={e => setAutoBackup(e.target.checked)}
            disabled={!enabled}
            className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <span className="text-sm font-normal text-neutral-700">Sauvegarder sur le cloud avant suppression</span>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} className="btn-primary btn-sm">
          <Save size={14} /> Enregistrer
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
