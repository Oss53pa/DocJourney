import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { AppSettings, RetentionMode, DocumentStatus } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  ownerName: '',
  ownerEmail: '',
  ownerOrganization: '',
  theme: 'light',
  // EmailJS configuration
  emailjsServiceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
  emailjsTemplateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
  emailjsPublicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
  // Firebase Sync configuration (from environment variables)
  firebaseSyncEnabled: !!import.meta.env.VITE_FIREBASE_API_KEY,
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  firebaseDatabaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  // Retention policy
  retentionEnabled: true,
  retentionDays: 7,
  retentionMode: 'content_only' as RetentionMode,
  retentionNotifyBeforeDeletion: true,
  retentionNotifyDaysBefore: 2,
  retentionAutoBackupToCloud: true,
  retentionExcludeStatuses: [] as DocumentStatus[],
  // Domain whitelist
  defaultAllowSubdomains: true,
  domainCaseSensitive: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await db.settings.get('default');
    // Merge stored settings with defaults to ensure new fields are available
    setSettings({ ...DEFAULT_SETTINGS, ...s });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    await db.settings.put(newSettings);
    setSettings(newSettings);
  };

  return { settings, loading, updateSettings, refresh };
}
