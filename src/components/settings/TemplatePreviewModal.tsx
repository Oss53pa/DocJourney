import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface TemplatePreviewModalProps {
  title: string;
  content: string;
  type: 'html' | 'pdf';
  onClose: () => void;
}

export default function TemplatePreviewModal({ title, content, type, onClose }: TemplatePreviewModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-7xl h-full max-h-[90vh] flex flex-col rounded-xl overflow-hidden shadow-2xl bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 flex-shrink-0">
          <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
          >
            <X size={18} className="text-neutral-500" />
          </button>
        </div>

        {/* Iframe */}
        <div className="flex-1 min-h-0">
          {type === 'html' ? (
            <iframe
              srcDoc={content}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-full border-none bg-white"
              title={title}
            />
          ) : (
            <iframe
              src={`data:application/pdf;base64,${content}`}
              className="w-full h-full border-none bg-white"
              title={title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
