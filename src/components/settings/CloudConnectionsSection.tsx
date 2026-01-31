import React, { useState } from 'react';
import { Cloud, CheckCircle2, XCircle, Unlink, Link, AlertCircle, ExternalLink } from 'lucide-react';
import { useCloudConnections } from '../../hooks/useCloudConnections';
import { startOAuthFlow, disconnectProvider, isTokenValid, isProviderConfigured } from '../../services/cloudExportService';
import type { CloudProvider } from '../../types';

const PROVIDERS: { id: CloudProvider; name: string; icon: string; consoleUrl: string; consoleLabel: string; envVar: string }[] = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    icon: '📁',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    consoleLabel: 'Google Cloud Console',
    envVar: 'VITE_GOOGLE_CLIENT_ID',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    consoleUrl: 'https://www.dropbox.com/developers/apps',
    consoleLabel: 'Dropbox App Console',
    envVar: 'VITE_DROPBOX_CLIENT_ID',
  },
];

export default function CloudConnectionsSection() {
  const { connections, refresh } = useCloudConnections();
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<CloudProvider | null>(null);

  const getConnection = (provider: CloudProvider) => connections.find(c => c.provider === provider);

  const handleConnect = async (provider: CloudProvider) => {
    setError('');
    setConnecting(provider);
    try {
      await startOAuthFlow(provider);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: CloudProvider) => {
    await disconnectProvider(provider);
    await refresh();
  };

  const allUnconfigured = PROVIDERS.every(p => !isProviderConfigured(p.id));

  return (
    <div className="card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
          <Cloud size={16} className="text-sky-600" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Connexions Cloud</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Exportez vos documents vers le cloud</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-normal ring-1 ring-red-200 animate-slide-down">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Configuration guide when nothing is configured */}
      {allUnconfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-normal text-amber-800">
                Configuration requise
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Pour activer l'export cloud, créez un fichier <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[11px]">.env</code> à la racine du projet avec vos Client IDs OAuth2 :
              </p>
              <pre className="bg-amber-100/50 border border-amber-200 rounded-lg p-3 text-[11px] font-mono text-amber-900 leading-relaxed overflow-x-auto">
{`VITE_GOOGLE_CLIENT_ID=votre-id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=${window.location.origin}/oauth/callback

VITE_DROPBOX_CLIENT_ID=votre-app-key
VITE_DROPBOX_REDIRECT_URI=${window.location.origin}/oauth/callback`}
              </pre>
              <p className="text-xs text-amber-700">
                Puis redémarrez le serveur de développement.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {PROVIDERS.map(provider => {
          const conn = getConnection(provider.id);
          const connected = !!conn && isTokenValid(conn);
          const configured = isProviderConfigured(provider.id);

          return (
            <div
              key={provider.id}
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                connected
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : configured
                    ? 'border-neutral-200 bg-neutral-50'
                    : 'border-neutral-200 bg-neutral-50 opacity-60'
              }`}
            >
              <span className="text-lg">{provider.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-normal text-neutral-800">{provider.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {connected ? (
                    <>
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span className="text-[11px] text-emerald-600 font-normal">Connecté</span>
                    </>
                  ) : configured ? (
                    <>
                      <XCircle size={12} className="text-neutral-400" />
                      <span className="text-[11px] text-neutral-400 font-normal">Non connecté</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-neutral-400 font-normal">
                      <code className="font-mono">{provider.envVar}</code> non configuré
                    </span>
                  )}
                </div>
              </div>

              {connected ? (
                <button
                  onClick={() => handleDisconnect(provider.id)}
                  className="btn-ghost btn-sm text-red-500 hover:bg-red-50"
                >
                  <Unlink size={14} /> Déconnecter
                </button>
              ) : configured ? (
                <button
                  onClick={() => handleConnect(provider.id)}
                  disabled={connecting === provider.id}
                  className="btn-secondary btn-sm"
                >
                  {connecting === provider.id ? (
                    <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                  ) : (
                    <Link size={14} />
                  )}
                  Connecter
                </button>
              ) : (
                <a
                  href={provider.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost btn-sm text-sky-600 hover:bg-sky-50"
                >
                  <ExternalLink size={14} /> {provider.consoleLabel}
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-neutral-400 leading-relaxed">
        La connexion utilise OAuth2 (implicit flow). Vos identifiants ne sont jamais stockés — seul le token d'accès temporaire est conservé localement.
      </p>
    </div>
  );
}
