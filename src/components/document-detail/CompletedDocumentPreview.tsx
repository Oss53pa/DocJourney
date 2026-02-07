import { useState } from 'react';
import { FileText, Maximize2, Image, File } from 'lucide-react';
import type { DocJourneyDocument, DocumentRetention } from '../../types';
import Modal from '../common/Modal';

interface CompletedDocumentPreviewProps {
  doc: DocJourneyDocument;
  retention: DocumentRetention | undefined;
}

export default function CompletedDocumentPreview({ doc, retention }: CompletedDocumentPreviewProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  const isContentDeleted = retention?.deletedAt != null;
  const isPdf = doc.type === 'pdf';
  const isImage = doc.type === 'image';
  const hasContent = doc.content && doc.content.length > 0;

  const dataUri = hasContent
    ? `data:${doc.mimeType};base64,${doc.content}`
    : '';

  return (
    <>
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Aperçu du document</h3>
          {hasContent && !isContentDeleted && (
            <button onClick={() => setShowFullscreen(true)} className="btn-ghost btn-sm">
              <Maximize2 size={14} /> Plein écran
            </button>
          )}
        </div>

        {isContentDeleted ? (
          <div className="flex flex-col items-center justify-center h-[300px] bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
            <FileText size={40} className="text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-400">Contenu supprimé par la politique de rétention</p>
          </div>
        ) : !hasContent ? (
          <div className="flex flex-col items-center justify-center h-[300px] bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
            <File size={40} className="text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-400">Aucun contenu disponible</p>
          </div>
        ) : isPdf ? (
          <div className="rounded-xl overflow-hidden border border-neutral-200">
            <object
              data={dataUri}
              type="application/pdf"
              className="w-full h-[400px]"
            >
              <div className="flex flex-col items-center justify-center h-[400px] bg-neutral-50">
                <FileText size={40} className="text-neutral-300 mb-3" />
                <p className="text-sm text-neutral-400">Aperçu PDF non disponible</p>
              </div>
            </object>
          </div>
        ) : isImage ? (
          <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
            <img
              src={dataUri}
              alt={doc.name}
              className="max-h-[400px] object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
            <File size={40} className="text-neutral-300 mb-3" />
            <p className="text-sm font-medium text-neutral-500">{doc.name}</p>
            <p className="text-xs text-neutral-400 mt-1">{doc.metadata.extension.toUpperCase()}</p>
          </div>
        )}

        {/* Page count */}
        {doc.metadata.pageCount && (
          <p className="text-xs text-neutral-400 text-center">
            {doc.metadata.pageCount} page{doc.metadata.pageCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Modal isOpen={showFullscreen} onClose={() => setShowFullscreen(false)} title={doc.name} size="xl">
        {isPdf ? (
          <object
            data={dataUri}
            type="application/pdf"
            className="w-full h-[70vh]"
          >
            <p className="text-sm text-neutral-400 text-center py-10">Aperçu PDF non disponible</p>
          </object>
        ) : isImage ? (
          <div className="flex items-center justify-center">
            <img src={dataUri} alt={doc.name} className="max-w-full max-h-[70vh] object-contain" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Image size={48} className="text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-500">Aperçu non disponible pour ce format</p>
          </div>
        )}
      </Modal>
    </>
  );
}
