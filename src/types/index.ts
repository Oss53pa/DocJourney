// ============================================================
// DocJourney — Data Models
// ============================================================

export type DocumentType =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'image'
  | 'text'
  | 'other';

export type DocumentStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'archived';

export type ParticipantRole =
  | 'reviewer'
  | 'validator'
  | 'approver'
  | 'signer';

export type StepStatus =
  | 'pending'
  | 'sent'
  | 'completed'
  | 'rejected'
  | 'skipped';

export type StepDecision =
  | 'approved'
  | 'rejected'
  | 'validated'
  | 'reviewed'
  | 'modification_requested';

export type RejectionCategory =
  | 'incomplete'
  | 'incorrect'
  | 'non_compliant'
  | 'missing_documents'
  | 'unauthorized'
  | 'other';

export interface RejectionDetails {
  category: RejectionCategory;
  reason: string;
}

export type ActivityType =
  | 'document_imported'
  | 'workflow_created'
  | 'workflow_started'
  | 'package_generated'
  | 'return_imported'
  | 'step_completed'
  | 'workflow_completed'
  | 'workflow_rejected'
  | 'report_generated'
  | 'document_archived'
  | 'template_created'
  | 'template_used'
  | 'template_deleted'
  | 'reminder_sent'
  | 'group_created'
  | 'group_updated'
  | 'group_deleted'
  | 'cloud_exported'
  | 'cloud_connected'
  | 'cloud_disconnected'
  | 'step_skipped'
  | 'step_reassigned';

// ---- Document ----
export interface DocumentMetadata {
  originalName: string;
  extension: string;
  pageCount?: number;
  author?: string;
  description?: string;
  tags?: string[];
  category?: string;
}

export interface DocJourneyDocument {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: string;
  content: string; // Base64
  previewContent?: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  status: DocumentStatus;
  workflowId?: string;
  metadata: DocumentMetadata;
}

// ---- Participant ----
export interface Participant {
  name: string;
  email: string;
  organization?: string;
}

export interface ParticipantRecord {
  id: string;
  name: string;
  email: string;
  organization?: string;
  color: string;
  firstUsed: Date;
  lastUsed: Date;
  totalWorkflows: number;
  roles: ParticipantRole[];
  phone?: string;
  department?: string;
  notes?: string;
  isAbsent?: boolean;
  absenceStart?: Date;
  absenceEnd?: Date;
  substituteEmail?: string;
  isFavorite?: boolean;
}

