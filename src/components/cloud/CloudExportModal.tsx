import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import Modal from '../common/Modal';
import { useCloudConnections } from '../../hooks/useCloudConnections';
import {
  startOAuthFlow,
  getConnection,
  isTokenValid,
  isProviderConfigured,
  uploadToGoogleDrive,
  uploadToDropbox,
} from '../../services/cloudExportService';
import type { CloudProvider, DocJourneyDocument } from '../../types';

interface CloudExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocJourneyDocument;
}

const PROVIDERS: { id: CloudProvider; name: string; icon: string }[] = [
  { id: 'google_drive', name: 'Google Drive', icon: '📁' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦' },
];

export default function CloudExportModal({ isOpen, onClose, document }: CloudExportModalProps) {
  const { connections, refresh } = useCloudConnections();
  const [uploading, setUploading] = useState<CloudProvider | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (isOpen) {
      refresh();
      setMessage('');
      setProgress(0);
    }
  }, [isOpen, refresh]);

  const isConnected = (provider: CloudProvider): boolean => {
    const conn = connections.find(c => c.provider === provider);
    return !!conn && isTokenValid(conn);
  };

  const handleConnect = async (provider: CloudProvider) => {
    try {
      await startOAuthFlow(provider);
      await refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erreur de connexion');
      setMessageType('error');
    }
  };

  const handleUpload = async (provider: CloudProvider) => {
    const conn = await getConnection(provider);
    if (!conn || !isTokenValid(conn)) {
      setMessage('Connexion expirée. Reconnectez-vous.');
      setMessageType('error');
      return;
    }

    setUploading(provider);
    setProgress(0);
    setMessage('');

    try {
      const fileName = document.metadata.originalName || document.name;

      if (provider === 'google_drive') {
        await uploadToGoogleDrive(conn.accessToken, fileName, document.content, document.mimeType, setProgress);
      } else {
        await uploadToDropbox(conn.accessToken, fileName, document.content, setProgress);
      }

      setMessage(`"${fileName}" exporté avec succès vers ${provider === 'google_drive' ? 'Google Drive' : 'Dropbox'}`);
      setMessageType('success');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Erreur lors de l'export");
      setMessageType('error');
    } finally {
      setUploading(null);
    }
  };

  const anyConfigured = PROVIDERS.some(p => isProviderConfigured(p.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export vers le Cloud" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          Exportez <span className="font-normal">{document.name}</span> vers un service cloud.
        </p>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down ${
            messageType === 'success'
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-red-50 text-red-700 ring-1 ring-red-200'
          }`}>
            {messageType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
          </div>
        )}

        {/* No providers configured */}
        {!anyConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                Aucun service cloud n'est configuré. Ajoutez vos Client IDs OAuth2 dans le fichier{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[11px]">.env</code>{' '}
                puis redémarrez le serveur. Consultez la section Cloud dans les Paramètres pour plus de détails.
              </p>
            </div>
          </div>
        )}

        {/* Providers */}
        <div className="space-y-3">
          {PROVIDERS.map(provider => {
            const connected = isConnected(provider.id);
            const configured = isProviderConfigured(provider.id);
            const isCurrentlyUploading = uploading === provider.id;

            return (
              <div
                key={provider.id}
                className={`p-4 rounded-xl border transition-colors ${
                  connected
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : configured
                      ? 'border-neutral-200'
                      : 'border-neutral-200 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{provider.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-normal text-neutral-800">{provider.name}</p>
                    <p className="text-[11px] text-neutral-400 font-normal">
                      {connected ? 'Connecté' : configured ? 'Non connecté' : 'Non configuré'}
                    </p>
                  </div>

                  {connected ? (
                    <button
                      onClick={() => handleUpload(provider.id)}
                      disabled={!!uploading}
                      className="btn-primary btn-sm"
                    >
                      {isCurrentlyUploading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      {isCurrentlyUploading ? `${progress}%` : 'Exporter'}
                    </button>
                  ) : configured ? (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      className="btn-secondary btn-sm"
                    >
                      <Cloud size={14} /> Connecter
                    </button>
                  ) : null}
                </div>

                {/* Progress bar */}
                {isCurrentlyUploading && progress > 0 && (
                  <div className="mt-3 w-full bg-neutral-200 rounded-full h-1.5">
                    <div
                      className="bg-neutral-900 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="btn-secondary w-full">Fermer</button>
      </div>
    </Modal>
  );
}
