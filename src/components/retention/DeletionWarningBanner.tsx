import { Clock, AlertTriangle, Download, Shield, CalendarPlus } from 'lucide-react';
import type { DocumentRetention } from '../../types';

interface DeletionWarningBannerProps {
  retention: DocumentRetention;
  onProtect: () => void;
  onExtend: () => void;
  onRestore?: () => void;
}

export default function DeletionWarningBanner({
  retention,
  onProtect,
  onExtend,
  onRestore,
}: DeletionWarningBannerProps) {
  if (retention.isProtected) return null;

  // Content already deleted
  if (retention.deletedAt) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl bg-neutral-100 ring-1 ring-neutral-200 animate-slide-down">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <AlertTriangle size={18} className="text-neutral-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-normal text-neutral-700">
              Le contenu de ce document a été supprimé par la politique de rétention.
            </p>
            {retention.cloudBackupStatus === 'completed' && (
              <p className="text-xs text-neutral-500 mt-0.5">
                Une sauvegarde cloud est disponible.
              </p>
            )}
          </div>
        </div>
        {retention.cloudBackupStatus === 'completed' && onRestore && (
          <button onClick={onRestore} className="btn-primary btn-sm flex-shrink-0">
            <Download size={14} /> Restaurer
          </button>
        )}
      </div>
    );
  }

  // Warning: deletion approaching
  if (!retention.notificationSent) return null;

  const now = new Date();
  const deletionDate = new Date(retention.scheduledDeletionAt);
  const daysLeft = Math.max(0, Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 animate-slide-down">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Clock size={18} className="text-amber-600 flex-shrink-0" />
        <p className="text-sm font-normal text-amber-800">
          Le contenu sera supprimé dans <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> selon la politique de rétention.
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onProtect} className="btn-secondary btn-sm">
          <Shield size={14} /> Protéger
        </button>
        <button onClick={onExtend} className="btn-secondary btn-sm">
          <CalendarPlus size={14} /> Prolonger
        </button>
      </div>
    </div>
  );
}
