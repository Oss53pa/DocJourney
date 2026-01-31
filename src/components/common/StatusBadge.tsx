import React from 'react';
import type { DocumentStatus, StepStatus } from '../../types';

const docStatusConfig: Record<DocumentStatus, { label: string; class: string }> = {
  draft: { label: 'Brouillon', class: 'badge-neutral' },
  in_progress: { label: 'En cours', class: 'badge-info' },
  completed: { label: 'Terminé', class: 'badge-success' },
  rejected: { label: 'Rejeté', class: 'badge-error' },
  archived: { label: 'Archivé', class: 'badge-neutral' },
};

const stepStatusConfig: Record<StepStatus, { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'badge-neutral' },
  sent: { label: 'Envoyé', class: 'badge-info' },
  completed: { label: 'Terminé', class: 'badge-success' },
  rejected: { label: 'Rejeté', class: 'badge-error' },
  skipped: { label: 'Passée', class: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200' },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = docStatusConfig[status];
  return <span className={config.class}>{config.label}</span>;
}

export function StepStatusBadge({ status }: { status: StepStatus }) {
  const config = stepStatusConfig[status];
  return <span className={config.class}>{config.label}</span>;
}
