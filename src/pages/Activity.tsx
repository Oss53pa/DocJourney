import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity as ActivityIcon, FileUp, GitBranch, Send, Download, CheckCircle2,
  XCircle, FileOutput, Archive, Clock, Layout, Trash2, Bell, FolderKanban, Cloud, Unlink,
  Search, Filter, FileText, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, SkipForward, RefreshCw,
  BarChart3, X, FileDown
} from 'lucide-react';
import {
  getFilteredActivity, getActivityStats, groupActivitiesByDate,
  exportActivityHistory, getActivityCategory,
  type ActivityFilters, type ActivityStats, type ActivityCategory,
} from '../services/activityService';
import { addDays, startOfDay, startOfWeek } from '../utils/dateUtils';
import type { ActivityEntry, ActivityType } from '../types';
import { formatDate, formatRelativeTime } from '../utils';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';

// ── Activity icon/color config ──

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  document_imported:  { icon: FileUp,       color: 'text-sky-600',     bg: 'bg-sky-50',     label: 'Document importé' },
  workflow_created:   { icon: GitBranch,    color: 'text-violet-600',  bg: 'bg-violet-50',  label: 'Circuit créé' },
  workflow_started:   { icon: Clock,        color: 'text-sky-600',     bg: 'bg-sky-50',     label: 'Circuit démarré' },
  package_generated:  { icon: Send,         color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Paquet généré' },
  return_imported:    { icon: Download,     color: 'text-cyan-600',    bg: 'bg-cyan-50',    label: 'Retour importé' },
  step_completed:     { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Étape complétée' },
  workflow_completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Circuit terminé' },
  workflow_rejected:  { icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50',     label: 'Circuit rejeté' },
  report_generated:   { icon: FileOutput,   color: 'text-neutral-600', bg: 'bg-neutral-100', label: 'CRV généré' },
  document_archived:  { icon: Archive,      color: 'text-neutral-600', bg: 'bg-neutral-100', label: 'Document archivé' },
  template_created:   { icon: Layout,       color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Modèle créé' },
  template_used:      { icon: Layout,       color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Modèle utilisé' },
  template_deleted:   { icon: Trash2,       color: 'text-red-600',     bg: 'bg-red-50',     label: 'Modèle supprimé' },
  reminder_sent:      { icon: Bell,         color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Rappel envoyé' },
  group_created:      { icon: FolderKanban, color: 'text-teal-600',    bg: 'bg-teal-50',    label: 'Groupe créé' },
  group_updated:      { icon: FolderKanban, color: 'text-teal-600',    bg: 'bg-teal-50',    label: 'Groupe modifié' },
  group_deleted:      { icon: Trash2,       color: 'text-red-600',     bg: 'bg-red-50',     label: 'Groupe supprimé' },
  cloud_exported:     { icon: Cloud,        color: 'text-sky-600',     bg: 'bg-sky-50',     label: 'Export cloud' },
  cloud_connected:    { icon: Cloud,        color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Cloud connecté' },
  cloud_disconnected: { icon: Unlink,       color: 'text-neutral-600', bg: 'bg-neutral-100', label: 'Cloud déconnecté' },
  step_skipped:       { icon: SkipForward,  color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Étape passée' },
  step_reassigned:    { icon: RefreshCw,    color: 'text-sky-600',     bg: 'bg-sky-50',     label: 'Étape réassignée' },
};

// ── Period presets ──

type PeriodPreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all';

function getPeriodDates(preset: PeriodPreset): { start?: Date; end?: Date } {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return { start: today };
    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return { start: yesterday, end: today };
    }
    case 'this_week': {
      const weekStartDate = startOfWeek(today);
      return { start: weekStartDate };
    }
    case 'this_month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart };
    }
    case 'all':
    default:
      return {};
  }
}

const periodLabels: Record<PeriodPreset, string> = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  this_week: 'Cette semaine',
  this_month: 'Ce mois',
  all: 'Tout',
};

const categoryLabels: Record<ActivityCategory | 'all', string> = {
  all: 'Tous',
  document: 'Documents',
  workflow: 'Circuits',
  signature: 'Signatures',
  notification: 'Notifications',
  organization: 'Organisation',
  contact: 'Contacts',
};

// ── Main component ──

export default function Activity() {
  const navigate = useNavigate();

  // State
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [category, setCategory] = useState<ActivityCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Export
  const [showExport, setShowExport] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<PeriodPreset>('this_month');
  const [exportCategories, setExportCategories] = useState<Set<ActivityCategory>>(
    new Set(['document', 'workflow', 'signature', 'notification'])
  );

  // ── Load data ──

  const loadData = useCallback(async () => {
    setLoading(true);
    const periodDates = getPeriodDates(period);
    const filters: ActivityFilters = {
      periodStart: periodDates.start,
      periodEnd: periodDates.end,
      category: category !== 'all' ? category : undefined,
      search: search.trim() || undefined,
      limit: 500,
    };

    const [data, statsData] = await Promise.all([
      getFilteredActivity(filters),
      getActivityStats(periodDates.start, periodDates.end),
    ]);

    setActivities(data);
    setStats(statsData);
    setLoading(false);
    setCurrentPage(1);
  }, [period, category, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Export ──

  const handleExport = async () => {
    const periodDates = getPeriodDates(exportPeriod);
    const csv = await exportActivityHistory({
      periodStart: periodDates.start,
      periodEnd: periodDates.end,
      categories: Array.from(exportCategories),
      format: 'csv',
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activite_docjourney_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  const toggleExportCategory = (cat: ActivityCategory) => {
    const next = new Set(exportCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExportCategories(next);
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(activities.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageActivities = activities.slice(startIndex, startIndex + itemsPerPage);
  const visibleGrouped = groupActivitiesByDate(pageActivities);

  // Generate page numbers to display (max 5 around current)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-48px)] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 flex-shrink-0 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 tracking-tight">
            Activité
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Historique complet des actions
          </p>
        </div>
        <button onClick={() => setShowExport(true)} className="btn-secondary btn-sm self-start sm:self-auto">
          <FileDown size={14} /> Exporter
        </button>
      </div>

      {/* ── Period Summary ── */}
      {stats && (
        <div className="card p-5 flex-shrink-0 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-neutral-500" />
              <h2 className="text-sm font-medium text-neutral-700">Résumé de la période</h2>
            </div>
            <span className="text-xs text-neutral-400">{periodLabels[period]}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center sm:text-left">
              <p className="text-2xl font-medium text-neutral-900">{stats.totalDocuments}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Documents</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl font-medium text-emerald-600">{stats.validated}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Validés</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl font-medium text-red-600">{stats.rejected}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Rejetés</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl font-medium text-sky-600">{stats.inProgress}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">En cours</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl font-medium text-neutral-700">
                {stats.averageDelayDays > 0 ? `${stats.averageDelayDays}j` : '—'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Délai moyen</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="space-y-3 flex-shrink-0 mb-6">
        {/* Period tabs */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(periodLabels) as PeriodPreset[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                period === p
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher dans l'historique..."
              className="input pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary btn-sm flex-shrink-0 ${showFilters ? 'ring-2 ring-neutral-300' : ''}`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filtres</span>
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="card p-4 animate-slide-down">
            <div className="flex flex-wrap gap-2">
              <label className="text-xs text-neutral-500 self-center mr-1">Type :</label>
              {(Object.keys(categoryLabels) as (ActivityCategory | 'all')[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[12px] transition-colors ${
                    category === cat
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filters summary */}
        {(category !== 'all' || search) && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{activities.length} résultat{activities.length !== 1 ? 's' : ''}</span>
            {category !== 'all' && (
              <span className="bg-neutral-100 px-2 py-0.5 rounded-full">
                {categoryLabels[category]}
                <button onClick={() => setCategory('all')} className="ml-1 text-neutral-400 hover:text-neutral-600">
                  <X size={10} className="inline" />
                </button>
              </span>
            )}
            {search && (
              <span className="bg-neutral-100 px-2 py-0.5 rounded-full">
                "{search}"
                <button onClick={() => setSearch('')} className="ml-1 text-neutral-400 hover:text-neutral-600">
                  <X size={10} className="inline" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      {activities.length === 0 ? (
        <div className="card flex-1">
          <EmptyState
            icon={ActivityIcon}
            title="Aucune activité"
            description="Les actions effectuées apparaîtront ici."
          />
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">
            {visibleGrouped.map((group) => (
              <section key={group.label}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-[13px] font-medium text-neutral-800 uppercase tracking-wide">
                    {group.label}
                  </h3>
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-[11px] text-neutral-400">
                    {group.entries.length} action{group.entries.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Activity entries */}
                <div className="space-y-1.5">
                  {group.entries.map((entry) => {
                    const config = activityConfig[entry.type] || {
                      icon: ActivityIcon, color: 'text-neutral-500', bg: 'bg-neutral-50', label: entry.type,
                    };
                    const Icon = config.icon;
                    const isExpanded = expandedId === entry.id;
                    const hasDocument = !!entry.documentId;

                    return (
                      <div
                        key={entry.id}
                        className={`card transition-all duration-200 ${
                          isExpanded ? 'ring-1 ring-neutral-300 shadow-md' : ''
                        }`}
                      >
                        {/* Main row */}
                        <div
                          className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon size={16} className={config.color} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-800 leading-snug">
                              {entry.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.color}`}>
                                {config.label}
                              </span>
                              <span className="text-[11px] text-neutral-400">
                                {formatRelativeTime(entry.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {hasDocument && (
                              <button
                                onClick={e => { e.stopPropagation(); navigate(`/document/${entry.documentId}`); }}
                                className="btn-icon hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                                title="Voir le document"
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                            <ChevronDown
                              size={14}
                              className={`text-neutral-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-neutral-100 animate-slide-down">
                            <div className="ml-12 space-y-3">
                              {/* Details */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-neutral-400 text-xs">Date exacte</span>
                                  <p className="text-neutral-700">{formatDate(entry.timestamp)}</p>
                                </div>
                                <div>
                                  <span className="text-neutral-400 text-xs">Catégorie</span>
                                  <p className="text-neutral-700">{categoryLabels[getActivityCategory(entry.type)]}</p>
                                </div>
                                {entry.documentId && (
                                  <div>
                                    <span className="text-neutral-400 text-xs">Document</span>
                                    <p className="text-neutral-700 truncate">{entry.documentId}</p>
                                  </div>
                                )}
                                {entry.workflowId && (
                                  <div>
                                    <span className="text-neutral-400 text-xs">Workflow</span>
                                    <p className="text-neutral-700 truncate">{entry.workflowId}</p>
                                  </div>
                                )}
                              </div>

                              {/* Metadata */}
                              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                <div className="bg-neutral-50 rounded-xl p-3">
                                  <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1.5">Métadonnées</p>
                                  <div className="space-y-1">
                                    {Object.entries(entry.metadata).map(([key, value]) => (
                                      <div key={key} className="flex items-center gap-2 text-xs">
                                        <span className="text-neutral-500">{key} :</span>
                                        <span className="text-neutral-700">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Quick actions */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                {entry.documentId && (
                                  <button
                                    onClick={() => navigate(`/document/${entry.documentId}`)}
                                    className="btn-ghost btn-sm"
                                  >
                                    <FileText size={12} /> Voir document
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 flex-shrink-0 border-t border-neutral-100">
              <p className="text-xs text-neutral-400">
                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, activities.length)} sur {activities.length} activités
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                  className="btn-icon hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                {getPageNumbers().map((page, i) =>
                  page === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-1 text-neutral-400 text-sm">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                  className="btn-icon hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Export Modal ── */}
      <Modal isOpen={showExport} onClose={() => setShowExport(false)} title="Exporter l'historique" size="sm">
        <div className="space-y-5">
          {/* Period */}
          <div>
            <label className="label">Période</label>
            <select
              value={exportPeriod}
              onChange={e => setExportPeriod(e.target.value as PeriodPreset)}
              className="input"
            >
              {(Object.keys(periodLabels) as PeriodPreset[]).map(p => (
                <option key={p} value={p}>{periodLabels[p]}</option>
              ))}
            </select>
          </div>

          {/* Categories */}
          <div>
            <label className="label mb-2">Types à inclure</label>
            <div className="space-y-2">
              {(['document', 'workflow', 'signature', 'notification', 'organization', 'contact'] as ActivityCategory[]).map(cat => (
                <label key={cat} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportCategories.has(cat)}
                    onChange={() => toggleExportCategory(cat)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                  />
                  <span className="text-sm text-neutral-700">{categoryLabels[cat]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="label mb-2">Format</label>
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked readOnly className="w-4 h-4 text-neutral-900 focus:ring-neutral-500" />
                <span className="text-sm text-neutral-700">CSV</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowExport(false)} className="btn-secondary flex-1">
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={exportCategories.size === 0}
              className="btn-primary flex-1"
            >
              <FileDown size={14} /> Exporter
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
