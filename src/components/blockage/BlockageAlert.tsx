import React, { useState } from 'react';
import { AlertTriangle, UserX, Clock, RefreshCw, SkipForward, CalendarPlus } from 'lucide-react';
import type { BlockedWorkflowInfo } from '../../types';
import { formatRelativeTime } from '../../utils';
import UnblockActions from './UnblockActions';

interface BlockageAlertProps {
  info: BlockedWorkflowInfo;
  onResolved: () => void;
}

const reasonLabels: Record<BlockedWorkflowInfo['reason'], { label: string; icon: React.ReactNode; color: string }> = {
  absent: { label: 'Participant absent', icon: <UserX size={14} />, color: 'amber' },
  overdue: { label: 'Échéance dépassée', icon: <Clock size={14} />, color: 'red' },
  no_response: { label: 'Pas de réponse', icon: <Clock size={14} />, color: 'orange' },
};

export default function BlockageAlert({ info, onResolved }: BlockageAlertProps) {
  const [showActions, setShowActions] = useState(false);
  const reason = reasonLabels[info.reason];

  return (
    <>
      <div className={`rounded-xl ring-1 p-4 space-y-3 ${
        info.reason === 'overdue'
          ? 'bg-red-50 ring-red-200'
          : 'bg-amber-50 ring-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className={info.reason === 'overdue' ? 'text-red-500' : 'text-amber-500'} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                info.reason === 'overdue'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {reason.icon} {reason.label}
              </span>
              <span className="text-[11px] text-neutral-400">
                depuis {formatRelativeTime(info.blockedSince)}
              </span>
            </div>
            <p className="text-sm font-medium text-neutral-800 mt-1.5">
              {info.blockedParticipant.name}
              <span className="text-neutral-400 font-normal"> ({info.blockedParticipant.email})</span>
            </p>
            {info.substituteAvailable && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Remplaçant disponible : {info.substituteAvailable.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowActions(true)}
            className="btn-sm bg-white ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw size={12} /> Réassigner
          </button>
          <button
            onClick={() => setShowActions(true)}
            className="btn-sm bg-white ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50"
          >
            <SkipForward size={12} /> Passer
          </button>
          <button
            onClick={() => setShowActions(true)}
            className="btn-sm bg-white ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50"
          >
            <CalendarPlus size={12} /> Prolonger
          </button>
        </div>
      </div>

      {showActions && (
        <UnblockActions
          info={info}
          onClose={() => setShowActions(false)}
          onResolved={() => { setShowActions(false); onResolved(); }}
        />
      )}
    </>
  );
}
