import { db } from '../db';
import { generateId } from '../utils';
import { logActivity } from './activityService';
import type { CloudProvider, CloudConnection } from '../types';

// ---- OAuth2 Implicit Flow (popup) ----

function getOAuthConfig(provider: CloudProvider) {
  if (provider === 'google_drive') {
    return {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/callback`,
      scope: 'https://www.googleapis.com/auth/drive.file',
    };
  }
  return {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    clientId: import.meta.env.VITE_DROPBOX_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_DROPBOX_REDIRECT_URI || `${window.location.origin}/oauth/callback`,
    scope: '',
  };
}

export function isProviderConfigured(provider: CloudProvider): boolean {
  const config = getOAuthConfig(provider);
  return !!config.clientId;
}

export async function startOAuthFlow(provider: CloudProvider): Promise<CloudConnection | null> {
  const config = getOAuthConfig(provider);
  if (!config.clientId) {
    throw new Error(`Client ID non configuré pour ${provider === 'google_drive' ? 'Google Drive' : 'Dropbox'}. Configurez les variables d'environnement.`);
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'token',
    scope: config.scope,
    state,
  });

  if (provider === 'dropbox') {
    params.set('token_access_type', 'online');
  }

  const url = `${config.authUrl}?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const popup = window.open(url, 'oauth_popup', 'width=600,height=700,left=200,top=100');
    if (!popup) {
      reject(new Error('Impossible d\'ouvrir la fenêtre de connexion. Vérifiez les pop-ups.'));
      return;
    }

    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          resolve(null);
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl.includes(config.redirectUri) || popupUrl.includes('access_token')) {
          clearInterval(timer);

          const hash = popup.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

          popup.close();

          if (accessToken) {
            saveConnection(provider, accessToken, expiresIn).then(resolve).catch(reject);
          } else {
            resolve(null);
          }
        }
      } catch {
        // Cross-origin — wait for redirect
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(timer);
      if (!popup.closed) popup.close();
      resolve(null);
    }, 300000);
  });
}

export async function saveConnection(
  provider: CloudProvider,
  accessToken: string,
  expiresInSeconds: number
): Promise<CloudConnection> {
  // Remove existing connection for this provider
  const existing = await db.cloudConnections.where('provider').equals(provider).first();
  if (existing) {
    await db.cloudConnections.delete(existing.id);
  }

  const connection: CloudConnection = {
    id: generateId(),
    provider,
    accessToken,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    connectedAt: new Date(),
  };

  await db.cloudConnections.add(connection);
  await logActivity('cloud_connected', `Connecté à ${provider === 'google_drive' ? 'Google Drive' : 'Dropbox'}`);
  return connection;
}

export async function getConnection(provider: CloudProvider): Promise<CloudConnection | undefined> {
  return db.cloudConnections.where('provider').equals(provider).first();
}

export async function getAllConnections(): Promise<CloudConnection[]> {
  return db.cloudConnections.toArray();
}

export async function disconnectProvider(provider: CloudProvider): Promise<void> {
  const conn = await db.cloudConnections.where('provider').equals(provider).first();
  if (conn) {
    await db.cloudConnections.delete(conn.id);
    await logActivity('cloud_disconnected', `Déconnecté de ${provider === 'google_drive' ? 'Google Drive' : 'Dropbox'}`);
  }
}

export function isTokenValid(connection: CloudConnection): boolean {
  return new Date(connection.expiresAt) > new Date();
}

// ---- Upload to Google Drive (multipart) ----

export async function uploadToGoogleDrive(
  accessToken: string,
  fileName: string,
  fileContent: string, // Base64
  mimeType: string,
  onProgress?: (pct: number) => void
): Promise<{ id: string; name: string }> {
  onProgress?.(10);

  const bytes = atob(fileContent);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mimeType });

  const metadata = {
    name: fileName,
    mimeType,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  onProgress?.(30);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  onProgress?.(90);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur Google Drive: ${response.status} — ${error}`);
  }

  const result = await response.json();
  onProgress?.(100);

  await logActivity('cloud_exported', `Exporté "${fileName}" vers Google Drive`);
  return { id: result.id, name: result.name };
}

// ---- Upload to Dropbox ----

export async function uploadToDropbox(
  accessToken: string,
  fileName: string,
  fileContent: string, // Base64
  onProgress?: (pct: number) => void
): Promise<{ id: string; name: string }> {
  onProgress?.(10);

  const bytes = atob(fileContent);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr]);

  onProgress?.(30);

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path: `/${fileName}`,
        mode: 'add',
        autorename: true,
        mute: false,
      }),
    },
    body: blob,
  });

  onProgress?.(90);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur Dropbox: ${response.status} — ${error}`);
  }

  const result = await response.json();
  onProgress?.(100);

  await logActivity('cloud_exported', `Exporté "${fileName}" vers Dropbox`);
  return { id: result.id, name: result.name };
}
