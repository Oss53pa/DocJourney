import { db } from '../db';
import { generateId, formatDate } from '../utils';
import type { ActivityType, ActivityEntry } from '../types';

// ── Categories ──

export type ActivityCategory =
  | 'document'
  | 'workflow'
  | 'signature'
  | 'notification'
  | 'organization'
  | 'contact';

const categoryMap: Record<ActivityType, ActivityCategory> = {
  document_imported: 'document',
  workflow_created: 'workflow',
  workflow_started: 'workflow',
  package_generated: 'workflow',
  return_imported: 'workflow',
  step_completed: 'workflow',
  workflow_completed: 'workflow',
  workflow_rejected: 'workflow',
  report_generated: 'document',
  document_archived: 'document',
  template_created: 'organization',
  template_used: 'organization',
  template_deleted: 'organization',
  reminder_sent: 'notification',
  group_created: 'organization',
  group_updated: 'organization',
  group_deleted: 'organization',
  cloud_exported: 'document',
  cloud_connected: 'organization',
  cloud_disconnected: 'organization',
  step_skipped: 'workflow',
  step_reassigned: 'workflow',
  step_returned_for_correction: 'workflow',
  otp_sent: 'notification',
  otp_verified: 'notification',
  otp_failed: 'notification',
  otp_blocked: 'notification',
  otp_resent: 'notification',
  packet_opened: 'document',
  packet_expired: 'document',
  packet_extended: 'document',
  retention_scheduled: 'document',
  retention_warning: 'notification',
  retention_expired: 'document',
  retention_deleted: 'document',
  retention_protected: 'document',
  retention_extended: 'document',
  retention_restored: 'document',
  retention_backed_up: 'document',
  domain_added: 'organization',
  domain_removed: 'organization',
};

export function getActivityCategory(type: ActivityType): ActivityCategory {
  return categoryMap[type] || 'document';
}

// ── Core logging ──

export async function logActivity(
  type: ActivityType,
  description: string,
  documentId?: string,
  workflowId?: string,
  metadata?: Record<string, unknown>
) {
  await db.activityLog.add({
    id: generateId(),
    timestamp: new Date(),
    type,
    documentId,
    workflowId,
    description,
    metadata,
  });
}

// ── Queries ──

