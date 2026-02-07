import { Clock, Shield, Trash2 } from 'lucide-react';
import type { DocumentRetention } from '../../types';

interface RetentionBadgeProps {
  retention: DocumentRetention | undefined;
}

export default function RetentionBadge({ retention }: RetentionBadgeProps) {
  if (!retention) return null;

  if (retention.deletedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal bg-neutral-100 text-neutral-500">
        <Trash2 size={10} />
        Contenu supprimé
      </span>
    );
  }

  if (retention.isProtected) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal bg-emerald-100 text-emerald-700">
        <Shield size={10} />
        Protégé
      </span>
    );
  }

  const now = new Date();
  const deletionDate = new Date(retention.scheduledDeletionAt);
  const daysLeft = Math.max(0, Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal bg-amber-100 text-amber-700">
      <Clock size={10} />
      Suppression dans {daysLeft}j
    </span>
  );
}
