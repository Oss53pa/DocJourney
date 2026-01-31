import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Search, CheckCircle2, XCircle, Download, ChevronRight, Clock, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db } from '../db';
import type { DocJourneyDocument, Workflow } from '../types';
import { formatDate, formatFileSize, formatDuration } from '../utils';
import { DocumentStatusBadge } from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { generateValidationReport, downloadReport, getReport } from '../services/reportService';

interface ArchiveItem { doc: DocJourneyDocument; workflow: Workflow | null }

export default function Archives() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'completed' | 'rejected'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const docs = await db.documents.orderBy('updatedAt').reverse().toArray();
    const workflows = await db.workflows.toArray();
    const wfMap = new Map(workflows.map(w => [w.documentId, w]));
    let archiveDocs = docs.filter(d => ['completed', 'rejected', 'archived'].includes(d.status));
    if (search) {
      const lower = search.toLowerCase();
      archiveDocs = archiveDocs.filter(d => d.name.toLowerCase().includes(lower) || d.metadata.category?.toLowerCase().includes(lower));
    }
    setItems(archiveDocs.map(doc => ({ doc, workflow: wfMap.get(doc.id) || null })));
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDownloadCRV = async (e: React.MouseEvent, doc: DocJourneyDocument, workflow: Workflow) => {
    e.stopPropagation();
    setGeneratingId(doc.id);
    try {
      let report = await getReport(workflow.id);
      if (!report) report = await generateValidationReport(workflow, doc);
      downloadReport(report, doc.name);
    } catch { /* */ }
    setGeneratingId(null);
  };

  // Computed stats
  const completedCount = useMemo(() => items.filter(i => i.doc.status === 'completed').length, [items]);
  const rejectedCount = useMemo(() => items.filter(i => i.doc.status === 'rejected').length, [items]);
  const averageDuration = useMemo(() => {
    const withDuration = items.filter(i => i.workflow?.createdAt && i.workflow?.completedAt);
    if (withDuration.length === 0) return null;
    const totalMs = withDuration.reduce((sum, i) => {
      const start = new Date(i.workflow!.createdAt).getTime();
      const end = new Date(i.workflow!.completedAt!).getTime();
      return sum + (end - start);
    }, 0);
    const avgMs = totalMs / withDuration.length;
    const avgEnd = new Date(avgMs);
    const avgStart = new Date(0);
    return formatDuration(avgStart, avgEnd);
  }, [items]);

  // Filtered items by tab
  const filteredItems = useMemo(() => {
    if (archiveFilter === 'completed') return items.filter(i => i.doc.status === 'completed');
    if (archiveFilter === 'rejected') return items.filter(i => i.doc.status === 'rejected');
    return items;
  }, [items, archiveFilter]);

  const groupedItems = useMemo(() => {
    const groups: { label: string; items: ArchiveItem[] }[] = [];
    const map = new Map<string, ArchiveItem[]>();
    for (const item of filteredItems) {
      const date = item.workflow?.completedAt || item.doc.updatedAt;
      const key = format(new Date(date), 'MMMM yyyy', { locale: fr });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    for (const [label, items] of map) {
      groups.push({ label, items });
    }
    return groups;
  }, [filteredItems]);

  const tabs: { key: 'all' | 'completed' | 'rejected'; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: items.length },
    { key: 'completed', label: 'Terminés', count: completedCount },
    { key: 'rejected', label: 'Rejetés', count: rejectedCount },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 tracking-tight">Archives</h1>
        <p className="text-sm text-neutral-500 mt-1">Documents terminés et rejetés</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="input-lg pl-11" />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Archive size={17} className="text-neutral-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Total archives</p>
            <p className="text-lg font-medium text-neutral-900">{items.length}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={17} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Terminés</p>
            <p className="text-lg font-medium text-emerald-600">{completedCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <XCircle size={17} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Rejetés</p>
            <p className="text-lg font-medium text-red-500">{rejectedCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Clock size={17} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Délai moyen</p>
            <p className="text-lg font-medium text-neutral-900">{averageDuration ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setArchiveFilter(tab.key)}
            className={`px-4 py-2.5 text-sm font-normal border-b-2 -mb-px ${
              archiveFilter === tab.key
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Archive}
            title="Aucune archive"
            description="Les documents terminés ou rejetés apparaîtront ici automatiquement."
          />
          <div className="px-6 pb-6 -mt-2">
            <div className="bg-neutral-50 rounded-xl p-5 space-y-3">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Comment ça fonctionne</p>
              <ol className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                  <span>Importez un document et créez un circuit de validation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                  <span>Envoyez le circuit aux participants pour collecte des retours.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                  <span>Une fois le circuit terminé ou rejeté, le document est archivé ici.</span>
                </li>
              </ol>
            </div>
          </div>
          <div className="flex justify-center pb-4">
            <button onClick={() => navigate('/new')} className="btn-primary btn-sm">
              <Plus size={14} /> Nouveau document
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3 capitalize">{group.label}</h3>
              <div className="grid gap-2">
                {group.items.map(({ doc, workflow }) => {
                  const steps = workflow?.steps ?? [];
                  const participantCount = new Set(steps.map(s => s.participant.email)).size;

                  return (
                    <div key={doc.id} className="card-interactive px-4 py-3.5 flex items-center gap-3" onClick={() => navigate(`/document/${doc.id}`)}>
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        {doc.status === 'completed'
                          ? <CheckCircle2 size={18} className="text-emerald-500" />
                          : <XCircle size={18} className="text-red-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-normal text-neutral-900 truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <DocumentStatusBadge status={doc.status} />
                          <span className="text-[11px] text-neutral-400 font-normal">{formatFileSize(doc.size)}</span>
                          {steps.length > 0 && (
                            <span className="text-[11px] text-neutral-400 font-normal">Circuit: {steps.length} étapes</span>
                          )}
                          {participantCount > 0 && (
                            <span className="text-[11px] text-neutral-400 font-normal hidden sm:inline">{participantCount} participant{participantCount > 1 ? 's' : ''}</span>
                          )}
                          {workflow?.completedAt && (
                            <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">
                              {formatDate(workflow.completedAt)} — {formatDuration(workflow.createdAt, workflow.completedAt)}
                            </span>
                          )}
                        </div>
                        {/* Mini journey: step decision dots */}
                        {steps.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            {steps.map((step, idx) => {
                              let dotColor = 'bg-neutral-300';
                              if (step.status === 'completed') dotColor = 'bg-emerald-500';
                              else if (step.status === 'rejected') dotColor = 'bg-red-500';
                              else if (step.status === 'skipped') dotColor = 'bg-neutral-300';
                              else dotColor = 'bg-neutral-200';
                              return (
                                <span
                                  key={step.id ?? idx}
                                  className={`w-2 h-2 rounded-full ${dotColor}`}
                                  title={`\u00c9tape ${idx + 1}: ${step.participant.name} — ${step.status}`}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/document/${doc.id}`); }} className="btn-ghost btn-sm text-xs">
                          <FileText size={12} /> Document
                        </button>
                        {workflow && (
                          <button
                            onClick={e => handleDownloadCRV(e, doc, workflow)}
                            disabled={generatingId === doc.id}
                            className="btn-ghost btn-sm text-xs"
                          >
                            {generatingId === doc.id
                              ? <div className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                              : <Download size={12} />
                            }
                            CRV
                          </button>
                        )}
                        <ChevronRight size={16} className="text-neutral-300 flex-shrink-0 hidden sm:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