export async function getRecentActivity(limit = 20) {
  return db.activityLog
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getActivityForDocument(documentId: string) {
  return db.activityLog
    .where('documentId')
    .equals(documentId)
    .reverse()
    .sortBy('timestamp');
}

// ── Filtered queries ──

export interface ActivityFilters {
  periodStart?: Date;
  periodEnd?: Date;
  category?: ActivityCategory;
  search?: string;
  documentId?: string;
  limit?: number;
  offset?: number;
}

export async function getFilteredActivity(filters: ActivityFilters): Promise<ActivityEntry[]> {
  let results = await db.activityLog.orderBy('timestamp').reverse().toArray();

  if (filters.periodStart) {
    const start = filters.periodStart.getTime();
    results = results.filter(a => new Date(a.timestamp).getTime() >= start);
  }
  if (filters.periodEnd) {
    const end = filters.periodEnd.getTime();
    results = results.filter(a => new Date(a.timestamp).getTime() <= end);
  }
  if (filters.category) {
    results = results.filter(a => getActivityCategory(a.type) === filters.category);
  }
  if (filters.search) {
    const lower = filters.search.toLowerCase();
    results = results.filter(a => a.description.toLowerCase().includes(lower));
  }
  if (filters.documentId) {
    results = results.filter(a => a.documentId === filters.documentId);
  }

  const offset = filters.offset || 0;
  const limit = filters.limit || 100;
  return results.slice(offset, offset + limit);
}

// ── Stats ──

export interface ActivityStats {
  totalDocuments: number;
  validated: number;
  rejected: number;
  inProgress: number;
  averageDelayDays: number;
  totalActivities: number;
}

export async function getActivityStats(from?: Date, to?: Date): Promise<ActivityStats> {
  const activities = await db.activityLog.orderBy('timestamp').toArray();
  const workflows = await db.workflows.toArray();
  const documents = await db.documents.toArray();

  const filteredActivities = activities.filter(a => {
    const ts = new Date(a.timestamp).getTime();
    if (from && ts < from.getTime()) return false;
    if (to && ts > to.getTime()) return false;
    return true;
  });

  // Count docs imported in period
  const docImports = filteredActivities.filter(a => a.type === 'document_imported');
  const completedInPeriod = filteredActivities.filter(a => a.type === 'workflow_completed');
  const rejectedInPeriod = filteredActivities.filter(a => a.type === 'workflow_rejected');

  // In progress = documents currently in_progress
  const inProgress = documents.filter(d => d.status === 'in_progress').length;

  // Average delay for completed workflows in period
  const completedWorkflows = workflows.filter(w => {
    if (!w.completedAt) return false;
    const ts = new Date(w.completedAt).getTime();
    if (from && ts < from.getTime()) return false;
    if (to && ts > to.getTime()) return false;
    return true;
  });

  let averageDelayDays = 0;
  if (completedWorkflows.length > 0) {
    const totalDays = completedWorkflows.reduce((sum, w) => {
      const start = new Date(w.createdAt).getTime();
      const end = new Date(w.completedAt!).getTime();
      return sum + (end - start) / (1000 * 60 * 60 * 24);
    }, 0);
    averageDelayDays = totalDays / completedWorkflows.length;
  }

  return {
    totalDocuments: docImports.length,
    validated: completedInPeriod.length,
    rejected: rejectedInPeriod.length,
    inProgress,
    averageDelayDays: Math.round(averageDelayDays * 10) / 10,
    totalActivities: filteredActivities.length,
  };
}

// ── New activity count (for badge) ──

export async function getNewActivityCount(since: Date): Promise<number> {
  const all = await db.activityLog.orderBy('timestamp').reverse().toArray();
  const sinceTs = since.getTime();
  return all.filter(a => new Date(a.timestamp).getTime() > sinceTs).length;
}

// ── Export ──

export type ExportFormat = 'csv';

export interface ExportOptions {
  periodStart?: Date;
  periodEnd?: Date;
  categories?: ActivityCategory[];
  format: ExportFormat;
}

export async function exportActivityHistory(options: ExportOptions): Promise<string> {
  let results = await db.activityLog.orderBy('timestamp').reverse().toArray();

  if (options.periodStart) {
    const start = options.periodStart.getTime();
    results = results.filter(a => new Date(a.timestamp).getTime() >= start);
  }
  if (options.periodEnd) {
    const end = options.periodEnd.getTime();
    results = results.filter(a => new Date(a.timestamp).getTime() <= end);
  }
  if (options.categories && options.categories.length > 0) {
    results = results.filter(a => options.categories!.includes(getActivityCategory(a.type)));
  }

  // CSV export
  const header = 'Date;Type;Catégorie;Description;Document ID;Workflow ID';
  const rows = results.map(a =>
    [
      formatDate(a.timestamp),
      a.type,
      getActivityCategory(a.type),
      `"${a.description.replace(/"/g, '""')}"`,
      a.documentId || '',
      a.workflowId || '',
    ].join(';')
  );
  return [header, ...rows].join('\n');
}

// ── Date grouping helper ──

export interface GroupedActivities {
  label: string;
  date: Date;
  entries: ActivityEntry[];
}

export function groupActivitiesByDate(activities: ActivityEntry[]): GroupedActivities[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekStart = new Date(today.getTime() - today.getDay() * 86400000);

  const groups: Map<string, GroupedActivities> = new Map();

  for (const entry of activities) {
    const entryDate = new Date(entry.timestamp);
    const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    let label: string;
    let key: string;

    if (entryDay.getTime() === today.getTime()) {
      label = "Aujourd'hui";
      key = 'today';
    } else if (entryDay.getTime() === yesterday.getTime()) {
      label = 'Hier';
      key = 'yesterday';
    } else if (entryDay.getTime() >= weekStart.getTime()) {
      label = 'Cette semaine';
      key = 'this_week';
    } else {
      // Group by month
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      label = `${monthNames[entryDate.getMonth()]} ${entryDate.getFullYear()}`;
      key = monthKey;
    }

    if (!groups.has(key)) {
      groups.set(key, { label, date: entryDay, entries: [] });
    }
    groups.get(key)!.entries.push(entry);
  }

  return Array.from(groups.values());
}
