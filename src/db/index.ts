import Dexie, { type Table } from 'dexie';
import type {
  DocJourneyDocument,
  Workflow,
  ValidationReport,
  ParticipantRecord,
  ActivityEntry,
  AppSettings,
  WorkflowTemplate,
  Reminder,
  DocumentGroup,
  CloudConnection,
  ParticipantGroup,
} from '../types';

export class DocJourneyDB extends Dexie {
  documents!: Table<DocJourneyDocument, string>;
  workflows!: Table<Workflow, string>;
  validationReports!: Table<ValidationReport, string>;
  participants!: Table<ParticipantRecord, string>;
  activityLog!: Table<ActivityEntry, string>;
  settings!: Table<AppSettings, string>;
  workflowTemplates!: Table<WorkflowTemplate, string>;
  reminders!: Table<Reminder, string>;
  documentGroups!: Table<DocumentGroup, string>;
  cloudConnections!: Table<CloudConnection, string>;
  participantGroups!: Table<ParticipantGroup, string>;

  constructor() {
    super('DocJourneyDB');

    this.version(1).stores({
      documents: 'id, name, type, status, workflowId, createdAt, updatedAt',
      workflows: 'id, documentId, currentStepIndex, createdAt',
      validationReports: 'id, workflowId, documentId, generatedAt',
      participants: 'id, email, name',
      activityLog: 'id, timestamp, type, documentId, workflowId',
      settings: 'id',
    });

    this.version(2).stores({
      documents: 'id, name, type, status, workflowId, createdAt, updatedAt',
      workflows: 'id, documentId, currentStepIndex, createdAt',
      validationReports: 'id, workflowId, documentId, generatedAt',
      participants: 'id, email, name',
      activityLog: 'id, timestamp, type, documentId, workflowId',
      settings: 'id',
      workflowTemplates: 'id, name, createdAt, usageCount',
      reminders: 'id, documentId, workflowId, stepId, type, scheduledAt, status',
      documentGroups: 'id, name, createdAt, updatedAt',
      cloudConnections: 'id, provider, connectedAt',
    });

    this.version(3).stores({
      documents: 'id, name, type, status, workflowId, createdAt, updatedAt',
      workflows: 'id, documentId, currentStepIndex, createdAt',
      validationReports: 'id, workflowId, documentId, generatedAt',
      participants: 'id, email, name',
      activityLog: 'id, timestamp, type, documentId, workflowId',
      settings: 'id',
      workflowTemplates: 'id, name, createdAt, usageCount',
      reminders: 'id, documentId, workflowId, stepId, type, scheduledAt, status',
      documentGroups: 'id, name, createdAt, updatedAt',
      cloudConnections: 'id, provider, connectedAt',
      participantGroups: 'id, name, createdAt',
    });
  }
}

export const db = new DocJourneyDB();

// Initialize default settings + seed templates if not present
export async function initializeDB() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      id: 'default',
      ownerName: '',
      ownerEmail: '',
      ownerOrganization: '',
      theme: 'light',
      // EmailJS configuration (préconfigurée)
      emailjsServiceId: 'service_fptbtnx',
      emailjsTemplateId: 'template_ih65oh8',
      emailjsPublicKey: 'UqTT-gaCEOyELzhy_',
    });
  } else {
    // Migration: ajouter les valeurs EmailJS si elles n'existent pas
    const existingSettings = await db.settings.get('default');
    if (existingSettings && !existingSettings.emailjsServiceId) {
      await db.settings.update('default', {
        emailjsServiceId: 'service_fptbtnx',
        emailjsTemplateId: 'template_ih65oh8',
        emailjsPublicKey: 'UqTT-gaCEOyELzhy_',
      });
    }
  }

  // Seed default workflow templates
  const templateCount = await db.workflowTemplates.count();
  if (templateCount === 0) {
    const { v4: uuid } = await import('uuid');
    const now = new Date();

    await db.workflowTemplates.bulkAdd([
      {
        id: uuid(),
        name: 'Circuit de signature',
        description: 'Relecture puis signature électronique du document.',
        steps: [
          { role: 'reviewer', instructions: 'Relisez le document et annotez les points à corriger.' },
          { role: 'signer', instructions: 'Apposez votre signature électronique pour approbation finale.' },
        ],
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
      },
      {
        id: uuid(),
        name: 'Validation simple',
        description: 'Relecture suivie d\'une validation.',
        steps: [
          { role: 'reviewer', instructions: 'Annotez les éléments nécessitant des corrections.' },
          { role: 'validator', instructions: 'Validez la conformité du document.' },
        ],
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
      },
      {
        id: uuid(),
        name: 'Validation complète avec signature',
        description: 'Circuit complet : relecture, validation, approbation et signature.',
        steps: [
          { role: 'reviewer', instructions: 'Annotez les sections nécessitant des corrections.' },
          { role: 'validator', instructions: 'Validez la conformité du document.' },
          { role: 'approver', instructions: 'Approuvez le document.' },
          { role: 'signer', instructions: 'Apposez votre signature électronique pour finaliser.' },
        ],
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
      },
    ]);
  }
}
