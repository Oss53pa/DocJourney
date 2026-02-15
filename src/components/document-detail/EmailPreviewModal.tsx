import React, { useState } from 'react';
import { Send, Mail } from 'lucide-react';
import Modal from '../common/Modal';
import type { DocJourneyDocument, Workflow, Settings } from '../../types';
import { copyToClipboard, sendEmailViaEmailJS, isEmailJSConfigured } from '../../services/emailService';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: DocJourneyDocument;
  workflow: Workflow;
  emailHtml: string;
  generatedPackageHtml: string;
  generatedHostedUrl: string;
  settings: Settings;
  onMessage: (msg: string, type: 'success' | 'error') => void;
  onSent: () => void;
}

export default function EmailPreviewModal({
  isOpen,
  onClose,
  doc,
  workflow,
  emailHtml,
  generatedPackageHtml,
  generatedHostedUrl,
  settings,
  onMessage,
  onSent,
}: EmailPreviewModalProps) {
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await sendEmailViaEmailJS(doc, workflow, workflow.currentStepIndex, settings, generatedPackageHtml, generatedHostedUrl);
      onMessage(`Email envoyé à ${workflow.steps[workflow.currentStepIndex].participant.name}`, 'success');
      onClose();
      onSent();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyText = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = emailHtml;
    copyToClipboard(tempDiv.innerText);
    onMessage('Email copié dans le presse-papier', 'success');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email d'accompagnement" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          {isEmailJSConfigured(settings)
            ? 'Envoyez cet email directement au participant. Le fichier HTML devra être joint séparément.'
            : 'Configurez EmailJS dans les paramètres pour envoyer directement depuis l\'application.'
          }
        </p>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 max-h-80 overflow-auto">
          <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {isEmailJSConfigured(settings) && (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="btn-primary flex-1"
            >
              {sendingEmail
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send size={15} />
              }
              {sendingEmail ? 'Envoi en cours...' : 'Envoyer par email'}
            </button>
          )}
          <button onClick={handleCopyText} className="btn-secondary flex-1">
            <Mail size={15} /> Copier le texte
          </button>
          <button onClick={onClose} className="btn-ghost flex-1">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}
