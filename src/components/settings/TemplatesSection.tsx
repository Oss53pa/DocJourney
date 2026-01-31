import React, { useState } from 'react';
import { Mail, Globe, FileText, PenTool, Eye, Loader2, Layout } from 'lucide-react';
import { generateEmailPreview, generatePackagePreview, generateSignaturePackagePreview, generateReportPreview } from '../../data/templateMockData';
import TemplatePreviewModal from './TemplatePreviewModal';

interface TemplateCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'html' | 'pdf';
  generate: () => string;
}

const templates: TemplateCard[] = [
  {
    id: 'email',
    title: 'Email de validation',
    description: 'Email HTML envoyé aux participants pour les inviter à valider un document.',
    icon: <Mail size={16} className="text-white" />,
    type: 'html',
    generate: generateEmailPreview,
  },
  {
    id: 'package',
    title: 'Page de validation',
    description: 'Package HTML interactif avec visualiseur de document et outils d\'annotation.',
    icon: <Globe size={16} className="text-white" />,
    type: 'html',
    generate: generatePackagePreview,
  },
  {
    id: 'signature',
    title: 'Page de signature',
    description: 'Package HTML avec pad de signature électronique, certification et approbation finale.',
    icon: <PenTool size={16} className="text-white" />,
    type: 'html',
    generate: generateSignaturePackagePreview,
  },
  {
    id: 'report',
    title: 'Compte rendu de validation',
    description: 'Rapport PDF (CRV) imprimable résumant l\'ensemble du circuit de validation.',
    icon: <FileText size={16} className="text-white" />,
    type: 'pdf',
    generate: generateReportPreview,
  },
];

export default function TemplatesSection() {
  const [preview, setPreview] = useState<{ title: string; content: string; type: 'html' | 'pdf' } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePreview = (template: TemplateCard) => {
    setLoadingId(template.id);
    // Use setTimeout to let the spinner render before heavy generation work
    setTimeout(() => {
      try {
        const content = template.generate();
        setPreview({ title: template.title, content, type: template.type });
      } finally {
        setLoadingId(null);
      }
    }, 50);
  };

  return (
    <>
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
            <Layout size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Modèles</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Prévisualisation des templates utilisés dans le workflow</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-neutral-50 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0">
                  {t.icon}
                </div>
                <h3 className="text-xs font-medium text-neutral-900 leading-tight">{t.title}</h3>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed flex-1">{t.description}</p>
              <button
                onClick={() => handlePreview(t)}
                disabled={loadingId !== null}
                className="btn-secondary btn-sm w-full justify-center"
              >
                {loadingId === t.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Eye size={14} />
                )}
                Visualiser
              </button>
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <TemplatePreviewModal
          title={preview.title}
          content={preview.content}
          type={preview.type}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
