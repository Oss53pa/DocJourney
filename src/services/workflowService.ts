import { db } from '../db';
import { generateId, getParticipantColor } from '../utils';
import { logActivity } from './activityService';
import { updateDocumentStatus } from './documentService';
import { generateWorkflowReminders } from './reminderService';
import { scheduleRetention } from './retentionService';
import { autoAdvanceToNextStep } from './autoAdvanceService';
import type {
  Workflow,
  WorkflowStep,
  Participant,
  ParticipantRole,
  StepResponse,
  ReturnFileData,
  Annotation,
  CorrectionEntry,
  ParallelParticipantResponse,
} from '../types';

export interface StepConfig {
  participant: Participant;
  role: ParticipantRole;
  instructions?: string;
  // For parallel signatures
  isParallel?: boolean;
  parallelParticipants?: Participant[];
  parallelMode?: 'all' | 'any';
}

export async function createWorkflow(
  documentId: string,
  name: string,
  steps: StepConfig[],
  owner: Participant & { organization?: string },
  deadline?: Date
): Promise<Workflow> {
  const id = generateId();

  const workflowSteps: WorkflowStep[] = steps.map((s, i) => {
    const step: WorkflowStep = {
      id: generateId(),
      order: i + 1,
      participant: s.participant,
      role: s.role,
      status: 'pending',
      instructions: s.instructions,
      correctionCount: 0,
    };

    // Handle parallel signatures
    if (s.isParallel && s.parallelParticipants && s.parallelParticipants.length > 0) {
      step.isParallel = true;
      step.parallelMode = s.parallelMode || 'all';
      step.parallelParticipants = s.parallelParticipants.map(p => ({
        participant: p,
        status: 'pending' as const,
      }));
    }

    return step;
  });

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
    annotations: returnData.annotations || [],
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
    // Modification requested: mark step as correction_requested, pause workflow
    workflow.steps[stepIndex].status = 'correction_requested';

    // Track correction history
    const correctionEntry: CorrectionEntry = {
      requestedAt: new Date(),
      requestedBy: step.participant,
      reason: returnData.rejectionDetails?.reason || returnData.generalComment,
    };

    workflow.steps[stepIndex].correctionCount = (workflow.steps[stepIndex].correctionCount || 0) + 1;
    workflow.steps[stepIndex].correctionHistory = [
      ...(workflow.steps[stepIndex].correctionHistory || []),
      correctionEntry,
    ];

    // Set workflow correction state
    workflow.awaitingCorrection = true;
    workflow.correctionRequestedAt = new Date();
    workflow.correctionStepIndex = stepIndex;

    await logActivity(
      'step_returned_for_correction',
      `Correction demandée par ${step.participant.name} (${workflow.steps[stepIndex].correctionCount}e demande)`,
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

export async function cancelWorkflow(
  workflowId: string,
  cancelledBy?: Participant,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return { success: false, message: 'Workflow introuvable' };

  if (workflow.completedAt || workflow.cancelledAt) {
    return { success: false, message: 'Ce workflow est déjà terminé ou annulé' };
  }

  workflow.completedAt = new Date();
  workflow.cancelledAt = new Date();
  workflow.cancelledBy = cancelledBy;
  workflow.cancellationReason = reason;

  // Mark remaining steps as rejected
  for (const step of workflow.steps) {
    if (step.status === 'pending' || step.status === 'sent' || step.status === 'correction_requested') {
      step.status = 'rejected';
    }
    // skipped and completed steps remain as they are
  }

  await db.workflows.put(workflow);
  await updateDocumentStatus(workflow.documentId, 'rejected');

  await logActivity(
    'workflow_cancelled',
    `Workflow annulé${cancelledBy ? ` par ${cancelledBy.name}` : ''}${reason ? `: ${reason}` : ''}`,
    workflow.documentId,
    workflowId
  );

  return { success: true, message: 'Workflow annulé avec succès' };
}

/**
 * Resubmit a step after correction (used when correction was requested)
 */
export async function resubmitStepAfterCorrection(
  workflowId: string,
  stepIndex: number,
  newDocumentContent?: string
): Promise<{ success: boolean; message: string }> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return { success: false, message: 'Workflow introuvable' };

  const step = workflow.steps[stepIndex];
  if (step.status !== 'correction_requested') {
    return { success: false, message: 'Cette étape n\'attend pas de correction' };
  }

  // Reset step for resubmission
  step.status = 'pending';
  step.sentAt = undefined;
  step.completedAt = undefined;
  step.response = undefined;

  // Update correction history
  if (step.correctionHistory && step.correctionHistory.length > 0) {
    const lastCorrection = step.correctionHistory[step.correctionHistory.length - 1];
    lastCorrection.correctedAt = new Date();
  }

  // Clear workflow correction state
  workflow.awaitingCorrection = false;
  workflow.correctionRequestedAt = undefined;
  workflow.correctionStepIndex = undefined;
  workflow.currentStepIndex = stepIndex;

  // Update document content if provided
  if (newDocumentContent) {
    await db.documents.update(workflow.documentId, {
      content: newDocumentContent,
      updatedAt: new Date(),
    });
  }

  await db.workflows.put(workflow);

  await logActivity(
    'workflow_started',
    `Document corrigé et renvoyé à ${step.participant.name} (correction ${step.correctionCount})`,
    workflow.documentId,
    workflowId
  );

  return { success: true, message: 'Document renvoyé pour validation' };
}

/**
 * Process return for parallel signature step
 */
export async function processParallelReturn(
  workflowId: string,
  returnData: ReturnFileData,
  participantEmail: string
): Promise<{ success: boolean; message: string }> {
  const workflow = await db.workflows.get(workflowId);
  if (!workflow) return { success: false, message: 'Workflow introuvable' };

  const stepIndex = workflow.steps.findIndex(s => s.id === returnData.stepId);
  if (stepIndex === -1) return { success: false, message: 'Étape introuvable' };

  const step = workflow.steps[stepIndex];
  if (!step.isParallel || !step.parallelParticipants) {
    return { success: false, message: 'Cette étape n\'est pas une signature parallèle' };
  }

  // Find the participant in the parallel list
  const participantIndex = step.parallelParticipants.findIndex(
    p => p.participant.email === participantEmail
  );
  if (participantIndex === -1) {
    return { success: false, message: 'Participant non trouvé dans cette étape' };
  }

  const parallelParticipant = step.parallelParticipants[participantIndex];
  if (parallelParticipant.status === 'completed' || parallelParticipant.status === 'rejected') {
    return { success: false, message: 'Ce participant a déjà répondu' };
  }

  const isRejected = returnData.decision === 'rejected';

  const response: StepResponse = {
    decision: returnData.decision,
    annotations: returnData.annotations || [],
    generalComment: returnData.generalComment,
    signature: returnData.signature,
    initials: returnData.initials,
    rejectionDetails: returnData.rejectionDetails,
    completedAt: new Date(returnData.completedAt),
    returnFile: JSON.stringify(returnData),
  };

  // Update participant response
  parallelParticipant.status = isRejected ? 'rejected' : 'completed';
  parallelParticipant.completedAt = new Date();
  parallelParticipant.response = response;

  // Check if step is complete based on parallelMode
  const allResponded = step.parallelParticipants.every(
    p => p.status === 'completed' || p.status === 'rejected'
  );
  const anyCompleted = step.parallelParticipants.some(p => p.status === 'completed');
  const anyRejected = step.parallelParticipants.some(p => p.status === 'rejected');
  const allCompleted = step.parallelParticipants.every(p => p.status === 'completed');

  let stepCompleted = false;
  let stepRejected = false;

  if (step.parallelMode === 'any') {
    // First approval or rejection wins
    if (anyCompleted) {
      stepCompleted = true;
      step.status = 'completed';
      step.completedAt = new Date();
      // Store the first approver's response as the main response
      const firstApproval = step.parallelParticipants.find(p => p.status === 'completed');
      if (firstApproval?.response) {
        step.response = firstApproval.response;
      }
    } else if (allResponded && anyRejected) {
      stepRejected = true;
      step.status = 'rejected';
    }
  } else {
    // All must approve
    if (allCompleted) {
      stepCompleted = true;
      step.status = 'completed';
      step.completedAt = new Date();
      // Combine responses
      step.response = response; // Use last response as primary
    } else if (anyRejected) {
      stepRejected = true;
      step.status = 'rejected';
    }
  }

  await logActivity(
    'step_completed',
    `${parallelParticipant.participant.name} a ${isRejected ? 'rejeté' : 'approuvé'} (signature parallèle)`,
    workflow.documentId,
    workflowId
  );

  if (stepCompleted) {
    // Advance to next step
    let nextIndex = stepIndex + 1;
    while (nextIndex < workflow.steps.length && workflow.steps[nextIndex].status === 'skipped') {
      nextIndex++;
    }
    if (nextIndex < workflow.steps.length) {
      workflow.currentStepIndex = nextIndex;
    } else {
      workflow.completedAt = new Date();
      await updateDocumentStatus(workflow.documentId, 'completed');
      await logActivity('workflow_completed', 'Circuit de validation terminé', workflow.documentId, workflowId);
      const compDoc = await db.documents.get(workflow.documentId);
      if (compDoc) await scheduleRetention(workflow.documentId, compDoc.name);
    }
  } else if (stepRejected) {
    workflow.completedAt = new Date();
    await updateDocumentStatus(workflow.documentId, 'rejected');
    await logActivity('workflow_rejected', 'Document rejeté (signature parallèle)', workflow.documentId, workflowId);
    const rejDoc = await db.documents.get(workflow.documentId);
    if (rejDoc) await scheduleRetention(workflow.documentId, rejDoc.name);
  }

  await db.workflows.put(workflow);

  // Auto-advance to next step if step completed and workflow not finished
  if (stepCompleted && !workflow.completedAt) {
    await autoAdvanceToNextStep(workflowId);
  }

  return {
    success: true,
    message: stepCompleted
      ? 'Étape parallèle complétée'
      : stepRejected
        ? 'Étape parallèle rejetée'
        : `Réponse enregistrée (${step.parallelParticipants.filter(p => p.status === 'completed' || p.status === 'rejected').length}/${step.parallelParticipants.length})`,
  };
}

/**
 * Get workflows awaiting correction
 */
export async function getWorkflowsAwaitingCorrection(): Promise<Workflow[]> {
  const workflows = await db.workflows.toArray();
  return workflows.filter(w => w.awaitingCorrection && !w.completedAt);
}
