import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Plus, Trash2, FolderOpen, FolderKanban, ChevronRight, CheckSquare, Square, X, File, Table, Image, Presentation } from 'lucide-react';
import { db } from '../db';
import type { DocJourneyDocument, DocumentStatus, DocumentType } from '../types';
import { formatRelativeTime, formatFileSize, getParticipantColor } from '../utils';
import { DocumentStatusBadge } from '../components/common/StatusBadge';
import { deleteDocument } from '../services/documentService';
import { createGroup, deleteGroup } from '../services/documentGroupService';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useDocumentGroups } from '../hooks/useDocumentGroups';

type ViewTab = 'all' | 'groups';

const STATUS_FILTERS: { value: DocumentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminés' },
  { value: 'rejected', label: 'Rejetés' },
];

function getDocTypeIconComponent(type: DocumentType) {
  switch (type) {
    case 'pdf':
      return <FileText size={18} className="text-red-500" />;
    case 'word':
      return <FileText size={18} className="text-blue-500" />;
    case 'excel':
      return <Table size={18} className="text-green-500" />;
    case 'powerpoint':
      return <Presentation size={18} className="text-orange-500" />;
    case 'image':
      return <Image size={18} className="text-purple-500" />;
    case 'text':
      return <FileText size={18} className="text-neutral-500" />;
    default:
      return <File size={18} className="text-neutral-400" />;
  }
}

