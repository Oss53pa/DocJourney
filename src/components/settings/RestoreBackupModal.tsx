import React, { useState, useCallback } from 'react';
import {
  X,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileText,
  GitBranch,
  Users,
  Layout,
  Activity,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  parseBackupFile,
  getBackupInfo,
  importBackup,
  type BackupData,
  type ImportOptions,
} from '../../services/backupService';

interface RestoreBackupModalProps {
  onClose: () => void;
  onRestored: () => void;
}

type ImportMode = 'replace' | 'merge';

export default function RestoreBackupModal({
  onClose,
  onRestored,
}: RestoreBackupModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'done'>('select');
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('replace');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: { documents: number; workflows: number; participants: number; templates: number };
  } | null>(null);

  // Import options
  const [importDocuments, setImportDocuments] = useState(true);
  const [importWorkflows, setImportWorkflows] = useState(true);
  const [importParticipants, setImportParticipants] = useState(true);
  const [importTemplates, setImportTemplates] = useState(true);
  const [importActivityLog, setImportActivityLog] = useState(true);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const { data, error: parseError } = await parseBackupFile(file);
    if (!data) {
      setError(parseError || 'Erreur de lecture du fichier');
      return;
    }

    setBackupData(data);
    setStep('preview');
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.json')) {
      setError('Veuillez déposer un fichier JSON');
      return;
    }

    setError(null);

    const { data, error: parseError } = await parseBackupFile(file);
    if (!data) {
      setError(parseError || 'Erreur de lecture du fichier');
      return;
    }

    setBackupData(data);
    setStep('preview');
  }, []);

  const handleImport = async () => {
    if (!backupData) return;

    setStep('importing');

    const options: ImportOptions = {
      mode: importMode,
      skipExisting: importMode === 'merge',
      importDocuments,
      importWorkflows,
      importParticipants,
      importTemplates,
      importActivityLog,
    };

    const result = await importBackup(backupData, options);
    setImportResult(result);
    setStep('done');

    if (result.success) {
      // Notify parent to refresh data
      setTimeout(() => {
        onRestored();
      }, 2000);
    }
  };

  const info = backupData ? getBackupInfo(backupData) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Upload size={20} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-medium text-neutral-900">Restaurer une sauvegarde</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Select file */}
          {step === 'select' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="backup-file-input"
                />
                <label htmlFor="backup-file-input" className="cursor-pointer">
                  <Upload size={32} className="mx-auto text-neutral-400 mb-3" />
                  <p className="text-sm text-neutral-700 font-medium">
                    Glissez un fichier ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Format accepté: docjourney-backup-*.json
                  </p>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">Attention</p>
                    <p className="text-xs text-amber-700 mt-1">
                      La restauration peut remplacer vos données actuelles. Assurez-vous d'avoir une sauvegarde récente avant de continuer.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && info && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Fichier de sauvegarde</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <div>Version: {info.version}</div>
                  <div>
                    Date: {info.createdAt.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Documents', value: info.documentCount, icon: FileText, checked: importDocuments, setChecked: setImportDocuments },
                  { label: 'Workflows', value: info.workflowCount, icon: GitBranch, checked: importWorkflows, setChecked: setImportWorkflows },
                  { label: 'Participants', value: info.participantCount, icon: Users, checked: importParticipants, setChecked: setImportParticipants },
                  { label: 'Modèles', value: info.templateCount, icon: Layout, checked: importTemplates, setChecked: setImportTemplates },
                  { label: 'Activités', value: info.activityCount, icon: Activity, checked: importActivityLog, setChecked: setImportActivityLog },
                ].map((item) => (
                  <label
                    key={item.label}
                    className={`bg-neutral-50 rounded-xl p-3 cursor-pointer transition-colors ${
                      item.checked ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <item.icon size={14} className={item.checked ? 'text-blue-600' : 'text-neutral-400'} />
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.setChecked(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-blue-600"
                      />
                    </div>
                    <p className="text-lg font-medium text-neutral-900">{item.value}</p>
                    <p className="text-[11px] text-neutral-500">{item.label}</p>
                  </label>
                ))}
              </div>

              {/* Import mode */}
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-2">Mode d'import</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      importMode === 'replace'
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <RefreshCw size={14} className="inline mr-2" />
                    Remplacer tout
                  </button>
                  <button
                    onClick={() => setImportMode('merge')}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      importMode === 'merge'
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <Upload size={14} className="inline mr-2" />
                    Fusionner
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-2">
                  {importMode === 'replace'
                    ? 'Supprime les données existantes et les remplace par la sauvegarde'
                    : 'Ajoute les nouvelles données sans supprimer les existantes'}
                </p>
              </div>

              {importMode === 'replace' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      <strong>Mode Remplacer:</strong> Toutes les données sélectionnées seront supprimées et remplacées par celles de la sauvegarde.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 size={40} className="mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-neutral-700">Importation en cours...</p>
              <p className="text-xs text-neutral-500 mt-1">Ne fermez pas cette fenêtre</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && importResult && (
            <div className="py-8 text-center">
              {importResult.success ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <p className="text-lg font-medium text-neutral-900 mb-2">Import réussi !</p>
                  <p className="text-sm text-neutral-600">{importResult.message}</p>

                  {importResult.stats && (
                    <div className="flex justify-center gap-4 mt-4 text-xs text-neutral-500">
                      <span>{importResult.stats.documents} documents</span>
                      <span>{importResult.stats.workflows} workflows</span>
                      <span>{importResult.stats.participants} participants</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} className="text-red-600" />
                  </div>
                  <p className="text-lg font-medium text-neutral-900 mb-2">Erreur d'import</p>
                  <p className="text-sm text-red-600">{importResult.message}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-100">
          {step === 'select' && (
            <button onClick={onClose} className="btn-secondary btn-sm">
              Annuler
            </button>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => setStep('select')} className="btn-secondary btn-sm">
                Retour
              </button>
              <button
                onClick={handleImport}
                className={importMode === 'replace' ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
              >
                <Upload size={14} />
                {importMode === 'replace' ? 'Remplacer les données' : 'Importer'}
              </button>
            </>
          )}

          {step === 'done' && (
            <button onClick={onClose} className="btn-primary btn-sm">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
