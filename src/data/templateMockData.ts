import type {
  Workflow,
  DocJourneyDocument,
  WorkflowStep,
  Participant,
  PackageData,
  Annotation,
  PreviousStepSummary,
} from '../types';
import { generateId, getParticipantColor } from '../utils';
import { generateEmailTemplate } from '../services/emailService';
import { generateHTML } from '../services/packageHtml';
import { renderReportPDF } from '../services/reportService';

// ---- Mock Participants ----

const owner: Participant & { organization?: string } = {
  name: 'Marie Dupont',
  email: 'marie.dupont@qualipro.fr',
  organization: 'QualiPro',
};

const participants: Participant[] = [
  { name: 'Jean-Pierre Martin', email: 'jp.martin@qualipro.fr' },
  { name: 'Sophie Lefèvre', email: 'sophie.lefevre@qualipro.fr' },
  { name: 'Ahmed Benali', email: 'ahmed.benali@qualipro.fr' },
];

// ---- Mock Document ----

const mockDocContent = btoa(
  `PROCEDURE QUALITE - Version 2.1
========================================

1. OBJET
Cette procedure definit les regles de gestion de la qualite
applicables a l'ensemble des projets de l'entreprise QualiPro.

2. DOMAINE D'APPLICATION
La presente procedure s'applique a toutes les activites de
conception, developpement, production et livraison de services.

3. RESPONSABILITES
- Le Responsable Qualite supervise l'application de cette procedure.
- Les Chefs de Projet veillent au respect des exigences qualite.
- Chaque collaborateur est acteur de la demarche qualite.

4. PROCESSUS DE VALIDATION
4.1 Tout document qualite doit etre soumis a un circuit de validation.
4.2 Le circuit comprend au minimum : annotation, validation, signature.
4.3 Les decisions sont tracees et archivees dans le systeme DocJourney.

5. INDICATEURS
- Taux de conformite des livrables : objectif > 95%
- Delai moyen de validation : objectif < 5 jours ouvres
- Nombre de non-conformites par trimestre

6. REVISIONS
Version 2.1 - Mise a jour des indicateurs de performance.
Version 2.0 - Refonte complete du processus de validation.
Version 1.0 - Creation initiale du document.

========================================
Document confidentiel - QualiPro 2025
`
);

const mockDocId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const mockWorkflowId = 'w1f2k3l4-m5n6-7890-opqr-st1234567890';

const mockDocument: DocJourneyDocument = {
  id: mockDocId,
  name: 'Procédure_Qualité_v2.1.pdf',
  type: 'text',
  mimeType: 'text/plain',
  content: mockDocContent,
  size: 1240,
  createdAt: new Date('2025-01-10T09:00:00'),
  updatedAt: new Date('2025-01-15T14:30:00'),
  status: 'in_progress',
  workflowId: mockWorkflowId,
  metadata: {
    originalName: 'Procédure_Qualité_v2.1.pdf',
    extension: 'pdf',
    category: 'Qualité',
    description: 'Procédure qualité principale de QualiPro',
  },
};

// ---- Mock Annotations ----

const mockAnnotations: Annotation[] = [
  {
    id: generateId(),
    stepId: 'step-0',
    participantName: 'Jean-Pierre Martin',
    participantRole: 'reviewer',
    type: 'comment',
    content: 'La section 4.2 devrait mentionner explicitement le rôle de l\'approbateur.',
    position: { page: 1, x: 100, y: 350 },
    color: getParticipantColor(0),
    createdAt: new Date('2025-01-12T10:15:00'),
  },
  {
    id: generateId(),
    stepId: 'step-0',
    participantName: 'Jean-Pierre Martin',
    participantRole: 'reviewer',
    type: 'highlight',
    content: 'Objectif de 95% à vérifier avec les données du dernier trimestre.',
    position: { page: 1, x: 50, y: 480 },
    color: getParticipantColor(0),
    createdAt: new Date('2025-01-12T10:20:00'),
  },
];

// ---- Workflow in progress (for email + package preview) ----

function buildInProgressWorkflow(): Workflow {
  const steps: WorkflowStep[] = [
    {
      id: 'step-0',
      order: 1,
      participant: participants[0],
      role: 'reviewer',
      status: 'completed',
      instructions: 'Veuillez annoter les sections nécessitant des corrections.',
      sentAt: new Date('2025-01-11T08:00:00'),
      completedAt: new Date('2025-01-12T10:30:00'),
      response: {
        decision: 'reviewed',
        annotations: mockAnnotations,
        generalComment: 'Document bien structuré, quelques points à clarifier en section 4.',
        completedAt: new Date('2025-01-12T10:30:00'),
        returnFile: '',
      },
    },
    {
      id: 'step-1',
      order: 2,
      participant: participants[1],
      role: 'validator',
      status: 'sent',
      instructions: 'Validez la conformité du document avec les normes ISO 9001.',
      sentAt: new Date('2025-01-13T09:00:00'),
    },
    {
      id: 'step-2',
      order: 3,
      participant: participants[2],
      role: 'signer',
      status: 'pending',
      instructions: 'Signez le document pour approbation finale.',
    },
  ];

  return {
    id: mockWorkflowId,
    documentId: mockDocId,
    name: 'Validation Procédure Qualité v2.1',
    steps,
    currentStepIndex: 1,
    createdAt: new Date('2025-01-10T09:00:00'),
    owner,
  };
}

