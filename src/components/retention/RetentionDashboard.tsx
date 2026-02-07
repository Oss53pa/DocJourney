import { Clock, Shield, Trash2, AlertTriangle, CalendarPlus } from 'lucide-react';
import { useRetentionDashboard } from '../../hooks/useRetention';
import { protectDocument, extendRetention } from '../../services/retentionService';

export default function RetentionDashboard() {
  const { records, stats, loading, refresh } = useRetentionDashboard();

  if (loading) {
    return (
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-center h-24">
          <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (stats.total === 0) return null;

  const activeRetentions = records.filter(r => !r.deletedAt && !r.isProtected);
  const now = new Date();

  const handleProtect = async (documentId: string) => {
    await protectDocument(documentId);
    await refresh();
  };

  const handleQuickExtend = async (documentId: string) => {
    await extendRetention(documentId, 7);
    await refresh();
  };

  return (
    <div className="card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Tableau de rétention</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Vue d'ensemble des documents en rétention</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-50 rounded-xl p-3 text-center">
          <p className="text-xl font-normal text-neutral-900">{stats.total}</p>
          <p className="text-[11px] text-neutral-400 font-normal mt-0.5">Total</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-xl font-normal text-amber-700">{stats.warned}</p>
          <p className="text-[11px] text-amber-600 font-normal mt-0.5">Avertis</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-xl font-normal text-emerald-700">{stats.protected}</p>
          <p className="text-[11px] text-emerald-600 font-normal mt-0.5">Protégés</p>
        </div>
        <div className="bg-neutral-100 rounded-xl p-3 text-center">
          <p className="text-xl font-normal text-neutral-500">{stats.deleted}</p>
          <p className="text-[11px] text-neutral-400 font-normal mt-0.5">Supprimés</p>
        </div>
      </div>

      {/* Upcoming deletions */}
      {activeRetentions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-normal text-neutral-500 uppercase tracking-wider">
            Suppressions à venir
          </h3>
          {activeRetentions.slice(0, 5).map(retention => {
            const deletionDate = new Date(retention.scheduledDeletionAt);
            const daysLeft = Math.max(0, Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const isUrgent = daysLeft <= 2;

            return (
              <div
                key={retention.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                  isUrgent ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-neutral-50'
                }`}
              >
                {isUrgent ? (
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                ) : (
                  <Clock size={14} className="text-neutral-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-neutral-800 truncate">{retention.documentName}</p>
                  <p className="text-[11px] text-neutral-400 font-normal">
                    {daysLeft === 0 ? 'Aujourd\'hui' : `Dans ${daysLeft}j`}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleProtect(retention.documentId)}
                    className="btn-icon w-7 h-7 hover:bg-emerald-50 text-neutral-400 hover:text-emerald-600"
                    title="Protéger"
                  >
                    <Shield size={12} />
                  </button>
                  <button
                    onClick={() => handleQuickExtend(retention.documentId)}
                    className="btn-icon w-7 h-7 hover:bg-sky-50 text-neutral-400 hover:text-sky-600"
                    title="Prolonger de 7j"
                  >
                    <CalendarPlus size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
