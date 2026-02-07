// ============================================================
// DocJourney — Integrity Service (Hash & Chain Verification)
// ============================================================

import type { IntegrityChain } from '../types/verification.types';
import type { StepResponse, WorkflowStep, SignatureData } from '../types';

// ---- Crypto Utilities ----

export async function sha256(data: string | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;

  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data);
  } else {
    buffer = data;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---- Document Hash ----

/**
 * Calcule le hash SHA-256 d'un document
 */
export async function computeDocumentHash(content: string | Blob): Promise<string> {
  if (content instanceof Blob) {
    const arrayBuffer = await content.arrayBuffer();
    return sha256(arrayBuffer);
  }

  // Si c'est du Base64, décoder d'abord
  if (content.startsWith('data:')) {
    const base64Data = content.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return sha256(bytes.buffer);
  }

  return sha256(content);
}

// ---- Signature Hash ----

/**
 * Calcule le hash d'une signature
 */
export async function computeSignatureHash(signature: SignatureData): Promise<string> {
  const signatureData = JSON.stringify({
    image: signature.image,
    timestamp: signature.timestamp,
    metadata: signature.metadata,
  });
  return sha256(signatureData);
}

// ---- Step Hash ----

/**
 * Calcule le hash d'une étape de workflow
 */
export async function computeStepHash(
  step: WorkflowStep,
  documentHash: string
): Promise<string> {
  const stepData = {
    stepId: step.id,
    order: step.order,
    participantEmail: step.participant.email,
    role: step.role,
    status: step.status,
    documentHash,
  };

  if (step.response) {
    Object.assign(stepData, {
      decision: step.response.decision,
      comment: step.response.generalComment,
      signatureHash: step.response.signature
        ? await computeSignatureHash(step.response.signature)
        : null,
      completedAt: step.response.completedAt,
    });
  }

  return sha256(JSON.stringify(stepData));
}

// ---- Chain Hash ----

/**
 * Calcule le hash cumulatif de la chaîne de validation
 */
export async function computeChainHash(
  documentHash: string,
  previousChainHash: string | null,
  stepResponse: StepResponse | null,
  timestamp: string,
  nonce: string
): Promise<string> {
  const payload = {
    documentHash,
    previousChainHash,
    decision: stepResponse?.decision || null,
    comment: stepResponse?.generalComment || null,
    signatureHash: stepResponse?.signature
      ? await computeSignatureHash(stepResponse.signature)
      : null,
    annotationsCount: stepResponse?.annotations?.length || 0,
    timestamp,
    nonce,
  };

  return sha256(JSON.stringify(payload));
}

/**
 * Crée un objet IntegrityChain complet pour une étape
 */
export async function createIntegrityChain(
  documentHash: string,
  previousChain: IntegrityChain | null,
  step: WorkflowStep
): Promise<IntegrityChain> {
  const timestamp = new Date().toISOString();
  const nonce = generateNonce();

  const currentStepHash = await computeStepHash(step, documentHash);

  const chainHash = await computeChainHash(
    documentHash,
    previousChain?.chainHash || null,
    step.response || null,
    timestamp,
    nonce
  );

  return {
    documentHash,
    previousStepHash: previousChain?.currentStepHash || null,
    currentStepHash,
    chainHash,
    timestamp,
    nonce,
  };
}

// ---- Verification ----

/**
 * Vérifie l'intégrité d'une chaîne de validation
 */
export async function verifyIntegrityChain(
  documentContent: string | Blob,
  steps: WorkflowStep[],
  chains: IntegrityChain[]
): Promise<{
  valid: boolean;
  errors: string[];
  details: {
    documentHashValid: boolean;
    stepHashesValid: boolean[];
    chainHashesValid: boolean[];
  };
}> {
  const errors: string[] = [];

  // 1. Vérifier le hash du document
  const computedDocHash = await computeDocumentHash(documentContent);
  const documentHashValid = chains.length > 0 && chains[0].documentHash === computedDocHash;

  if (!documentHashValid) {
    errors.push('Le hash du document ne correspond pas - le document a peut-être été modifié');
  }

  // 2. Vérifier chaque étape
  const stepHashesValid: boolean[] = [];
  const chainHashesValid: boolean[] = [];

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    const step = steps[i];

    if (!step) {
      errors.push(`Étape ${i + 1} manquante dans le workflow`);
      stepHashesValid.push(false);
      chainHashesValid.push(false);
      continue;
    }

    // Vérifier le hash de l'étape
    const computedStepHash = await computeStepHash(step, chain.documentHash);
    const stepValid = computedStepHash === chain.currentStepHash;
    stepHashesValid.push(stepValid);

    if (!stepValid) {
      errors.push(`Le hash de l'étape ${i + 1} ne correspond pas`);
    }

    // Vérifier le hash de la chaîne
    const previousChainHash = i > 0 ? chains[i - 1].chainHash : null;
    const computedChainHash = await computeChainHash(
      chain.documentHash,
      previousChainHash,
      step.response || null,
      chain.timestamp,
      chain.nonce
    );
    const chainValid = computedChainHash === chain.chainHash;
    chainHashesValid.push(chainValid);

    if (!chainValid) {
      errors.push(`Le hash de la chaîne à l'étape ${i + 1} ne correspond pas`);
    }

    // Vérifier la continuité de la chaîne
    if (i > 0 && chain.previousStepHash !== chains[i - 1].currentStepHash) {
      errors.push(`Rupture de la chaîne entre les étapes ${i} et ${i + 1}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    details: {
      documentHashValid,
      stepHashesValid,
      chainHashesValid,
    },
  };
}

// ---- Submission Hash (Anti double-soumission) ----

/**
 * Calcule le hash d'une soumission pour détecter les doublons
 */
export async function computeSubmissionHash(response: StepResponse): Promise<string> {
  const data = {
    decision: response.decision,
    comment: response.generalComment,
    annotationsCount: response.annotations?.length || 0,
    hasSignature: !!response.signature,
    hasInitials: !!response.initials,
    completedAt: response.completedAt,
  };
  return sha256(JSON.stringify(data));
}

/**
 * Génère une empreinte du navigateur/appareil
 */
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    // Canvas fingerprint simplifié
    (() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillText('DocJourney', 2, 2);
          return canvas.toDataURL().slice(-50);
        }
      } catch {
        return 'no-canvas';
      }
      return 'no-ctx';
    })(),
  ];

  // Retourner un hash simplifié (pas crypto, juste pour fingerprinting)
  return btoa(components.join('|')).slice(0, 32);
}
