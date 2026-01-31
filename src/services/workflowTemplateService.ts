import { db } from '../db';
import { generateId } from '../utils';
import { logActivity } from './activityService';
import type { WorkflowTemplate, WorkflowTemplateStep, Workflow } from '../types';

export async function createTemplate(
  name: string,
  steps: WorkflowTemplateStep[],
  description?: string
): Promise<WorkflowTemplate> {
  const template: WorkflowTemplate = {
    id: generateId(),
    name,
    description,
    steps,
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  };
  await db.workflowTemplates.add(template);
  await logActivity('template_created', `Modèle créé : ${name}`);
  return template;
}

export async function getAllTemplates(): Promise<WorkflowTemplate[]> {
  return db.workflowTemplates.orderBy('createdAt').reverse().toArray();
}

export async function getTemplate(id: string): Promise<WorkflowTemplate | undefined> {
  return db.workflowTemplates.get(id);
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<WorkflowTemplate, 'name' | 'description' | 'steps'>>
): Promise<void> {
  await db.workflowTemplates.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteTemplate(id: string): Promise<void> {
  const template = await db.workflowTemplates.get(id);
  await db.workflowTemplates.delete(id);
  if (template) {
    await logActivity('template_deleted', `Modèle supprimé : ${template.name}`);
  }
}

export async function incrementUsage(id: string): Promise<void> {
  const template = await db.workflowTemplates.get(id);
  if (template) {
    await db.workflowTemplates.update(id, {
      usageCount: template.usageCount + 1,
      updatedAt: new Date(),
    });
    await logActivity('template_used', `Modèle utilisé : ${template.name}`);
  }
}

export async function saveCurrentAsTemplate(
  workflow: Workflow,
  templateName: string,
  description?: string
): Promise<WorkflowTemplate> {
  const steps: WorkflowTemplateStep[] = workflow.steps.map(s => ({
    role: s.role,
    participantName: s.participant.name,
    participantEmail: s.participant.email,
    participantOrganization: s.participant.organization,
    instructions: s.instructions,
  }));
  return createTemplate(templateName, steps, description);
}
