// ============================================================
// DocJourney — Verification Types (OTP & Security)
// ============================================================

export interface ParticipantVerification {
  code: string;                    // Hash SHA-256 du code OTP (jamais le code en clair)
  salt: string;                    // Salt pour le hash
  recipientEmail: string;
  recipientPhone?: string;         // Optionnel pour SMS futur
  createdAt: Date;
  expiresAt: Date;                 // Expiration 24h par défaut
  attempts: number;                // Max 3 tentatives
  maxAttempts: number;             // Limite configurable
  verified: boolean;
  verifiedAt?: Date;
  method: 'email' | 'sms';
  blocked: boolean;                // Bloqué après trop de tentatives
  blockedAt?: Date;
}

export interface OTPGenerationResult {
  code: string;                    // Code en clair (à envoyer par email)
  hashedCode: string;              // Hash pour stockage
  salt: string;
  expiresAt: Date;
}

export interface OTPVerificationResult {
  valid: boolean;
  reason?: 'SUCCESS' | 'INVALID_CODE' | 'EXPIRED' | 'BLOCKED' | 'ALREADY_VERIFIED' | 'NOT_FOUND';
  remainingAttempts?: number;
}

export interface PacketExpiration {
  createdAt: Date;
  expiresAt: Date;
  extensionCount: number;          // Nombre de prolongations effectuées
  maxExtensions: number;           // Max 2 par défaut
  lastExtendedAt?: Date;
  extensionRequestedAt?: Date;     // Demande de prolongation en attente
}

export interface SubmissionRecord {
  stepId: string;
  submittedAt: Date;
  submissionHash: string;          // Hash de la réponse pour détecter les doublons
  deviceFingerprint: string;       // Empreinte du navigateur
  userAgent: string;
  processed: boolean;
}

export interface IntegrityChain {
  documentHash: string;            // Hash SHA-256 du document original
  previousStepHash: string | null; // Hash de l'étape précédente
  currentStepHash: string;         // Hash de cette étape
  chainHash: string;               // Hash cumulatif de toute la chaîne
  timestamp: string;               // ISO 8601
  nonce: string;                   // Pour éviter les collisions
}

export interface ReadReceipt {
  stepId: string;
  recipientEmail: string;
  openedAt: Date;
  userAgent: string;
  ipAddress?: string;
}

// Settings pour la sécurité des workflows
export interface WorkflowSecuritySettings {
  otpEnabled: boolean;
  otpExpirationHours: number;      // 24h par défaut
  otpMaxAttempts: number;          // 3 par défaut
  packetExpirationDays: 7 | 14 | 30;
  allowPacketExtension: boolean;
  maxPacketExtensions: number;     // 2 par défaut
  requireReadReceipt: boolean;
}

// Valeurs par défaut
export const DEFAULT_SECURITY_SETTINGS: WorkflowSecuritySettings = {
  otpEnabled: true,
  otpExpirationHours: 24,
  otpMaxAttempts: 3,
  packetExpirationDays: 14,
  allowPacketExtension: true,
  maxPacketExtensions: 2,
  requireReadReceipt: true,
};