export default function Documents() {
  const navigate = useNavigate();
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [allDocs, setAllDocs] = useState<DocJourneyDocument[]>([]);
  const [documents, setDocuments] = useState<DocJourneyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const { groups, loading: groupsLoading, refresh: refreshGroups } = useDocumentGroups();

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of allDocs) {
      counts[doc.status] = (counts[doc.status] || 0) + 1;
    }
    return counts;
  }, [allDocs]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const all = await db.documents.orderBy('updatedAt').reverse().toArray();
    setAllDocs(all);

    let docs = all;
    if (statusFilter !== 'all') docs = docs.filter(d => d.status === statusFilter);
    if (search) {
      const lower = search.toLowerCase();
      docs = docs.filter(d => d.name.toLowerCase().includes(lower) || d.metadata.category?.toLowerCase().includes(lower));
    }
    if (groupFilter !== 'all') {
      const allGroups = await db.documentGroups.toArray();
      const targetGroup = allGroups.find(g => g.id === groupFilter);
      if (targetGroup) {
        const groupDocIds = new Set(targetGroup.documentIds);
        docs = docs.filter(d => groupDocIds.has(d.id));
      }
    }
    if (typeFilter !== 'all') docs = docs.filter(d => d.type === typeFilter);
    if (sortOrder === 'newest') docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    else if (sortOrder === 'oldest') docs.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    else if (sortOrder === 'name_asc') docs.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'name_desc') docs.sort((a, b) => b.name.localeCompare(a.name));
    setDocuments(docs);
    setLoading(false);
  }, [search, statusFilter, groupFilter, typeFilter, sortOrder]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteDocument(deleteId);
    setDeleteId(null);
    await loadData();
  };

  const toggleSelect = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const docIds = selectMode ? [...selectedDocs] : [];
    const group = await createGroup(groupName.trim(), docIds, groupDescription.trim() || undefined);
    setShowCreateGroup(false);
    setGroupName('');
    setGroupDescription('');
    setSelectMode(false);
    setSelectedDocs(new Set());
    await refreshGroups();
    navigate(`/groups/${group.id}`);
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    await deleteGroup(deleteGroupId);
    setDeleteGroupId(null);
    await refreshGroups();
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedDocs(new Set());
  };

  // Filter groups for search
  const filteredGroups = search
    ? groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  // Build docMap for group stats
  const docMap = useMemo(() => {
    const map: Record<string, DocJourneyDocument> = {};
    allDocs.forEach(d => { map[d.id] = d; });
    return map;
  }, [allDocs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-neutral-900 tracking-tight">Documents</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {viewTab === 'all' ? 'Tous vos documents' : `${groups.length} groupe${groups.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          {viewTab === 'all' && selectMode ? (
            <>
              <button
                onClick={() => setShowCreateGroup(true)}
                disabled={selectedDocs.size === 0}
                className="btn-primary"
              >
                <FolderKanban size={15} /> Créer un groupe ({selectedDocs.size})
              </button>
              <button onClick={exitSelectMode} className="btn-ghost">
                <X size={15} /> Annuler
              </button>
            </>
          ) : viewTab === 'all' ? (
            <>
              <button onClick={() => setSelectMode(true)} className="btn-secondary">
                <CheckSquare size={15} /> <span className="hidden sm:inline">Sélectionner</span>
              </button>
              <button onClick={() => navigate('/new')} className="btn-primary">
                <Plus size={15} /> Nouveau
              </button>
            </>
          ) : (
            <button onClick={() => setShowCreateGroup(true)} className="btn-primary">
              <Plus size={15} /> Nouveau groupe
            </button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
        <button
          onClick={() => { setViewTab('all'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-normal transition-all flex-1 justify-center ${
            viewTab === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <FolderOpen size={15} />
          Tous les documents
        </button>
        <button
          onClick={() => { setViewTab('groups'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-normal transition-all flex-1 justify-center ${
            viewTab === 'groups' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <FolderKanban size={15} />
          Par groupe
          {groups.length > 0 && <span className="text-xs text-neutral-400">({groups.length})</span>}
        </button>
      </div>

      {/* ========== ALL DOCUMENTS VIEW ========== */}
      {viewTab === 'all' && (
        <>
          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="input-lg pl-11" />
            </div>
            <div className="flex gap-1 border-b border-neutral-200 mb-4">
              {STATUS_FILTERS.map(f => {
                const count = f.value === 'all' ? allDocs.length : statusCounts[f.value] || 0;
                return (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-4 py-2.5 text-sm font-normal transition-colors border-b-2 -mb-px ${
                      statusFilter === f.value
                        ? 'border-neutral-900 text-neutral-900'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    {f.label} <span className="ml-1 text-xs text-neutral-400">({count})</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="input text-xs py-1.5 px-3 w-auto rounded-lg">
                <option value="all">Tous les groupes</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input text-xs py-1.5 px-3 w-auto rounded-lg">
                <option value="all">Tous les types</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="powerpoint">PowerPoint</option>
                <option value="image">Image</option>
                <option value="text">Texte</option>
              </select>
              <div className="ml-auto">
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="input text-xs py-1.5 px-3 w-auto rounded-lg">
                  <option value="newest">Plus récent</option>
                  <option value="oldest">Plus ancien</option>
                  <option value="name_asc">Nom A-Z</option>
                  <option value="name_desc">Nom Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Document List */}
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={FolderOpen}
                title="Aucun document"
                description={search ? 'Aucun résultat.' : 'Commencez par importer un document.'}
                action={!search ? <button onClick={() => navigate('/new')} className="btn-primary btn-sm"><Plus size={14} /> Nouveau</button> : undefined}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className={`card-interactive px-4 py-3.5 flex items-center gap-3 ${
                    selectMode && selectedDocs.has(doc.id) ? 'ring-2 ring-purple-300 bg-purple-50/30' : ''
                  }`}
                  onClick={() => selectMode ? toggleSelect(doc.id) : navigate(`/document/${doc.id}`)}
                >
                  {selectMode && (
                    <div className="flex-shrink-0">
                      {selectedDocs.has(doc.id)
                        ? <CheckSquare size={18} className="text-purple-600" />
                        : <Square size={18} className="text-neutral-300" />
                      }
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    {getDocTypeIconComponent(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal text-neutral-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-neutral-400 font-normal">{formatFileSize(doc.size)}</span>
                      {doc.metadata.pageCount && (
                        <span className="text-[11px] text-neutral-400">&bull; {doc.metadata.pageCount} page{doc.metadata.pageCount > 1 ? 's' : ''}</span>
                      )}
                      {doc.metadata.category && <span className="text-[11px] text-neutral-400">&bull; {doc.metadata.category}</span>}
                      <span className="text-[11px] text-neutral-400 hidden sm:inline">&bull; {formatRelativeTime(doc.updatedAt)}</span>
                    </div>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                  {!selectMode && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteId(doc.id); }}
                        className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500 hidden sm:flex"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Document count summary */}
          {!loading && documents.length > 0 && (
            <p className="text-xs text-neutral-400">{documents.length} document{documents.length > 1 ? 's' : ''}</p>
          )}

          <p className="text-xs text-neutral-400 text-center">
            Glissez-déposez des fichiers n'importe où pour les importer
          </p>
        </>
      )}

      {/* ========== GROUPS VIEW ========== */}
      {viewTab === 'groups' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher un groupe..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-lg pl-11"
            />
          </div>

          {/* Groups List */}
          {groupsLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={FolderKanban}
                title="Aucun groupe"
                description={search ? 'Aucun résultat.' : 'Organisez vos documents par catégorie pour un accès rapide'}
                action={!search ? (
                  <button onClick={() => setShowCreateGroup(true)} className="btn-primary btn-sm">
                    <Plus size={14} /> Nouveau groupe
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredGroups.map((group, i) => {
                const count = group.documentIds.length;
                const groupDocs = group.documentIds.map(id => docMap[id]).filter(Boolean);
                const draftCount = groupDocs.filter(d => d.status === 'draft').length;
                const inProgressCount = groupDocs.filter(d => d.status === 'in_progress').length;
                const completedCount = groupDocs.filter(d => d.status === 'completed').length;
                const rejectedCount = groupDocs.filter(d => d.status === 'rejected').length;

                return (
                  <div
                    key={group.id}
                    className="card p-5 transition-all hover:shadow-lg hover:border-neutral-300 hover:-translate-y-0.5 cursor-pointer"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: getParticipantColor(i) + '15' }}
                      >
                        <FolderKanban size={20} style={{ color: getParticipantColor(i) }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-neutral-900">{group.name}</h3>
                        {group.description && (
                          <p className="text-xs text-neutral-400 mt-0.5 truncate">{group.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-neutral-500">
                            {count} document{count !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {formatRelativeTime(group.updatedAt)}
                          </span>
                        </div>
                        {count > 0 && (
                          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                            {draftCount > 0 && <span className="text-neutral-500">{draftCount} brouillon{draftCount > 1 ? 's' : ''}</span>}
                            {inProgressCount > 0 && <span className="text-sky-600">{inProgressCount} en cours</span>}
                            {completedCount > 0 && <span className="text-emerald-600">{completedCount} terminé{completedCount > 1 ? 's' : ''}</span>}
                            {rejectedCount > 0 && <span className="text-red-500">{rejectedCount} rejeté{rejectedCount > 1 ? 's' : ''}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteGroupId(group.id); }}
                          className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500 hidden sm:flex"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Create group CTA card */}
              <div
                onClick={() => setShowCreateGroup(true)}
                className="border-2 border-dashed border-neutral-200 rounded-2xl p-5 flex items-center gap-3 cursor-pointer hover:border-neutral-300 hover:bg-neutral-50 transition-all"
              >
                <Plus size={20} className="text-neutral-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-600">Créer un nouveau groupe</p>
                  <p className="text-xs text-neutral-400">Organisez vos documents par projet, type ou client</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Document Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-neutral-600">Cette action supprimera définitivement le document et son workflow.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleDelete} className="btn-danger flex-1">Supprimer</button>
          </div>
        </div>
      </Modal>

      {/* Create Group Modal */}
      <Modal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} title="Nouveau groupe" size="sm">
        <div className="space-y-4">
          {selectMode && selectedDocs.size > 0 && (
            <p className="text-sm text-neutral-600">
              {selectedDocs.size} document{selectedDocs.size > 1 ? 's' : ''} sélectionné{selectedDocs.size > 1 ? 's' : ''}
            </p>
          )}
          <div>
            <label className="label">Nom du groupe *</label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="input"
              placeholder="Ex: Dossier client Alpha"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={groupDescription}
              onChange={e => setGroupDescription(e.target.value)}
              className="input"
              rows={2}
              placeholder="Optionnel..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowCreateGroup(false); setGroupName(''); setGroupDescription(''); }} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleCreateGroup} disabled={!groupName.trim()} className="btn-primary flex-1">
              <FolderKanban size={14} /> Créer
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Group Modal */}
      <Modal isOpen={!!deleteGroupId} onClose={() => setDeleteGroupId(null)} title="Supprimer le groupe" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-neutral-600">Ce groupe sera supprimé. Les documents ne seront pas affectés.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteGroupId(null)} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleDeleteGroup} className="btn-danger flex-1">Supprimer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
