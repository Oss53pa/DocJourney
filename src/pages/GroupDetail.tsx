import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Plus, FileText, FolderKanban,
  CheckCircle2, Search, X
} from 'lucide-react';
import { useDocumentGroup } from '../hooks/useDocumentGroups';
import {
  addDocumentsToGroup,
  removeDocumentFromGroup,
  exportGroupAsZip,
} from '../services/documentGroupService';
import { db } from '../db';
import { formatFileSize } from '../utils';
import { DocumentStatusBadge } from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import type { DocJourneyDocument } from '../types';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { group, documents, loading, refresh } = useDocumentGroup(id);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddDocs, setShowAddDocs] = useState(false);
  const [allDocs, setAllDocs] = useState<DocJourneyDocument[]>([]);
  const [searchAdd, setSearchAdd] = useState('');
  const [selectedAdd, setSelectedAdd] = useState<Set<string>>(new Set());

  const handleExportZip = async () => {
    if (!id) return;
    setExporting(true);
    try {
      await exportGroupAsZip(id);
      setMessage('Export ZIP téléchargé');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erreur export');
    } finally {
      setExporting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    if (!id) return;
    await removeDocumentFromGroup(id, docId);
    await refresh();
  };

  const openAddDocs = async () => {
    const docs = await db.documents.orderBy('updatedAt').reverse().toArray();
    setAllDocs(docs);
    setSelectedAdd(new Set());
    setSearchAdd('');
    setShowAddDocs(true);
  };

  const handleAddDocs = async () => {
    if (!id || selectedAdd.size === 0) return;
    await addDocumentsToGroup(id, [...selectedAdd]);
    setShowAddDocs(false);
    await refresh();
  };

  const toggleAddDoc = (docId: string) => {
    setSelectedAdd(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">Groupe introuvable</p>
        <button onClick={() => navigate('/groups')} className="btn-primary mt-4">Retour</button>
      </div>
    );
  }

  const completedCount = documents.filter(d => d.status === 'completed').length;
  const inProgressCount = documents.filter(d => d.status === 'in_progress').length;
  const filteredAddDocs = allDocs.filter(d => {
    if (group.documentIds.includes(d.id)) return false;
    if (!searchAdd) return true;
    return d.name.toLowerCase().includes(searchAdd.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation */}
      <button onClick={() => navigate('/groups')} className="btn-ghost btn-sm -ml-2">
        <ArrowLeft size={14} /> Groupes
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0">
          <FolderKanban size={24} className="text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-medium text-neutral-900 tracking-tight break-words">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-sm text-neutral-500 mt-1">{group.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400 font-normal">
            <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
            {inProgressCount > 0 && <span className="text-sky-500">{inProgressCount} en cours</span>}
            {completedCount > 0 && <span className="text-emerald-500">{completedCount} terminé{completedCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-normal ring-1 ring-emerald-200 animate-slide-down">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={openAddDocs} className="btn-primary">
          <Plus size={15} /> Ajouter des documents
        </button>
        {documents.length > 0 && (
          <button onClick={handleExportZip} disabled={exporting} className="btn-secondary">
            {exporting
              ? <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              : <Download size={15} />
            }
            Export ZIP
          </button>
        )}
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description="Ajoutez des documents à ce groupe."
            action={
              <button onClick={openAddDocs} className="btn-primary btn-sm">
                <Plus size={14} /> Ajouter
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-2">
          {documents.map(doc => (
            <div key={doc.id} className="card px-4 py-3.5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/document/${doc.id}`)}
              >
                <FileText size={18} className="text-neutral-500" />
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/document/${doc.id}`)}>
                <p className="text-sm font-normal text-neutral-900 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-neutral-400 font-normal">{formatFileSize(doc.size)}</span>
                  {doc.metadata.category && <span className="text-[11px] text-neutral-400">• {doc.metadata.category}</span>}
                </div>
              </div>
              <DocumentStatusBadge status={doc.status} />
              <button
                onClick={() => handleRemoveDoc(doc.id)}
                className="btn-icon hover:bg-red-50 text-neutral-300 hover:text-red-500"
                title="Retirer du groupe"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Documents Modal */}
      <Modal isOpen={showAddDocs} onClose={() => setShowAddDocs(false)} title="Ajouter des documents" size="lg">
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchAdd}
              onChange={e => setSearchAdd(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredAddDocs.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">Aucun document disponible</p>
            ) : (
              filteredAddDocs.map(doc => (
                <label
                  key={doc.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedAdd.has(doc.id) ? 'bg-purple-50 ring-1 ring-purple-200' : 'hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAdd.has(doc.id)}
                    onChange={() => toggleAddDoc(doc.id)}
                    className="w-4 h-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
                  />
                  <FileText size={16} className="text-neutral-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal text-neutral-800 truncate">{doc.name}</p>
                    <p className="text-[11px] text-neutral-400">{formatFileSize(doc.size)}</p>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </label>
              ))
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAddDocs(false)} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleAddDocs} disabled={selectedAdd.size === 0} className="btn-primary flex-1">
              <Plus size={14} /> Ajouter {selectedAdd.size > 0 ? `(${selectedAdd.size})` : ''}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
