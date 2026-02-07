/**
 * Storage Quota Service
 * Monitors IndexedDB storage usage and provides alerts when storage is running low
 */

import { db } from '../db';

export interface StorageQuotaInfo {
  used: number;           // Bytes used
  quota: number;          // Total quota in bytes
  usagePercent: number;   // Percentage used
  remaining: number;      // Bytes remaining
  isLow: boolean;         // Below threshold
  isCritical: boolean;    // Very low
  formattedUsed: string;
  formattedQuota: string;
  formattedRemaining: string;
}

export interface StorageBreakdown {
  documents: number;
  workflows: number;
  validationReports: number;
  activityLog: number;
  participants: number;
  other: number;
  total: number;
}

// Thresholds
const LOW_STORAGE_THRESHOLD = 0.75;      // 75% - show warning
const CRITICAL_STORAGE_THRESHOLD = 0.90; // 90% - show critical alert

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'Ko', 'Mo', 'Go', 'To'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get storage quota information using Storage API
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  try {
    // Use Navigator Storage API if available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const remaining = quota - used;
      const usagePercent = quota > 0 ? (used / quota) * 100 : 0;

      return {
        used,
        quota,
        usagePercent,
        remaining,
        isLow: usagePercent >= LOW_STORAGE_THRESHOLD * 100,
        isCritical: usagePercent >= CRITICAL_STORAGE_THRESHOLD * 100,
        formattedUsed: formatBytes(used),
        formattedQuota: formatBytes(quota),
        formattedRemaining: formatBytes(remaining),
      };
    }

    // Fallback: estimate from our data
    return await estimateStorageFromData();
  } catch (error) {
    console.error('Error getting storage quota:', error);
    return await estimateStorageFromData();
  }
}

/**
 * Estimate storage by calculating size of our data
 */
async function estimateStorageFromData(): Promise<StorageQuotaInfo> {
  const breakdown = await getStorageBreakdown();
  const used = breakdown.total;

  // Default browser quota is typically ~50% of disk or minimum 10GB
  const quota = 10 * 1024 * 1024 * 1024; // 10 GB estimate
  const remaining = Math.max(0, quota - used);
  const usagePercent = (used / quota) * 100;

  return {
    used,
    quota,
    usagePercent,
    remaining,
    isLow: usagePercent >= LOW_STORAGE_THRESHOLD * 100,
    isCritical: usagePercent >= CRITICAL_STORAGE_THRESHOLD * 100,
    formattedUsed: formatBytes(used),
    formattedQuota: formatBytes(quota),
    formattedRemaining: formatBytes(remaining),
  };
}

/**
 * Get detailed breakdown of storage usage by table
 */
export async function getStorageBreakdown(): Promise<StorageBreakdown> {
  let documents = 0;
  let workflows = 0;
  let validationReports = 0;
  let activityLog = 0;
  let participants = 0;
  let other = 0;

  try {
    // Calculate document sizes (main storage consumer)
    const allDocs = await db.documents.toArray();
    for (const doc of allDocs) {
      // Content is Base64, calculate actual size
      const contentSize = doc.content ? estimateBase64Size(doc.content) : 0;
      const previewSize = doc.previewContent ? estimateBase64Size(doc.previewContent) : 0;
      documents += contentSize + previewSize + estimateJsonSize(doc);
    }

    // Workflows with signatures/initials
    const allWorkflows = await db.workflows.toArray();
    for (const wf of allWorkflows) {
      let wfSize = estimateJsonSize(wf);
      // Add signature/initials sizes
      for (const step of wf.steps) {
        if (step.signature?.image) {
          wfSize += estimateBase64Size(step.signature.image);
        }
        if (step.initials?.image) {
          wfSize += estimateBase64Size(step.initials.image);
        }
      }
      workflows += wfSize;
    }

    // Validation reports (PDF Base64)
    const allReports = await db.validationReports.toArray();
    for (const report of allReports) {
      validationReports += estimateBase64Size(report.content) + estimateJsonSize(report);
    }

    // Activity log
    const allActivities = await db.activityLog.toArray();
    activityLog = allActivities.reduce((sum, a) => sum + estimateJsonSize(a), 0);

    // Participants
    const allParticipants = await db.participants.toArray();
    participants = allParticipants.reduce((sum, p) => sum + estimateJsonSize(p), 0);

    // Other tables
    const templates = await db.workflowTemplates.toArray();
    const reminders = await db.reminders.toArray();
    const groups = await db.documentGroups.toArray();
    const connections = await db.cloudConnections.toArray();
    const participantGroups = await db.participantGroups.toArray();
    const retention = await db.documentRetention.toArray();

    other = [templates, reminders, groups, connections, participantGroups, retention]
      .flat()
      .reduce((sum, item) => sum + estimateJsonSize(item), 0);

  } catch (error) {
    console.error('Error calculating storage breakdown:', error);
  }

  return {
    documents,
    workflows,
    validationReports,
    activityLog,
    participants,
    other,
    total: documents + workflows + validationReports + activityLog + participants + other,
  };
}

