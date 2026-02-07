import { db } from '../db';
import { generateId } from '../utils';
import { logActivity } from './activityService';
import type { DocumentRetention, RetentionMode } from '../types';

// ── Schedule ──

export async function scheduleRetention(documentId: string, documentName: string): Promise<void> {
  const settings = await db.settings.get('default');
  if (!settings?.retentionEnabled) return;

  // Check if document status is excluded
  const doc = await db.documents.get(documentId);
  if (!doc) return;
  const excludedStatuses = settings.retentionExcludeStatuses ?? [];
  if (excludedStatuses.includes(doc.status)) return;

  // Idempotent: don't duplicate
  const existing = await db.documentRetention.where('documentId').equals(documentId).first();
  if (existing) return;

  const retentionDays = settings.retentionDays ?? 7;
  const now = new Date();
  const scheduledDeletionAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  const retention: DocumentRetention = {
    id: generateId(),
    documentId,
    documentName,
    workflowCompletedAt: now,
    scheduledDeletionAt,
    retentionDays,
    cloudBackupStatus: (settings.retentionAutoBackupToCloud ?? true) ? 'pending' : 'skipped',
    isProtected: false,
    notificationSent: false,
    extensionCount: 0,
  };

  await db.documentRetention.add(retention);
  await logActivity('retention_scheduled', `Rétention planifiée pour "${documentName}" (${retentionDays}j)`, documentId);
}

// ── Process cycle ──

export async function processRetentions(): Promise<void> {
  const settings = await db.settings.get('default');
  if (!settings?.retentionEnabled) return;

  const now = new Date();
  const notifyDaysBefore = settings.retentionNotifyDaysBefore ?? 2;
  const retentionMode = settings.retentionMode ?? 'content_only';
  const autoBackup = settings.retentionAutoBackupToCloud ?? true;

  const allRetentions = await db.documentRetention.toArray();

  // Pass 1: Send notifications
  if (settings.retentionNotifyBeforeDeletion) {
    const notifyThreshold = new Date(now.getTime() + notifyDaysBefore * 24 * 60 * 60 * 1000);
    for (const retention of allRetentions) {
      if (
        !retention.isProtected &&
        !retention.deletedAt &&
        !retention.notificationSent &&
        new Date(retention.scheduledDeletionAt) <= notifyThreshold
      ) {
        await db.documentRetention.update(retention.id, {
          notificationSent: true,
          notificationSentAt: now,
        });
        await logActivity('retention_warning', `Suppression imminente de "${retention.documentName}"`, retention.documentId);
      }
    }
  }

  // Pass 2: Process expired retentions
  for (const retention of allRetentions) {
    if (retention.isProtected || retention.deletedAt) continue;
    if (new Date(retention.scheduledDeletionAt) > now) continue;

    // Try cloud backup if needed
    if (autoBackup && retention.cloudBackupStatus !== 'completed' && retention.cloudBackupStatus !== 'skipped') {
      try {
        await performCloudBackup(retention.documentId);
      } catch (err) {
        console.error('Cloud backup failed for retention:', retention.id, err);
        await db.documentRetention.update(retention.id, { cloudBackupStatus: 'failed' });
      }
    }

    // Delete content
    await deleteDocumentContent(retention.documentId, retentionMode);
    await db.documentRetention.update(retention.id, {
      deletedAt: now,
      deletionMode: retentionMode,
    });
    await logActivity('retention_deleted', `Contenu supprimé pour "${retention.documentName}"`, retention.documentId);
  }
}

// ── Protect / Unprotect ──

export async function protectDocument(documentId: string): Promise<void> {
  const retention = await db.documentRetention.where('documentId').equals(documentId).first();
  if (!retention) return;

  await db.documentRetention.update(retention.id, {
    isProtected: true,
  });
  await logActivity('retention_protected', `Document "${retention.documentName}" protégé`, documentId);
}

export async function unprotectDocument(documentId: string): Promise<void> {
  const retention = await db.documentRetention.where('documentId').equals(documentId).first();
  if (!retention) return;

  const settings = await db.settings.get('default');
  const retentionDays = settings?.retentionDays ?? 7;
  const now = new Date();
  const scheduledDeletionAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  await db.documentRetention.update(retention.id, {
    isProtected: false,
    scheduledDeletionAt,
    notificationSent: false,
    notificationSentAt: undefined,
  });
}

// ── Extend ──

