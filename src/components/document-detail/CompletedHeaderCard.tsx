import { FileText } from 'lucide-react';
import type { DocJourneyDocument, Workflow, DocumentRetention } from '../../types';
import { formatFileSize, formatDate } from '../../utils';
import { DocumentStatusBadge } from '../common/StatusBadge';
import RetentionBadge from '../retention/RetentionBadge';

interface CompletedHeaderCardProps {
  doc: DocJourneyDocument;
  workflow: Workflow;
  retention: DocumentRetention | undefined;
  docRef: string;
}

export default function CompletedHeaderCard({ doc, workflow, retention, docRef }: CompletedHeaderCardProps) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
          <FileText size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-medium text-neutral-900 tracking-tight break-words">
            {doc.name}
          </h1>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <DocumentStatusBadge status={doc.status} />
            <RetentionBadge retention={retention} />
          </div>

          {/* Metadata */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-neutral-500">
            <span>{formatFileSize(doc.size)}</span>
            {doc.metadata.pageCount && <span>{doc.metadata.pageCount} page{doc.metadata.pageCount > 1 ? 's' : ''}</span>}
            <span className="uppercase">{doc.metadata.extension}</span>
            {doc.metadata.category && <span className="badge-neutral">{doc.metadata.category}</span>}
          </div>

          {/* Reference */}
          <div className="mt-2">
            <span className="text-[11px] text-neutral-400">Réf. </span>
            <span className="text-xs font-mono text-neutral-600">{docRef}</span>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-neutral-500">
            <span>Créé le {formatDate(workflow.createdAt)}</span>
            {workflow.completedAt && (
              <span>Terminé le {formatDate(workflow.completedAt)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
