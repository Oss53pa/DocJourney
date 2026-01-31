import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  ownerName: '',
  ownerEmail: '',
  ownerOrganization: '',
  theme: 'light',
  // EmailJS configuration (préconfigurée)
  emailjsServiceId: 'service_fptbtnx',
  emailjsTemplateId: 'template_ih65oh8',
  emailjsPublicKey: 'UqTT-gaCEOyELzhy_',
  // Firebase Sync configuration (préconfigurée)
  firebaseSyncEnabled: true,
  firebaseApiKey: 'AIzaSyCqyTjJVgOZC_ThkP2ckjCOPQ9XZWjv35Q',
  firebaseDatabaseURL: 'https://docjourney-default-rtdb.firebaseio.com',
  firebaseProjectId: 'docjourney',
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