/**
 * Estimate size of a Base64 string (actual binary size)
 */
function estimateBase64Size(base64: string): number {
  if (!base64) return 0;
  // Base64 encodes 3 bytes into 4 characters
  // So actual size is ~75% of string length
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Estimate JSON serialized size
 */
function estimateJsonSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

/**
 * Get largest documents by size
 */
export async function getLargestDocuments(limit = 10): Promise<Array<{
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  status: string;
}>> {
  const allDocs = await db.documents.toArray();

  const docsWithSize = allDocs.map(doc => {
    const contentSize = doc.content ? estimateBase64Size(doc.content) : 0;
    const previewSize = doc.previewContent ? estimateBase64Size(doc.previewContent) : 0;
    return {
      id: doc.id,
      name: doc.name,
      size: contentSize + previewSize,
      formattedSize: formatBytes(contentSize + previewSize),
      status: doc.status,
    };
  });

  return docsWithSize
    .sort((a, b) => b.size - a.size)
    .slice(0, limit);
}

/**
 * Get documents that can be safely cleaned up
 */
export async function getCleanableDocuments(): Promise<Array<{
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  status: string;
  reason: string;
}>> {
  const allDocs = await db.documents.toArray();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const cleanable: Array<{
    id: string;
    name: string;
    size: number;
    formattedSize: string;
    status: string;
    reason: string;
  }> = [];

  for (const doc of allDocs) {
    const contentSize = doc.content ? estimateBase64Size(doc.content) : 0;
    const previewSize = doc.previewContent ? estimateBase64Size(doc.previewContent) : 0;
    const size = contentSize + previewSize;

    let reason = '';

    // Archived documents older than 30 days
    if (doc.status === 'archived' && new Date(doc.updatedAt) < thirtyDaysAgo) {
      reason = 'Archivé depuis plus de 30 jours';
    }
    // Completed documents older than 90 days
    else if (doc.status === 'completed' && new Date(doc.updatedAt) < ninetyDaysAgo) {
      reason = 'Terminé depuis plus de 90 jours';
    }
    // Rejected documents older than 30 days
    else if (doc.status === 'rejected' && new Date(doc.updatedAt) < thirtyDaysAgo) {
      reason = 'Rejeté depuis plus de 30 jours';
    }
    // Draft documents older than 90 days with no workflow
    else if (doc.status === 'draft' && !doc.workflowId && new Date(doc.updatedAt) < ninetyDaysAgo) {
      reason = 'Brouillon inactif depuis 90 jours';
    }

    if (reason) {
      cleanable.push({
        id: doc.id,
        name: doc.name,
        size,
        formattedSize: formatBytes(size),
        status: doc.status,
        reason,
      });
    }
  }

  return cleanable.sort((a, b) => b.size - a.size);
}

/**
 * Clean up old activity logs
 */
export async function cleanupActivityLogs(olderThanDays = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const oldLogs = await db.activityLog
    .where('createdAt')
    .below(cutoff)
    .toArray();

  if (oldLogs.length > 0) {
    await db.activityLog.bulkDelete(oldLogs.map(l => l.id));
  }

  return oldLogs.length;
}

/**
 * Clean up orphaned validation reports (no matching workflow)
 */
export async function cleanupOrphanedReports(): Promise<number> {
  const allReports = await db.validationReports.toArray();
  const allWorkflows = await db.workflows.toArray();
  const workflowIds = new Set(allWorkflows.map(w => w.id));

  const orphaned = allReports.filter(r => !workflowIds.has(r.workflowId));

  if (orphaned.length > 0) {
    await db.validationReports.bulkDelete(orphaned.map(r => r.id));
  }

  return orphaned.length;
}

/**
 * Request persistent storage (prevents browser from evicting data)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch (error) {
      console.error('Error requesting persistent storage:', error);
      return false;
    }
  }
  return false;
}

/**
 * Check if storage is persistent
 */
export async function isStoragePersistent(): Promise<boolean> {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    return await navigator.storage.persisted();
  }
  return false;
}

/**
 * Get storage recommendations based on current usage
 */
export async function getStorageRecommendations(): Promise<string[]> {
  const quota = await getStorageQuota();
  const cleanable = await getCleanableDocuments();
  const recommendations: string[] = [];

  if (quota.isCritical) {
    recommendations.push('Stockage critique ! Supprimez des documents pour éviter les erreurs.');
  } else if (quota.isLow) {
    recommendations.push('Le stockage commence à être limité. Pensez à faire du ménage.');
  }

  if (cleanable.length > 0) {
    const totalCleanable = cleanable.reduce((sum, d) => sum + d.size, 0);
    recommendations.push(
      `${cleanable.length} document(s) peuvent être nettoyés (${formatBytes(totalCleanable)} récupérables)`
    );
  }

  const isPersistent = await isStoragePersistent();
  if (!isPersistent) {
    recommendations.push(
      'Activez le stockage persistant pour éviter la perte de données en cas de pression mémoire.'
    );
  }

  return recommendations;
}
