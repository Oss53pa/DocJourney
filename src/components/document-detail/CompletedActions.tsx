import { useState } from 'react';
import { Download, Eye, RotateCcw, Cloud, Share2, Edit3 } from 'lucide-react';
import type { DocJourneyDocument, Workflow, DocumentRetention } from '../../types';
import { generateValidationReport, downloadReport, getReport } from '../../services/reportService';
import { db } from '../../db';

interface CompletedActionsProps {
  doc: DocJourneyDocument;
  workflow: Workflow;
  retention: DocumentRetention | undefined;
  isRejected: boolean;
  onShowCloud: () => void;
  onShowPreview: () => void;
  onMessage: (msg: string, type: 'success' | 'error') => void;
  onNavigate: (path: string) => void;
  onRefreshData: () => void;
}

export default function CompletedActions({
  doc,
  workflow,
  retention,
  isRejected,
  onShowCloud,
  onShowPreview,
  onMessage,
  onNavigate,
  onRefreshData,
}: CompletedActionsProps) {
  const [generating, setGenerating] = useState(false);

  const isContentDeleted = retention?.deletedAt != null;

  const handleDownloadCRV = async () => {
    setGenerating(true);
    try {
      let report = await getReport(workflow.id);
      if (!report) report = await generateValidationReport(workflow, doc);
      downloadReport(report, doc.name);
      onMessage('CRV téléchargé', 'success');
    } catch {
      onMessage('Erreur lors du téléchargement du CRV', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadDocument = () => {
    if (!doc.content || isContentDeleted) return;
    try {
      const byteCharacters = atob(doc.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onMessage('Document téléchargé', 'success');
    } catch {
      onMessage('Erreur lors du téléchargement', 'error');
    }
  };

  const handleResubmit = async () => {
    try {
      await db.documents.update(doc.id, {
        status: 'draft',
        workflowId: undefined,
        updatedAt: new Date(),
      });
      onMessage('Document remis en brouillon pour correction', 'success');
      onRefreshData();
    } catch {
      onMessage('Erreur lors de la réinitialisation', 'error');
    }
  };

  const handleShare = async () => {
    const summary = `${doc.name} — ${isRejected ? 'Rejeté' : 'Terminé'}\nCircuit: ${workflow.name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: doc.name, text: summary });
      } catch {
        // User cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(summary);
        onMessage('Résumé copié dans le presse-papier', 'success');
      } catch {
        onMessage('Impossible de copier', 'error');
      }
    }
  };

  return (
    <div className="card p-5">
      <h3 className="section-title mb-3">Actions</h3>
      <div className="flex flex-wrap gap-2">
        {/* Download CRV */}
        <button onClick={handleDownloadCRV} disabled={generating} className="btn-primary">
          {generating
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Download size={15} />
          }
          Télécharger le CRV
        </button>

        {isRejected ? (
          <>
            {/* Resubmit */}
            <button onClick={handleResubmit} className="btn-secondary">
              <Edit3 size={15} /> Corriger et resoumettre
            </button>
          </>
        ) : (
          <>
            {/* Download signed document */}
            {!isContentDeleted && doc.content && (
              <button onClick={handleDownloadDocument} className="btn-secondary">
                <Download size={15} /> Télécharger le document
              </button>
            )}

            {/* View original */}
            {!isContentDeleted && doc.content && (
              <button onClick={onShowPreview} className="btn-secondary">
                <Eye size={15} /> Voir l'original
              </button>
            )}

            {/* New workflow */}
            <button onClick={() => onNavigate('/new')} className="btn-secondary">
              <RotateCcw size={15} /> Nouveau circuit
            </button>
          </>
        )}

        {/* Cloud save */}
        <button onClick={onShowCloud} className="btn-secondary">
          <Cloud size={15} />
          <span className="hidden sm:inline">Cloud</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="btn-ghost">
          <Share2 size={15} />
          <span className="hidden sm:inline">Partager</span>
        </button>
      </div>
    </div>
  );
}
