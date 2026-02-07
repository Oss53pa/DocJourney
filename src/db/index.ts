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
  DocumentRetention,
  AuthorizedDomain,
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
  documentRetention!: Table<DocumentRetention, string>;
  authorizedDomains!: Table<AuthorizedDomain, string>;

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

    this.version(4).stores({
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
      documentRetention: 'id, documentId, scheduledDeletionAt, isProtected, cloudBackupStatus',
    });

    this.version(5).stores({
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
      documentRetention: 'id, documentId, scheduledDeletionAt, isProtected, cloudBackupStatus',
      authorizedDomains: 'id, domain, isActive, createdAt',
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
      // Firebase Sync configuration (préconfigurée)
      firebaseSyncEnabled: true,
      firebaseApiKey: 'AIzaSyCLgse5mcDpFGLAG4eJf9HVqyd-1Uxvprw',
      firebaseDatabaseURL: 'https://docjourney-default-rtdb.europe-west1.firebasedatabase.app',
      firebaseProjectId: 'docjourney',
    });
  } else {
    // Migration: ajouter les valeurs manquantes
    const existingSettings = await db.settings.get('default');
    if (existingSettings) {
      const updates: Partial<AppSettings> = {};

      // Migration EmailJS
      if (!existingSettings.emailjsServiceId) {
        updates.emailjsServiceId = 'service_fptbtnx';
        updates.emailjsTemplateId = 'template_ih65oh8';
        updates.emailjsPublicKey = 'UqTT-gaCEOyELzhy_';
      }

      // Migration Retention
      if (existingSettings.retentionEnabled === undefined) {
        updates.retentionEnabled = true;
        updates.retentionDays = 7;
        updates.retentionMode = 'content_only';
        updates.retentionNotifyBeforeDeletion = true;
        updates.retentionNotifyDaysBefore = 2;
        updates.retentionAutoBackupToCloud = true;
        updates.retentionExcludeStatuses = [];
      }

      // Migration Domain whitelist
      if (existingSettings.defaultAllowSubdomains === undefined) {
        updates.defaultAllowSubdomains = true;
        updates.domainCaseSensitive = false;
      }

      // Migration Firebase Sync
      if (existingSettings.firebaseSyncEnabled === undefined) {
        updates.firebaseSyncEnabled = true;
        updates.firebaseApiKey = 'AIzaSyCLgse5mcDpFGLAG4eJf9HVqyd-1Uxvprw';
        updates.firebaseDatabaseURL = 'https://docjourney-default-rtdb.europe-west1.firebasedatabase.app';
        updates.firebaseProjectId = 'docjourney';
      }

      if (Object.keys(updates).length > 0) {
        await db.settings.update('default', updates);
      }
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

  // Seed default authorized domains
  const domainCount = await db.authorizedDomains.count();
  if (domainCount === 0) {
    const { v4: uuid } = await import('uuid');
    const now = new Date();
    const defaultDomains: { domain: string; description: string }[] = [
      { domain: 'cosmos-yopougon.com', description: 'Cosmos Yopougon' },
      { domain: 'cosmos-angre.com', description: 'Cosmos Angré' },
      { domain: 'interbat.com', description: 'Interbat' },
      { domain: 'rocklanecapital.com', description: 'Rocklane Capital' },
      { domain: 'praedium-tech.com', description: 'Praedium Tech' },
    ];
    await db.authorizedDomains.bulkAdd(
      defaultDomains.map(d => ({
        id: uuid(),
        domain: d.domain,
        description: d.description,
        allowSubdomains: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  // Clean up corrupted activity entries (where description is an object instead of string)
  const allActivity = await db.activityLog.toArray();
  const corruptedIds = allActivity
    .filter(a => typeof a.description !== 'string')
    .map(a => a.id);
  if (corruptedIds.length > 0) {
    console.warn('Cleaning up', corruptedIds.length, 'corrupted activity entries');
    await db.activityLog.bulkDelete(corruptedIds);
  }
}
