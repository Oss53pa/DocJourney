import type { ParticipantRole } from '../types';

export const ROLES: { value: ParticipantRole; label: string; desc: string }[] = [
  { value: 'reviewer', label: 'Annotateur', desc: 'Annote et commente' },
  { value: 'validator', label: 'Validateur', desc: 'Valide ou rejette' },
  { value: 'approver', label: 'Approbateur', desc: 'Approbation finale' },
  { value: 'signer', label: 'Signataire', desc: 'Appose sa signature' },
];

export const MAX_WORKFLOW_STEPS = 10;

export const DEFAULT_SETTINGS_ID = 'default';

export const PAGE_SIZE = 20;
