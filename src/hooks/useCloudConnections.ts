import { useState, useEffect, useCallback } from 'react';
import { getAllConnections } from '../services/cloudExportService';
import type { CloudConnection } from '../types';

export function useCloudConnections() {
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllConnections();
    setConnections(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { connections, loading, refresh };
}
