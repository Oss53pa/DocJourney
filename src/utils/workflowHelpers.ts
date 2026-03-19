import type { ParticipantRole, WorkflowTemplate } from '../types';
import { incrementUsage, saveCurrentAsTemplate } from '../services/workflowTemplateService';

export interface StepFormData {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: ParticipantRole;
  instructions: string;
}

export const emptyStep = (): StepFormData => ({
  id: crypto.randomUUID(),
  name: '', email: '', organization: '', role: 'reviewer', instructions: '',
});

/**
 * Applique un modèle de workflow en convertissant ses étapes en StepFormData.
 */
export async function applyTemplate(
  templateId: string,
  templates: WorkflowTemplate[],
): Promise<StepFormData[] | null> {
  if (!templateId) return null;
  const template = templates.find(t => t.id === templateId);
  if (!template) return null;
  const newSteps: StepFormData[] = template.steps.map(s => ({
    id: crypto.randomUUID(),
    name: s.participantName || '',
    email: s.participantEmail || '',
    organization: s.participantOrganization || '',
    role: s.role,
    instructions: s.instructions || '',
  }));
  await incrementUsage(templateId);
  return newSteps;
}

/**
 * Sauvegarde les étapes courantes comme modèle de workflow.
 */
export async function saveStepsAsTemplate(
  steps: StepFormData[],
  templateName: string,
): Promise<void> {
  if (!templateName.trim()) return;
  await saveCurrentAsTemplate(
    {
      steps: steps.map((s, i) => ({
        id: s.id,
        order: i + 1,
        participant: { name: s.name, email: s.email, organization: s.organization || undefined },
        role: s.role as ParticipantRole,
        status: 'pending' as const,
        instructions: s.instructions || undefined,
      })),
    } as Parameters<typeof saveCurrentAsTemplate>[0],
    templateName,
  );
}