// ---- Annotation ----
export interface Annotation {
  id: string;
  stepId: string;
  participantName: string;
  participantRole: ParticipantRole;
  type: 'comment' | 'highlight' | 'pin';
  content: string;
  position: {
    page: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  color: string;
  createdAt: Date;
  replyTo?: string;
}

// ---- Signature ----
export interface SignatureData {
  image: string; // Base64 PNG
  timestamp: Date;
  hash: string; // SHA-256
  metadata: {
    participantName: string;
    participantEmail: string;
    userAgent: string;
  };
  position?: { x: number; y: number };       // Position on document (%)
  source?: 'draw' | 'import' | 'saved';      // Signature source
}

// ---- Initials (Paraphe) ----
export interface InitialsData {
  image: string; // Base64 PNG
  timestamp: Date;
  hash: string; // SHA-256
  metadata: {
    participantName: string;
    participantEmail: string;
    userAgent: string;
  };
  applyToAllPages: boolean;                  // Appliquer sur toutes les pages
  position?: { x: number; y: number };       // Position on document (%)
  source?: 'draw' | 'import' | 'saved';      // Initials source
}

// ---- Workflow Step ----
export interface StepResponse {
  decision: StepDecision;
  annotations: Annotation[];
  generalComment?: string;
  signature?: SignatureData;
  initials?: InitialsData;
  rejectionDetails?: RejectionDetails;
  completedAt: Date;
  returnFile: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  participant: Participant;
  role: ParticipantRole;
  status: StepStatus;
  instructions?: string;
  sentAt?: Date;
  completedAt?: Date;
  response?: StepResponse;
  skippedAt?: Date;
  skippedReason?: string;
  reassignedFrom?: Participant;
}

// ---- Workflow ----
export interface Workflow {
  id: string;
  documentId: string;
  name: string;
  steps: WorkflowStep[];
  currentStepIndex: number;
  createdAt: Date;
  completedAt?: Date;
  owner: Participant & { organization?: string };
  deadline?: Date;
  stepDeadlines?: Record<string, Date>;
}

// ---- Validation Report ----
export interface ValidationReport {
  id: string;
  workflowId: string;
  documentId: string;
  reference: string;
  generatedAt: Date;
  content: string; // PDF Base64
}

// ---- Activity Log ----
export interface ActivityEntry {
  id: string;
  timestamp: Date;
  type: ActivityType;
  documentId?: string;
  workflowId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ---- Firebase Sync Configuration ----
export interface FirebaseSyncConfig {
  enabled: boolean;
  apiKey: string;
  databaseURL: string;
  projectId: string;
}

// ---- Settings ----
export interface AppSettings {
  id: string;
  ownerName: string;
  ownerEmail: string;
  ownerOrganization?: string;
  defaultInstructions?: string;
  theme: 'light';
  remindersEnabled?: boolean;
  defaultDeadlineDays?: number;
  reminderAdvanceDays?: number;
  browserNotificationsEnabled?: boolean;
  // EmailJS settings
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  // Onboarding
  onboardingCompleted?: boolean;
  // Auto-backup settings
  autoBackupEnabled?: boolean;
  autoBackupFrequency?: 'daily' | 'weekly' | 'monthly';
  lastAutoBackup?: Date;
  backupFolderName?: string; // Display name of selected folder
  // Firebase sync settings
  firebaseSyncEnabled?: boolean;
  firebaseApiKey?: string;
  firebaseDatabaseURL?: string;
  firebaseProjectId?: string;
}

// ---- Package Data (for HTML export) ----
export interface PreviousStepSummary {
  stepNumber: number;
  participant: Participant & { organization?: string };
  role: ParticipantRole;
  completedAt: Date;
  decision: StepDecision;
  generalComment?: string;
  annotationCount: number;
  annotations: Annotation[];
  color: string;
}

// ---- Package Sync Configuration (embedded in HTML) ----
export interface PackageSyncConfig {
  enabled: boolean;
  channelId: string;  // SHA-256 hash of owner email
  firebaseConfig: {
    apiKey: string;
    databaseURL: string;
    projectId: string;
  };
}

export interface PackageData {
  version: string;
  packageId: string;
  generatedAt: Date;
  document: {
    id: string;
    name: string;
    type: DocumentType;
    content: string;
    previewContent?: string;
  };
  workflow: {
    id: string;
    totalSteps: number;
    currentStepIndex: number;
  };
  currentStep: {
    id: string;
    order: number;
    participant: Participant;
    role: ParticipantRole;
    instructions?: string;
  };
  owner: Participant & { organization?: string };
  previousSteps: PreviousStepSummary[];
  allAnnotations: Annotation[];
  nextStep?: { participant: Participant; role: ParticipantRole };
  security: {
    documentHash: string;
    chainHash: string;
    lastValidationHash?: string;  // Hash après la dernière validation (avant signature)
    isLockedForSignature?: boolean;  // Document verrouillé pour signature
  };
  sync?: PackageSyncConfig;  // Firebase sync configuration
}

// ---- Return file format ----
export interface ReturnFileData {
  version: string;
  packageId: string;
  workflowId: string;
  stepId: string;
  documentId: string;
  participant: Participant;
  decision: StepDecision;
  rejectionDetails?: RejectionDetails;
  generalComment?: string;
  annotations: Annotation[];
  signature?: SignatureData;
  initials?: InitialsData;
  completedAt: Date;
  documentHash: string;
}

// ---- Workflow Template ----
export interface WorkflowTemplateStep {
  role: ParticipantRole;
  participantName?: string;
  participantEmail?: string;
  participantOrganization?: string;
  instructions?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowTemplateStep[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

// ---- Reminders ----
export type ReminderType = 'deadline_approaching' | 'deadline_passed' | 'step_waiting';

export type ReminderStatus = 'pending' | 'sent' | 'dismissed';

export interface Reminder {
  id: string;
  documentId: string;
  workflowId: string;
  stepId?: string;
  type: ReminderType;
  scheduledAt: Date;
  status: ReminderStatus;
  message: string;
  sentAt?: Date;
}

// ---- Document Groups ----
export interface DocumentGroup {
  id: string;
  name: string;
  description?: string;
  documentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ---- Participant Groups ----
export interface ParticipantGroup {
  id: string;
  name: string;
  description?: string;
  memberEmails: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ---- Blocked Workflow (computed, not stored) ----
export interface BlockedWorkflowInfo {
  workflowId: string;
  documentId: string;
  documentName: string;
  workflowName: string;
  blockedStepIndex: number;
  blockedParticipant: Participant;
  blockedSince: Date;
  reason: 'absent' | 'overdue' | 'no_response';
  substituteAvailable?: Participant;
}

// ---- Cloud Export ----
export type CloudProvider = 'google_drive' | 'dropbox';

export interface CloudConnection {
  id: string;
  provider: CloudProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  userEmail?: string;
  userName?: string;
  connectedAt: Date;
}
