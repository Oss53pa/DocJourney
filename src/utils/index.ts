import { v4 as uuidv4 } from 'uuid';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DocumentType, ParticipantRole, StepStatus, DocumentStatus, StepDecision, RejectionCategory } from '../types';

export function generateId(): string {
  return uuidv4();
}

export function generateReference(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `DJ-${year}-${num}`;
}

export function generateCRVReference(docRef: string): string {
  return `CRV-${docRef}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy à HH:mm', { locale: fr });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: fr });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function formatRelativeTimeShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return format(d, 'dd/MM', { locale: fr });
}

export function formatDuration(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  const diff = e.getTime() - s.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function getDocumentType(filename: string): DocumentType {
  const ext = getFileExtension(filename);
  const map: Record<string, DocumentType> = {
    pdf: 'pdf',
    doc: 'word',
    docx: 'word',
    xls: 'excel',
    xlsx: 'excel',
    ppt: 'powerpoint',
    pptx: 'powerpoint',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
    txt: 'text',
    csv: 'text',
    md: 'text',
  };
  return map[ext] || 'other';
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
    md: 'text/markdown',
  };
  return map[ext] || 'application/octet-stream';
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:... prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getRoleLabel(role: ParticipantRole): string {
  const labels: Record<ParticipantRole, string> = {
    reviewer: 'Annotateur',
    validator: 'Validateur',
    approver: 'Approbateur',
    signer: 'Signataire',
  };
  return labels[role];
}

export function getRoleAction(role: ParticipantRole): string {
  const labels: Record<ParticipantRole, string> = {
    reviewer: 'Annotation',
    validator: 'Validation',
    approver: 'Approbation',
    signer: 'Signature',
  };
  return labels[role];
}

export function getStepStatusLabel(status: StepStatus): string {
  const labels: Record<StepStatus, string> = {
    pending: 'En attente',
    sent: 'Envoyé',
    completed: 'Terminé',
    rejected: 'Rejeté',
    skipped: 'Passée',
  };
  return labels[status];
}

export function getDocumentStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    draft: 'Brouillon',
    in_progress: 'En cours',
    completed: 'Terminé',
    rejected: 'Rejeté',
    archived: 'Archivé',
  };
  return labels[status];
}

export function getDecisionLabel(decision: StepDecision): string {
  const labels: Record<StepDecision, string> = {
    approved: 'Approuvé',
    rejected: 'Rejeté',
    validated: 'Validé',
    reviewed: 'Annoté',
    modification_requested: 'Modification demandée',
  };
  return labels[decision];
}

export function getRejectionCategoryLabel(category: RejectionCategory): string {
  const labels: Record<RejectionCategory, string> = {
    incomplete: 'Document incomplet',
    incorrect: 'Informations incorrectes',
    non_compliant: 'Non conforme',
    missing_documents: 'Documents manquants',
    unauthorized: 'Non autorisé',
    other: 'Autre',
  };
  return labels[category];
}

// Participant colors palette
const PARTICIPANT_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}

export function getDocTypeIcon(type: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    pdf: 'FileText',
    word: 'FileText',
    excel: 'Table',
    powerpoint: 'Presentation',
    image: 'Image',
    text: 'FileText',
    other: 'File',
  };
  return icons[type];
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
