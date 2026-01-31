import { computeHash, getParticipantColor, generateId } from '../utils';
import type {
  PackageData,
  Workflow,
  DocJourneyDocument,
  PreviousStepSummary,
  Participant,
  ReturnFileData,
} from '../types';
import { getAllAnnotationsUpToStep, markStepAsSent } from './workflowService';
import { generateHTML } from './packageHtml';

// Re-export for external consumers
export { generateHTML } from './packageHtml';

export async function generatePackage(
  doc: DocJourneyDocument,
  workflow: Workflow,
  stepIndex: number
): Promise<string> {
  const step = workflow.steps[stepIndex];
  const documentHash = await computeHash(doc.content);

  // Build chain hash from previous steps
  let chainHash = documentHash;
  for (let i = 0; i < stepIndex; i++) {
    const s = workflow.steps[i];
    if (s.response) {
      chainHash = await computeHash(chainHash + JSON.stringify(s.response));
    }
  }

  const previousSteps: PreviousStepSummary[] = [];
  for (let i = 0; i < stepIndex; i++) {
    const s = workflow.steps[i];
    if (s.response) {
      previousSteps.push({
        stepNumber: s.order,
        participant: s.participant as Participant & { organization?: string },
        role: s.role,
        completedAt: s.completedAt || new Date(),
        decision: s.response.decision,
        generalComment: s.response.generalComment,
        annotationCount: s.response.annotations.length,
        annotations: s.response.annotations,
        color: getParticipantColor(i),
      });
    }
  }

  const allAnnotations = getAllAnnotationsUpToStep(workflow, stepIndex);

  // Populate nextStep from workflow
  const nextStepData = stepIndex + 1 < workflow.steps.length
    ? {
        participant: workflow.steps[stepIndex + 1].participant,
        role: workflow.steps[stepIndex + 1].role,
      }
    : undefined;

  // Check if this is a signature step and calculate validation lock hash
  const isSignerStep = step.role === 'signer';
  let lastValidationHash: string | undefined;
  let isLockedForSignature = false;

  if (isSignerStep && stepIndex > 0) {
    // Find the last non-signer step that was completed (validation step)
    for (let i = stepIndex - 1; i >= 0; i--) {
      const prevStep = workflow.steps[i];
      if (prevStep.status === 'completed' && prevStep.role !== 'signer' && prevStep.response) {
        // Calculate hash including document + all validations up to this point
        lastValidationHash = await computeHash(documentHash + chainHash);
        isLockedForSignature = true;
        break;
      }
    }
  }

  const packageData: PackageData = {
    version: '2.0.0',
    packageId: generateId(),
    generatedAt: new Date(),
    document: {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      content: doc.content,
      previewContent: doc.previewContent,
    },
    workflow: {
      id: workflow.id,
      totalSteps: workflow.steps.length,
      currentStepIndex: stepIndex,
    },
    currentStep: {
      id: step.id,
      order: step.order,
      participant: step.participant,
      role: step.role,
      instructions: step.instructions,
    },
    owner: workflow.owner,
    previousSteps,
    allAnnotations,
    nextStep: nextStepData,
    security: {
      documentHash,
      chainHash,
      lastValidationHash,
      isLockedForSignature,
    },
  };

  // Mark step as sent
  await markStepAsSent(workflow.id, stepIndex);

  return generateHTML(packageData);
}

export function downloadFile(content: string, filename: string, mimeType = 'text/html') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseReturnFile(fileContent: string): ReturnFileData | null {
  try {
    const data = JSON.parse(fileContent);
    // Accept both v1 and v2 formats
    if (!data.version || !data.workflowId || !data.stepId) return null;
    // Parse rejectionDetails when present (v2)
    if (data.rejectionDetails && typeof data.rejectionDetails === 'object') {
      data.rejectionDetails = {
        category: data.rejectionDetails.category || 'other',
        reason: data.rejectionDetails.reason || '',
      };
    }
    return data as ReturnFileData;
  } catch {
    return null;
  }
}
