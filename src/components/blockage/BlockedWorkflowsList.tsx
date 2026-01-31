import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, UserX, Clock, ChevronRight } from 'lucide-react';
import type { BlockedWorkflowInfo } from '../../types';
import { useBlockedWorkflows } from '../../hooks/useBlockedWorkflows';
import UnblockActions from './UnblockActions';

export default function BlockedWorkflowsList() {
  const navigate = useNavigate();
  const { blocked, loading, refresh } = useBlockedWorkflows();
  const [selectedInfo, setSelectedInfo] = useState<BlockedWorkflowInfo | null>(null);

  if (loading || blocked.length === 0) return null;

  const absentItems = blocked.filter(b => b.reason === 'absent');
  const overdueItems = blocked.filter(b => b.reason === 'overdue');

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
          <AlertTriangle size={14} className="text-red-600" />
        </div>
        <h2 className="section-title text-red-600">Workflows bloqués ({blocked.length})</h2>
      </div>

      <div className="space-y-2">
        {/* Overdue */}
        {overdueItems.map(item => (
          <div
            key={`${item.workflowId}-overdue`}
            className="card px-4 py-3 flex items-center gap-3 ring-1 ring-red-100"
          >
            <Clock size={16} className="text-red-500 flex-shrink-0" />
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => navigate(`/document/${item.documentId}`)}
            >
              <p className="text-sm font-normal text-neutral-800 truncate">{item.documentName}</p>
              <p className="text-[11px] text-neutral-400">
                Échéance dépassée — En attente de {item.blockedParticipant.name}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setSelectedInfo(item); }}
              className="btn-ghost btn-sm text-red-600 hover:bg-red-50 flex-shrink-0"
            >
              Débloquer
            </button>
            <ChevronRight
              size={16}
              className="text-neutral-300 flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/document/${item.documentId}`)}
            />
          </div>
        ))}

        {/* Absent */}
        {absentItems.map(item => (
          <div
            key={`${item.workflowId}-absent`}
            className="card px-4 py-3 flex items-center gap-3 ring-1 ring-amber-100"
          >
            <UserX size={16} className="text-amber-500 flex-shrink-0" />
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => navigate(`/document/${item.documentId}`)}
            >
              <p className="text-sm font-normal text-neutral-800 truncate">{item.documentName}</p>
              <p className="text-[11px] text-neutral-400">
                {item.blockedParticipant.name} est absent
                {item.substituteAvailable ? ` — Remplaçant : ${item.substituteAvailable.name}` : ''}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setSelectedInfo(item); }}
              className="btn-ghost btn-sm text-amber-600 hover:bg-amber-50 flex-shrink-0"
            >
              Débloquer
            </button>
            <ChevronRight
              size={16}
              className="text-neutral-300 flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/document/${item.documentId}`)}
            />
          </div>
        ))}
      </div>

      {selectedInfo && (
        <UnblockActions
          info={selectedInfo}
          onClose={() => setSelectedInfo(null)}
          onResolved={() => { setSelectedInfo(null); refresh(); }}
        />
      )}
    </section>
  );
}
