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
}

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

export async function performAutoBackup(): Promise<void> {
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
