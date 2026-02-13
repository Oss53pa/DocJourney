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

export function generateReceiptPreview(): string {
  const workflow = buildCompletedWorkflow();
  const step = workflow.steps[1]; // Sophie Lefèvre - Validator
  const docRef = `DJ-${mockDocument.id.substring(0, 8).toUpperCase()}`;

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const roleLabels: Record<string, string> = {
    reviewer: 'Annotateur',
    validator: 'Validateur',
    approver: 'Approbateur',
    signer: 'Signataire',
  };

  const decisionLabels: Record<string, string> = {
    reviewed: 'Annoté',
    validated: 'Validé',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    modification_requested: 'Modification demandée',
  };

  const decision = step.response?.decision || 'validated';
  const isPositive = decision !== 'rejected';
  const statusColor = isPositive ? '#059669' : '#dc2626';
  const statusBg = isPositive ? '#ecfdf5' : '#fef2f2';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reçu de participation - DocJourney</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500&family=Grand+Hotel&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Exo 2',system-ui,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

  <!-- Header -->
  <div style="background:#1a1a1a;padding:32px 40px;text-align:center">
    <h1 style="font-family:'Grand Hotel',cursive;font-size:36px;color:#ffffff;margin:0;font-weight:400">DocJourney</h1>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:8px 0 0;letter-spacing:3px;text-transform:uppercase">Reçu de participation</p>
  </div>

  <!-- Status Banner -->
  <div style="background:${statusBg};padding:16px 40px;text-align:center;border-bottom:1px solid ${statusColor}20">
    <span style="display:inline-block;background:${statusColor};color:#fff;font-size:12px;font-weight:500;padding:6px 16px;border-radius:20px;letter-spacing:0.5px">${decisionLabels[decision]?.toUpperCase() || 'TRAITÉ'}</span>
  </div>

  <!-- Content -->
  <div style="padding:32px 40px">

    <!-- Thank you message -->
    <p style="font-size:15px;color:#1a1a1a;margin:0 0 24px;line-height:1.6">
      Bonjour <strong>${step.participant.name}</strong>,
    </p>
    <p style="font-size:14px;color:#525252;margin:0 0 28px;line-height:1.7">
      Nous vous remercions pour votre participation au circuit de validation. Votre contribution a bien été enregistrée.
    </p>

    <!-- Receipt Details -->
    <div style="background:#fafafa;border-radius:12px;padding:24px;margin:0 0 28px">
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px">
        <tr>
          <td style="color:#737373;padding:6px 0;width:120px">Document</td>
          <td style="color:#1a1a1a;padding:6px 0;font-weight:500">${mockDocument.name}</td>
        </tr>
        <tr>
          <td style="color:#737373;padding:6px 0">Référence</td>
          <td style="color:#1a1a1a;padding:6px 0">${docRef}</td>
        </tr>
        <tr>
          <td style="color:#737373;padding:6px 0">Votre rôle</td>
          <td style="color:#1a1a1a;padding:6px 0">${roleLabels[step.role] || step.role}</td>
        </tr>
        <tr>
          <td style="color:#737373;padding:6px 0">Décision</td>
          <td style="color:${statusColor};padding:6px 0;font-weight:500">${decisionLabels[decision] || decision}</td>
        </tr>
        <tr>
          <td style="color:#737373;padding:6px 0">Date</td>
          <td style="color:#1a1a1a;padding:6px 0">${formatDate(step.completedAt || new Date())}</td>
        </tr>
      </table>
    </div>

    ${step.response?.generalComment ? `
    <!-- Comment -->
    <div style="border-left:3px solid #e5e5e5;padding-left:16px;margin:0 0 28px">
      <p style="font-size:12px;color:#737373;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Votre commentaire</p>
      <p style="font-size:13px;color:#404040;margin:0;line-height:1.6;font-style:italic">"${step.response.generalComment}"</p>
    </div>
    ` : ''}

    <!-- Initiator Info -->
    <div style="background:#f5f5f5;border-radius:8px;padding:16px;text-align:center">
      <p style="font-size:12px;color:#737373;margin:0 0 4px">Initié par</p>
      <p style="font-size:14px;color:#1a1a1a;margin:0;font-weight:500">${owner.name}</p>
      <p style="font-size:12px;color:#737373;margin:2px 0 0">${owner.organization || ''}</p>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #e5e5e5">
    <p style="font-size:11px;color:#a3a3a3;margin:0">
      Ce reçu a été généré automatiquement par <strong>DocJourney</strong>
    </p>
    <p style="font-size:10px;color:#d4d4d4;margin:6px 0 0">
      Application de validation documentaire
    </p>
  </div>

</div>
</body>
</html>
  `.trim();
}