// ---- Completed workflow (for report preview) ----

function buildCompletedWorkflow(): Workflow {
  const steps: WorkflowStep[] = [
    {
      id: 'step-0',
      order: 1,
      participant: participants[0],
      role: 'reviewer',
      status: 'completed',
      instructions: 'Veuillez annoter les sections nécessitant des corrections.',
      sentAt: new Date('2025-01-11T08:00:00'),
      completedAt: new Date('2025-01-12T10:30:00'),
      response: {
        decision: 'reviewed',
        annotations: mockAnnotations,
        generalComment: 'Document bien structuré, quelques points à clarifier en section 4.',
        completedAt: new Date('2025-01-12T10:30:00'),
        returnFile: '',
      },
    },
    {
      id: 'step-1',
      order: 2,
      participant: participants[1],
      role: 'validator',
      status: 'completed',
      instructions: 'Validez la conformité du document avec les normes ISO 9001.',
      sentAt: new Date('2025-01-13T09:00:00'),
      completedAt: new Date('2025-01-14T16:45:00'),
      response: {
        decision: 'validated',
        annotations: [
          {
            id: generateId(),
            stepId: 'step-1',
            participantName: 'Sophie Lefèvre',
            participantRole: 'validator',
            type: 'comment',
            content: 'Conforme aux exigences ISO 9001:2015. Approuvé sans réserve.',
            position: { page: 1, x: 50, y: 100 },
            color: getParticipantColor(1),
            createdAt: new Date('2025-01-14T16:40:00'),
          },
        ],
        generalComment: 'Document conforme aux normes en vigueur. Validation accordée.',
        completedAt: new Date('2025-01-14T16:45:00'),
        returnFile: '',
      },
    },
    {
      id: 'step-2',
      order: 3,
      participant: participants[2],
      role: 'signer',
      status: 'completed',
      instructions: 'Signez le document pour approbation finale.',
      sentAt: new Date('2025-01-15T08:00:00'),
      completedAt: new Date('2025-01-15T14:30:00'),
      response: {
        decision: 'approved',
        annotations: [],
        generalComment: 'Document approuvé et signé. Mise en application immédiate.',
        completedAt: new Date('2025-01-15T14:30:00'),
        returnFile: '',
      },
    },
  ];

  return {
    id: mockWorkflowId,
    documentId: mockDocId,
    name: 'Validation Procédure Qualité v2.1',
    steps,
    currentStepIndex: 3,
    createdAt: new Date('2025-01-10T09:00:00'),
    completedAt: new Date('2025-01-15T14:30:00'),
    owner,
  };
}

// ---- Preview generators ----

export function generateEmailPreview(): string {
  const workflow = buildInProgressWorkflow();
  return generateEmailTemplate(mockDocument, workflow, 1);
}

export function generatePackagePreview(): string {
  const workflow = buildInProgressWorkflow();
  const stepIndex = 1;
  const step = workflow.steps[stepIndex];

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

  const allAnnotations: Annotation[] = [];
  for (let i = 0; i < stepIndex; i++) {
    const s = workflow.steps[i];
    if (s.response) {
      allAnnotations.push(...s.response.annotations);
    }
  }

  const packageData: PackageData = {
    version: '1.0.0',
    packageId: generateId(),
    generatedAt: new Date(),
    document: {
      id: mockDocument.id,
      name: mockDocument.name,
      type: mockDocument.type,
      content: mockDocument.content,
      previewContent: mockDocument.previewContent,
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
    security: {
      documentHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6abcd',
      chainHash: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1dcba',
    },
  };

  return generateHTML(packageData);
}

export function generateSignaturePackagePreview(): string {
  const workflow = buildCompletedWorkflow();
  // Simulate step 2 (signer) as the current step, with steps 0 & 1 already completed
  const stepIndex = 2;
  const step = workflow.steps[stepIndex];

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

  const allAnnotations: Annotation[] = [];
  for (let i = 0; i < stepIndex; i++) {
    const s = workflow.steps[i];
    if (s.response) {
      allAnnotations.push(...s.response.annotations);
    }
  }

  const packageData: PackageData = {
    version: '1.0.0',
    packageId: generateId(),
    generatedAt: new Date(),
    document: {
      id: mockDocument.id,
      name: mockDocument.name,
      type: mockDocument.type,
      content: mockDocument.content,
      previewContent: mockDocument.previewContent,
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
      role: 'signer',
      instructions: step.instructions,
    },
    owner: workflow.owner,
    previousSteps,
    allAnnotations,
    security: {
      documentHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6abcd',
      chainHash: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1dcba',
    },
  };

  return generateHTML(packageData);
}

export function generateReportPreview(): string {
  const workflow = buildCompletedWorkflow();
  const doc: DocJourneyDocument = {
    ...mockDocument,
    status: 'completed',
  };
  return renderReportPDF(workflow, doc);
}
