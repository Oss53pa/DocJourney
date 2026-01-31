import { db } from '../db';
import { logActivity } from './activityService';
import { generateWorkflowReminders } from './reminderService';
import type { BlockedWorkflowInfo, Participant } from '../types';

export async function detectBlockedWorkflows(): Promise<BlockedWorkflowInfo[]> {
  const workflows = await db.workflows.toArray();
  const documents = await db.documents.toArray();
  const participants = await db.participants.toArray();
  const docMap = new Map(documents.map(d => [d.id, d]));
  const participantMap = new Map(participants.map(p => [p.email, p]));
  const blocked: BlockedWorkflowInfo[] = [];

  for (const workflow of workflows) {
    if (workflow.completedAt) continue;
    const doc = docMap.get(workflow.documentId);
    if (!doc || doc.status !== 'in_progress') continue;

    const currentStep = workflow.steps[workflow.currentStepIndex];
    if (!currentStep || currentStep.status === 'completed' || currentStep.status === 'rejected' || currentStep.status === 'skipped') continue;

    const participantRecord = participantMap.get(currentStep.participant.email);

    // Check if participant is absent
    if (participantRecord?.isAbsent) {
      const substituteRecord = participantRecord.substituteEmail
        ? participantMap.get(participantRecord.substituteEmail)
        : undefined;

      blocked.push({
        workflowId: workflow.id,
        documentId: workflow.documentId,
        documentName: doc.name,
        workflowName: workflow.name,
        blockedStepIndex: workflow.currentStepIndex,
        blockedParticipant: currentStep.participant,
        blockedSince: currentStep.sentAt || workflow.createdAt,
        reason: 'absent',
        substituteAvailable: substituteRecord
          ? { name: substituteRecord.name, email: substituteRecord.email, organization: substituteRecord.organization }
          : undefined,
      });
      continue;
    }

    // Check if deadline has passed
    if (workflow.deadline && new Date() > new Date(workflow.deadline)) {
      blocked.push({
        workflowId: workflow.id,
        documentId: workflow.documentId,
        documentName: doc.name,
        workflowName: workflow.name,
        blockedStepIndex: workflow.currentStepIndex,
        blockedParticipant: currentStep.participant,
        blockedSince: currentStep.sentAt || workflow.createdAt,
        reason: 'overdue',
      });
    }
  }

  return blocked;
}

export async function reassignStep(
  workflowId: string,
  stepIndex: number,
  newParticipant: Participant
): Promise<void> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return;

  const step = workflow.steps[stepIndex];
  if (!step) return;

  const previousParticipant = { ...step.participant };
  step.reassignedFrom = previousParticipant;
  step.participant = newParticipant;

  await db.workflows.put(workflow);

  await logActivity(
    'step_reassigned',
    `Étape ${stepIndex + 1} réassignée de ${previousParticipant.name} à ${newParticipant.name}`,
    workflow.documentId,
    workflowId
  );
}

export async function skipStep(
  workflowId: string,
  stepIndex: number,
  reason: string
): Promise<void> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return;

  const step = workflow.steps[stepIndex];
  if (!step) return;

  step.status = 'skipped';
  step.skippedAt = new Date();
  step.skippedReason = reason;

  // Advance workflow
  if (stepIndex + 1 < workflow.steps.length) {
    workflow.currentStepIndex = stepIndex + 1;
  } else {
    // If last step is skipped, complete the workflow
    workflow.completedAt = new Date();
    await db.documents.update(workflow.documentId, { status: 'completed', updatedAt: new Date() });
  }

  await db.workflows.put(workflow);

  await logActivity(
    'step_skipped',
    `Étape ${stepIndex + 1} passée (${step.participant.name}) : ${reason}`,
    workflow.documentId,
    workflowId
  );
}

export async function extendDeadline(
  workflowId: string,
  newDeadline: Date
): Promise<void> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return;

  workflow.deadline = newDeadline;
  await db.workflows.put(workflow);

  // Regenerate reminders
  await generateWorkflowReminders(workflow);

  await logActivity(
    'workflow_created',
    `Échéance prolongée au ${newDeadline.toLocaleDateString('fr-FR')}`,
    workflow.documentId,
    workflowId
  );
}
