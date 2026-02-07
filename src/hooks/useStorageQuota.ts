import { useState, useEffect } from 'react';
import {
  getStorageQuota,
  type StorageQuotaInfo,
} from '../services/storageQuotaService';

interface UseStorageQuotaResult {
  quota: StorageQuotaInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to monitor storage quota
 * Automatically refreshes periodically
 */
export function useStorageQuota(refreshInterval = 5 * 60 * 1000): UseStorageQuotaResult {
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const info = await getStorageQuota();
      setQuota(info);
    } catch (error) {
      console.error('Error fetching storage quota:', error);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));

    // Refresh periodically
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { quota, loading, refresh };
}