export async function extendRetention(documentId: string, additionalDays: number): Promise<void> {
  const retention = await db.documentRetention.where('documentId').equals(documentId).first();
  if (!retention) return;

  const currentDate = new Date(retention.scheduledDeletionAt);
  const newDate = new Date(currentDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

  await db.documentRetention.update(retention.id, {
    scheduledDeletionAt: newDate,
    notificationSent: false,
    notificationSentAt: undefined,
    extensionCount: retention.extensionCount + 1,
  });
  await logActivity('retention_extended', `Rétention prolongée de ${additionalDays}j pour "${retention.documentName}"`, documentId);
}

// ── Cloud backup ──

export async function performCloudBackup(documentId: string): Promise<void> {
  const { getAllConnections, uploadToGoogleDrive, uploadToDropbox } = await import('./cloudExportService');
  const connections = await getAllConnections();

  if (connections.length === 0) {
    await db.documentRetention.where('documentId').equals(documentId).modify({ cloudBackupStatus: 'skipped' });
    return;
  }

  const doc = await db.documents.get(documentId);
  if (!doc || !doc.content) {
    await db.documentRetention.where('documentId').equals(documentId).modify({ cloudBackupStatus: 'skipped' });
    return;
  }

  const connection = connections[0]; // Use first available connection
  const fileName = `DocJourney-Backup-${doc.name}`;

  try {
    if (connection.provider === 'google_drive') {
      const result = await uploadToGoogleDrive(connection.accessToken, doc.content, doc.mimeType, fileName);
      await db.documentRetention.where('documentId').equals(documentId).modify({
        cloudBackupStatus: 'completed',
        cloudBackupUrl: result.id,
        cloudBackupProvider: 'google_drive',
      });
    } else if (connection.provider === 'dropbox') {
      const result = await uploadToDropbox(connection.accessToken, doc.content, fileName);
      await db.documentRetention.where('documentId').equals(documentId).modify({
        cloudBackupStatus: 'completed',
        cloudBackupUrl: result.id,
        cloudBackupProvider: 'dropbox',
      });
    }
    await logActivity('retention_backed_up', `Backup cloud effectué pour "${doc.name}"`, documentId);
  } catch (err) {
    console.error('Cloud backup error:', err);
    await db.documentRetention.where('documentId').equals(documentId).modify({ cloudBackupStatus: 'failed' });
  }
}

// ── Restore from cloud ──

export async function restoreFromCloud(documentId: string): Promise<boolean> {
  const retention = await db.documentRetention.where('documentId').equals(documentId).first();
  if (!retention || !retention.cloudBackupUrl || !retention.cloudBackupProvider) return false;

  const { getAllConnections } = await import('./cloudExportService');
  const connections = await getAllConnections();
  const connection = connections.find(c => c.provider === retention.cloudBackupProvider);
  if (!connection) return false;

  try {
    let content: string | null = null;

    if (retention.cloudBackupProvider === 'google_drive') {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${retention.cloudBackupUrl}?alt=media`,
        { headers: { Authorization: `Bearer ${connection.accessToken}` } }
      );
      if (!response.ok) return false;
      const blob = await response.blob();
      content = await blobToBase64(blob);
    } else if (retention.cloudBackupProvider === 'dropbox') {
      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: retention.cloudBackupUrl }),
        },
      });
      if (!response.ok) return false;
      const blob = await response.blob();
      content = await blobToBase64(blob);
    }

    if (content) {
      await db.documents.update(documentId, { content });
      await logActivity('retention_restored', `Document "${retention.documentName}" restauré depuis le cloud`, documentId);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Restore from cloud error:', err);
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Queries ──

export async function getRetentionForDocument(documentId: string): Promise<DocumentRetention | undefined> {
  return db.documentRetention.where('documentId').equals(documentId).first();
}

export async function getAllRetentions(): Promise<DocumentRetention[]> {
  return db.documentRetention.orderBy('scheduledDeletionAt').toArray();
}

export async function getRetentionStats(): Promise<{
  total: number;
  warned: number;
  protected: number;
  deleted: number;
  pendingBackup: number;
}> {
  const all = await db.documentRetention.toArray();
  return {
    total: all.length,
    warned: all.filter(r => r.notificationSent && !r.deletedAt).length,
    protected: all.filter(r => r.isProtected).length,
    deleted: all.filter(r => !!r.deletedAt).length,
    pendingBackup: all.filter(r => r.cloudBackupStatus === 'pending').length,
  };
}

// ── Internal: delete content ──

async function deleteDocumentContent(documentId: string, mode: RetentionMode): Promise<void> {
  if (mode === 'content_only') {
    await db.documents.update(documentId, { content: '', previewContent: '' });
  } else {
    // Full deletion: remove document + cascade
    const doc = await db.documents.get(documentId);
    if (doc?.workflowId) {
      const workflow = await db.workflows.get(doc.workflowId);
      if (workflow) {
        await db.validationReports.where('workflowId').equals(workflow.id).delete();
        await db.workflows.delete(workflow.id);
      }
    }
    await db.documents.delete(documentId);
  }
}
