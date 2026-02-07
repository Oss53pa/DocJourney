import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import type { DocJourneyDocument, DocumentRetention } from '../../types';
import { computeDocumentHash } from '../../services/integrityService';

interface IntegritySectionProps {
  doc: DocJourneyDocument;
  retention: DocumentRetention | undefined;
}

export default function IntegritySection({ doc, retention }: IntegritySectionProps) {
  const [hash, setHash] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [copied, setCopied] = useState(false);

  const isContentDeleted = retention?.deletedAt != null;
  const hasContent = doc.content && doc.content.length > 0;

  useEffect(() => {
    if (!hasContent || isContentDeleted) return;
    let cancelled = false;

    setComputing(true);
    computeDocumentHash(doc.content).then(h => {
      if (!cancelled) {
        setHash(h);
        setComputing(false);
      }
    }).catch(() => {
      if (!cancelled) setComputing(false);
    });

    return () => { cancelled = true; };
  }, [doc.content, hasContent, isContentDeleted]);

  const truncatedHash = hash
    ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}`
    : null;

  const handleCopy = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = hash;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card p-5 space-y-3">
      <h3 className="section-title flex items-center gap-1.5">
        <Shield size={12} />
        Intégrité du document
      </h3>

      {isContentDeleted ? (
        <div className="flex items-center gap-2.5 text-sm text-neutral-400">
          <XCircle size={16} className="flex-shrink-0" />
          <span>Vérification impossible — contenu supprimé</span>
        </div>
      ) : computing ? (
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          <span className="text-sm text-neutral-500">Calcul du hash en cours...</span>
        </div>
      ) : hash ? (
        <div className="space-y-3">
          {/* Hash display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">SHA-256 :</span>
            <code className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded-lg text-neutral-700">
              {truncatedHash}
            </code>
            <button onClick={handleCopy} className="btn-ghost btn-sm p-1.5" title="Copier le hash complet">
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          </div>

          {/* Integrity status */}
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-emerald-700 font-normal">Document intègre</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-sm text-neutral-400">
          <XCircle size={16} className="flex-shrink-0" />
          <span>Impossible de calculer le hash</span>
        </div>
      )}
    </div>
  );
}
