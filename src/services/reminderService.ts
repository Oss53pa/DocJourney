import { db } from '../db';
import { generateId } from '../utils';
import { addDays } from '../utils/dateUtils';
import { logActivity } from './activityService';
import type { Reminder, ReminderType, Workflow } from '../types';

export async function createReminder(
  documentId: string,
  workflowId: string,
  type: ReminderType,
  scheduledAt: Date,
  message: string,
  stepId?: string
): Promise<Reminder> {
  const reminder: Reminder = {
    id: generateId(),
    documentId,
    workflowId,
    stepId,
    type,
    scheduledAt,
    status: 'pending',
    message,
  };
  await db.reminders.add(reminder);
  return reminder;
}

export async function getDueReminders(): Promise<Reminder[]> {
  const now = new Date();
  return db.reminders
    .where('status')
    .equals('pending')
    .filter(r => new Date(r.scheduledAt) <= now)
    .toArray();
}

export async function getUpcomingDeadlines(days: number = 7): Promise<{
  workflow: Workflow;
  daysRemaining: number;
  documentName: string;
}[]> {
  const now = new Date();
  const limit = addDays(now, days);

  const workflows = await db.workflows
    .filter(w => !w.completedAt && !!w.deadline)
    .toArray();

  const results: { workflow: Workflow; daysRemaining: number; documentName: string }[] = [];

  for (const wf of workflows) {
    const deadline = new Date(wf.deadline!);
    if (deadline <= limit) {
      const doc = await db.documents.get(wf.documentId);
      const diffMs = deadline.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      results.push({
        workflow: wf,
        daysRemaining,
        documentName: doc?.name || 'Document inconnu',
      });
    }
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export async function markReminderAsSent(id: string): Promise<void> {
  await db.reminders.update(id, { status: 'sent', sentAt: new Date() });
}

export async function dismissReminder(id: string): Promise<void> {
  await db.reminders.update(id, { status: 'dismissed' });
}

export function generateMailtoLink(
  recipientEmail: string,
  recipientName: string,
  documentName: string,
  ownerName: string
): string {
  const subject = encodeURIComponent(`Relance : ${documentName}`);
  const body = encodeURIComponent(
    `Bonjour ${recipientName},\n\n` +
    `Je me permets de vous relancer concernant le document "${documentName}" ` +
    `qui est en attente de votre traitement.\n\n` +
    `Merci de bien vouloir traiter ce document dans les meilleurs délais.\n\n` +
    `Cordialement,\n${ownerName}`
  );
  return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendBrowserNotification(title: string, body: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: 'docjourney-reminder',
  });
}

export async function generateWorkflowReminders(
  workflow: Workflow,
  advanceDays: number = 3
): Promise<void> {
  if (!workflow.deadline) return;

  const deadline = new Date(workflow.deadline);

  // Reminder X days before deadline
  const reminderDate = addDays(deadline, -advanceDays);
  if (reminderDate > new Date()) {
    await createReminder(
      workflow.documentId,
      workflow.id,
      'deadline_approaching',
      reminderDate,
      `Le workflow "${workflow.name}" arrive à échéance dans ${advanceDays} jours`
    );
  }

  // Reminder on deadline day
  await createReminder(
    workflow.documentId,
    workflow.id,
    'deadline_passed',
    deadline,
    `Le workflow "${workflow.name}" arrive à échéance aujourd'hui`
  );

  await logActivity('reminder_sent', `Rappels programmés pour "${workflow.name}"`, workflow.documentId, workflow.id);
}
