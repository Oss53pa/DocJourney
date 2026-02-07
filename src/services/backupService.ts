import { db } from '../db';

export interface BackupData {
  version: string;
  createdAt: Date;
  documents: unknown[];
  workflows: unknown[];
  participants: unknown[];
  workflowTemplates: unknown[];
  documentGroups: unknown[];
  reminders: unknown[];
  activityLog: unknown[];
  settings: unknown[];
  documentRetention: unknown[];
  authorizedDomains: unknown[];
}

// Store directory handle in IndexedDB
const BACKUP_HANDLE_KEY = 'backup_directory_handle';

export async function createBackup(): Promise<BackupData> {
  const backup: BackupData = {
    version: '1.0.0',
    createdAt: new Date(),
    documents: await db.documents.toArray(),
    workflows: await db.workflows.toArray(),
    participants: await db.participants.toArray(),
    workflowTemplates: await db.workflowTemplates.toArray(),
    documentGroups: await db.documentGroups.toArray(),
    reminders: await db.reminders.toArray(),
    activityLog: await db.activityLog.toArray(),
    settings: await db.settings.toArray(),
    documentRetention: await db.documentRetention.toArray(),
    authorizedDomains: await db.authorizedDomains.toArray(),
  };
  return backup;
}

export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `docjourney-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

// Store directory handle in IndexedDB
async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const handleStore = await getHandleStore();
  await handleStore.put(handle, BACKUP_HANDLE_KEY);
}

// Get stored directory handle from IndexedDB
async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handleStore = await getHandleStore();
    const handle = await handleStore.get(BACKUP_HANDLE_KEY);
    return handle || null;
  } catch {
    return null;
  }
}

// Simple IndexedDB store for handles
function getHandleStore(): Promise<IDBObjectStore> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DocJourneyHandles', 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', 'readwrite');
      resolve(tx.objectStore('handles'));
    };
  });
}

// Select backup folder
export async function selectBackupFolder(): Promise<{ name: string } | null> {
  if (!isFileSystemAccessSupported()) {
    alert('Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome ou Edge.');
    return null;
  }

  try {
    // @ts-expect-error - showDirectoryPicker is not in TypeScript types yet
    const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });

    // Create DocJourney subfolder
    const docjourneyFolder = await handle.getDirectoryHandle('DocJourney-Backups', { create: true });

    // Store the handle
    await storeDirectoryHandle(docjourneyFolder);

    return { name: `${handle.name}/DocJourney-Backups` };
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Error selecting folder:', err);
    }
    return null;
  }
}

// Check if we have permission to the stored folder
export async function checkBackupFolderPermission(): Promise<boolean> {
  const handle = await getStoredDirectoryHandle();
  if (!handle) return false;

  try {
    // @ts-expect-error - queryPermission is not in TypeScript types
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

// Request permission to stored folder
export async function requestBackupFolderPermission(): Promise<boolean> {
  const handle = await getStoredDirectoryHandle();
  if (!handle) return false;

  try {
    // @ts-expect-error - requestPermission is not in TypeScript types
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

// Save backup to selected folder
export async function saveBackupToFolder(): Promise<{ success: boolean; filename?: string; error?: string }> {
  const handle = await getStoredDirectoryHandle();
  if (!handle) {
    return { success: false, error: 'Aucun dossier de sauvegarde sélectionné' };
  }

  // Check/request permission
  const hasPermission = await checkBackupFolderPermission();
  if (!hasPermission) {
    const granted = await requestBackupFolderPermission();
    if (!granted) {
      return { success: false, error: 'Permission refusée pour le dossier de sauvegarde' };
    }
  }

  try {
    const backup = await createBackup();
    const json = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `docjourney-backup-${date}_${time}.json`;

    // Create file in the directory
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();

    // Update last backup date
    const settings = await db.settings.get('default');
    if (settings) {
      await db.settings.put({ ...settings, lastAutoBackup: new Date() });
    }

    return { success: true, filename };
  } catch (err) {
    console.error('Error saving backup:', err);
    return { success: false, error: (err as Error).message };
  }
}

// Clear stored folder
export async function clearBackupFolder(): Promise<void> {
  try {
    const handleStore = await getHandleStore();
    await handleStore.delete(BACKUP_HANDLE_KEY);
  } catch {
    // Ignore
  }
}

export async function performAutoBackup(): Promise<void> {
  // Try to save to folder first
  const handle = await getStoredDirectoryHandle();
  if (handle) {
    const result = await saveBackupToFolder();
    if (result.success) {
      return;
    }
  }

  // Fallback to download
  const backup = await createBackup();
  downloadBackup(backup);

  // Update last backup date in settings
  const settings = await db.settings.get('default');
  if (settings) {
    await db.settings.put({ ...settings, lastAutoBackup: new Date() });
  }
}

export function getNextBackupDate(lastBackup: Date | undefined, frequency: 'daily' | 'weekly' | 'monthly'): Date {
  const base = lastBackup ? new Date(lastBackup) : new Date();
  const next = new Date(base);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}

export function shouldAutoBackup(lastBackup: Date | undefined, frequency: 'daily' | 'weekly' | 'monthly'): boolean {
  if (!lastBackup) return true;

  const nextBackup = getNextBackupDate(lastBackup, frequency);
  return new Date() >= nextBackup;
}

// ============================================================
// IMPORT / RESTORE FUNCTIONALITY
// ============================================================

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    documents: number;
    workflows: number;
    participants: number;
    templates: number;
    activities: number;
  };
  errors?: string[];
}

export interface ImportOptions {
  mode: 'replace' | 'merge';
  skipExisting?: boolean;
  importDocuments?: boolean;
  importWorkflows?: boolean;
  importParticipants?: boolean;
  importTemplates?: boolean;
  importSettings?: boolean;
  importActivityLog?: boolean;
}

/**
 * Validate backup file structure
 */
export function validateBackupFile(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Fichier invalide: format JSON attendu'] };
  }

  const backup = data as Record<string, unknown>;

  // Check required fields
  if (!backup.version) {
    errors.push('Champ "version" manquant');
  }
  if (!backup.createdAt) {
    errors.push('Champ "createdAt" manquant');
  }
  if (!Array.isArray(backup.documents)) {
    errors.push('Champ "documents" invalide ou manquant');
  }
  if (!Array.isArray(backup.workflows)) {
    errors.push('Champ "workflows" invalide ou manquant');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse backup file from File object
 */
export async function parseBackupFile(file: File): Promise<{ data: BackupData | null; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const validation = validateBackupFile(data);
    if (!validation.valid) {
      return { data: null, error: validation.errors.join(', ') };
    }

    return { data: data as BackupData };
  } catch (err) {
    return { data: null, error: `Erreur de lecture: ${(err as Error).message}` };
  }
}

/**
 * Get backup file info without importing
 */
export function getBackupInfo(backup: BackupData): {
  version: string;
  createdAt: Date;
  documentCount: number;
  workflowCount: number;
  participantCount: number;
  templateCount: number;
  activityCount: number;
} {
  return {
    version: backup.version,
    createdAt: new Date(backup.createdAt),
    documentCount: backup.documents?.length || 0,
    workflowCount: backup.workflows?.length || 0,
    participantCount: backup.participants?.length || 0,
    templateCount: backup.workflowTemplates?.length || 0,
    activityCount: backup.activityLog?.length || 0,
  };
}

/**
 * Import backup data into the database
 */
export async function importBackup(
  backup: BackupData,
  options: ImportOptions = { mode: 'replace' }
): Promise<ImportResult> {
  const errors: string[] = [];
  const stats = {
    documents: 0,
    workflows: 0,
    participants: 0,
    templates: 0,
    activities: 0,
  };

  try {
    // If replace mode, clear existing data first
    if (options.mode === 'replace') {
      if (options.importDocuments !== false) {
        await db.documents.clear();
        await db.validationReports.clear();
      }
      if (options.importWorkflows !== false) {
        await db.workflows.clear();
      }
      if (options.importParticipants !== false) {
        await db.participants.clear();
        await db.participantGroups.clear();
      }
      if (options.importTemplates !== false) {
        await db.workflowTemplates.clear();
      }
      if (options.importActivityLog !== false) {
        await db.activityLog.clear();
      }
      if (options.importSettings !== false) {
        // Keep settings but merge with backup
      }
      // Clear other tables
      await db.reminders.clear();
      await db.documentGroups.clear();
      await db.documentRetention.clear();
    }

    // Import documents
    if (options.importDocuments !== false && backup.documents?.length > 0) {
      for (const doc of backup.documents) {
        try {
          if (options.mode === 'merge' && options.skipExisting) {
            const existing = await db.documents.get((doc as { id: string }).id);
            if (existing) continue;
          }
          await db.documents.put(doc as never);
          stats.documents++;
        } catch (err) {
          errors.push(`Document: ${(err as Error).message}`);
        }
      }
    }

    // Import workflows
    if (options.importWorkflows !== false && backup.workflows?.length > 0) {
      for (const wf of backup.workflows) {
        try {
          if (options.mode === 'merge' && options.skipExisting) {
            const existing = await db.workflows.get((wf as { id: string }).id);
            if (existing) continue;
          }
          await db.workflows.put(wf as never);
          stats.workflows++;
        } catch (err) {
          errors.push(`Workflow: ${(err as Error).message}`);
        }
      }
    }

    // Import participants
    if (options.importParticipants !== false && backup.participants?.length > 0) {
      for (const p of backup.participants) {
        try {
          if (options.mode === 'merge' && options.skipExisting) {
            const existing = await db.participants.get((p as { id: string }).id);
            if (existing) continue;
          }
          await db.participants.put(p as never);
          stats.participants++;
        } catch (err) {
          errors.push(`Participant: ${(err as Error).message}`);
        }
      }
    }

    // Import workflow templates
    if (options.importTemplates !== false && backup.workflowTemplates?.length > 0) {
      for (const t of backup.workflowTemplates) {
        try {
          if (options.mode === 'merge' && options.skipExisting) {
            const existing = await db.workflowTemplates.get((t as { id: string }).id);
            if (existing) continue;
          }
          await db.workflowTemplates.put(t as never);
          stats.templates++;
        } catch (err) {
          errors.push(`Template: ${(err as Error).message}`);
        }
      }
    }

    // Import activity log
    if (options.importActivityLog !== false && backup.activityLog?.length > 0) {
      for (const a of backup.activityLog) {
        try {
          await db.activityLog.put(a as never);
          stats.activities++;
        } catch (err) {
          // Activity log errors are not critical
        }
      }
    }

    // Import other data
    if (backup.documentGroups?.length > 0) {
      for (const g of backup.documentGroups) {
        try {
          await db.documentGroups.put(g as never);
        } catch {
          // Ignore errors
        }
      }
    }

    if (backup.reminders?.length > 0) {
      for (const r of backup.reminders) {
        try {
          await db.reminders.put(r as never);
        } catch {
          // Ignore errors
        }
      }
    }

    if (backup.documentRetention?.length > 0) {
      for (const r of backup.documentRetention) {
        try {
          await db.documentRetention.put(r as never);
        } catch {
          // Ignore errors
        }
      }
    }

    if (backup.authorizedDomains?.length > 0) {
      for (const d of backup.authorizedDomains) {
        try {
          await db.authorizedDomains.put(d as never);
        } catch {
          // Ignore errors
        }
      }
    }

    // Import settings (merge with existing)
    if (options.importSettings !== false && backup.settings?.length > 0) {
      const backupSettings = backup.settings[0] as Record<string, unknown>;
      const existingSettings = await db.settings.get('default');

      if (backupSettings) {
        // Preserve sensitive settings from existing
        const mergedSettings = {
          ...backupSettings,
          id: 'default',
          // Preserve API keys and local configuration
          emailjsServiceId: existingSettings?.emailjsServiceId || backupSettings.emailjsServiceId,
          emailjsTemplateId: existingSettings?.emailjsTemplateId || backupSettings.emailjsTemplateId,
          emailjsPublicKey: existingSettings?.emailjsPublicKey || backupSettings.emailjsPublicKey,
          firebaseApiKey: existingSettings?.firebaseApiKey || backupSettings.firebaseApiKey,
          firebaseDatabaseURL: existingSettings?.firebaseDatabaseURL || backupSettings.firebaseDatabaseURL,
          firebaseProjectId: existingSettings?.firebaseProjectId || backupSettings.firebaseProjectId,
        };

        await db.settings.put(mergedSettings as never);
      }
    }

    return {
      success: true,
      message: `Import réussi: ${stats.documents} documents, ${stats.workflows} workflows, ${stats.participants} participants`,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      message: `Erreur d'import: ${(err as Error).message}`,
      errors: [...errors, (err as Error).message],
    };
  }
}

/**
 * Trigger file picker and import backup
 */
export async function selectAndImportBackup(
  options: ImportOptions = { mode: 'replace' }
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({ success: false, message: 'Aucun fichier sélectionné' });
        return;
      }

      const { data, error } = await parseBackupFile(file);
      if (!data) {
        resolve({ success: false, message: error || 'Erreur de lecture du fichier' });
        return;
      }

      const result = await importBackup(data, options);
      resolve(result);
    };

    input.oncancel = () => {
      resolve({ success: false, message: 'Annulé' });
    };

    input.click();
  });
}
