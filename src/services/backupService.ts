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
