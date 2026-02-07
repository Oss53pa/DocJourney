import { db } from '../db';
import { generateId, getParticipantColor } from '../utils';
import { logActivity } from './activityService';
import { updateDocumentStatus } from './documentService';
import { generateWorkflowReminders } from './reminderService';
import { scheduleRetention } from './retentionService';
import type {
  Workflow,
  WorkflowStep,
  Participant,
  ParticipantRole,
  StepResponse,
  ReturnFileData,
  Annotation,
} from '../types';

export interface StepConfig {
  participant: Participant;
  role: ParticipantRole;
  instructions?: string;
}

export async function createWorkflow(
  documentId: string,
  name: string,
  steps: StepConfig[],
  owner: Participant & { organization?: string },
  deadline?: Date
): Promise<Workflow> {
  const id = generateId();

  const workflowSteps: WorkflowStep[] = steps.map((s, i) => ({
    id: generateId(),
    order: i + 1,
    participant: s.participant,
    role: s.role,
    status: i === 0 ? 'pending' : 'pending',
    instructions: s.instructions,
  }));

  const workflow: Workflow = {
    id,
    documentId,
    name,
    steps: workflowSteps,
    currentStepIndex: 0,
    createdAt: new Date(),
    owner,
    deadline,
  };

  await db.workflows.add(workflow);
  await db.documents.update(documentId, { workflowId: id, status: 'in_progress', updatedAt: new Date() });

  // Register participants
  for (let i = 0; i < steps.length; i++) {
    await registerParticipant(steps[i].participant, steps[i].role, getParticipantColor(i));
  }

  await logActivity('workflow_created', `Workflow créé : ${name}`, documentId, id);

  // Generate reminders if deadline is set
  if (deadline) {
    await generateWorkflowReminders(workflow);
  }

  return workflow;
}

async function registerParticipant(participant: Participant, role: ParticipantRole, color: string) {
  const existing = await db.participants.where('email').equals(participant.email).first();
  if (existing) {
    await db.participants.update(existing.id, {
      lastUsed: new Date(),
      totalWorkflows: existing.totalWorkflows + 1,
      roles: [...new Set([...existing.roles, role])],
    });
  } else {
    await db.participants.add({
      id: generateId(),
      name: participant.name,
      email: participant.email,
      organization: participant.organization,
      color,
      firstUsed: new Date(),
      lastUsed: new Date(),
      totalWorkflows: 1,
      roles: [role],
    });
  }
}

export async function getWorkflow(id: string): Promise<Workflow | undefined> {
  return db.workflows.get(id);
}

export async function getWorkflowByDocument(documentId: string): Promise<Workflow | undefined> {
  return db.workflows.where('documentId').equals(documentId).first();
}

export async function getAllWorkflows(): Promise<Workflow[]> {
  return db.workflows.orderBy('createdAt').reverse().toArray();
}

export async function markStepAsSent(workflowId: string, stepIndex: number) {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return;

  workflow.steps[stepIndex].status = 'sent';
  workflow.steps[stepIndex].sentAt = new Date();
  await db.workflows.put(workflow);

  await logActivity(
    'package_generated',
    `Paquet généré pour ${workflow.steps[stepIndex].participant.name}`,
    workflow.documentId,
    workflowId
  );
}

export async function processReturn(
  workflowId: string,
  returnData: ReturnFileData
): Promise<{ success: boolean; message: string }> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return { success: false, message: 'Workflow introuvable' };

  const stepIndex = workflow.steps.findIndex(s => s.id === returnData.stepId);
  if (stepIndex === -1) return { success: false, message: 'Étape introuvable' };

  const step = workflow.steps[stepIndex];
  if (step.status === 'completed' || step.status === 'rejected' || step.status === 'skipped') {
    return { success: false, message: 'Cette étape a déjà été traitée' };
  }

  const isRejected = returnData.decision === 'rejected';
  const isModificationRequested = returnData.decision === 'modification_requested';

  const response: StepResponse = {
    decision: returnData.decision,
    annotations: returnData.annotations,
    generalComment: returnData.generalComment,
    signature: returnData.signature,
    initials: returnData.initials,
    rejectionDetails: returnData.rejectionDetails,
    completedAt: new Date(returnData.completedAt),
    returnFile: JSON.stringify(returnData),
  };

  workflow.steps[stepIndex].completedAt = new Date();
  workflow.steps[stepIndex].response = response;

  if (isRejected) {
    workflow.steps[stepIndex].status = 'rejected';
    await updateDocumentStatus(workflow.documentId, 'rejected');
    workflow.completedAt = new Date();
    await logActivity(
      'workflow_rejected',
      `Document rejeté par ${step.participant.name}`,
      workflow.documentId,
      workflowId
    );
    // Schedule retention for rejected document
    const rejDoc = await db.documents.get(workflow.documentId);
    if (rejDoc) await scheduleRetention(workflow.documentId, rejDoc.name);
  } else if (isModificationRequested) {
    // Modification requested: mark step as rejected, pause workflow (document goes back to owner)
    workflow.steps[stepIndex].status = 'rejected';
    await logActivity(
      'workflow_rejected',
      `Modification demandée par ${step.participant.name}`,
      workflow.documentId,
      workflowId
    );
  } else {
    workflow.steps[stepIndex].status = 'completed';
    await logActivity(
      'step_completed',
      `Étape ${stepIndex + 1} complétée par ${step.participant.name}`,
      workflow.documentId,
      workflowId
    );

    // Advance to next non-skipped step
    let nextIndex = stepIndex + 1;
    while (nextIndex < workflow.steps.length && workflow.steps[nextIndex].status === 'skipped') {
      nextIndex++;
    }
    if (nextIndex < workflow.steps.length) {
      workflow.currentStepIndex = nextIndex;
    } else {
      // Workflow completed
      workflow.completedAt = new Date();
      await updateDocumentStatus(workflow.documentId, 'completed');
      await logActivity(
        'workflow_completed',
        `Circuit de validation terminé`,
        workflow.documentId,
        workflowId
      );
      // Schedule retention for completed document
      const compDoc = await db.documents.get(workflow.documentId);
      if (compDoc) await scheduleRetention(workflow.documentId, compDoc.name);
    }
  }

  await db.workflows.put(workflow);

  return {
    success: true,
    message: isRejected
      ? 'Retour traité : document rejeté'
      : isModificationRequested
        ? 'Retour traité : modification demandée'
        : 'Retour traité avec succès',
  };
}

export function getAllAnnotationsUpToStep(workflow: Workflow, stepIndex: number): Annotation[] {
  const annotations: Annotation[] = [];
  for (let i = 0; i < stepIndex; i++) {
    const step = workflow.steps[i];
    if (step.response?.annotations) {
      annotations.push(...step.response.annotations);
    }
  }
  return annotations;
}

export async function cancelWorkflow(workflowId: string) {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return;

  workflow.completedAt = new Date();
  // Mark remaining steps as rejected
  for (const step of workflow.steps) {
    if (step.status === 'pending' || step.status === 'sent') {
      step.status = 'rejected';
    }
    // skipped steps remain as skipped
  }
  await db.workflows.put(workflow);
  await updateDocumentStatus(workflow.documentId, 'rejected');
}
