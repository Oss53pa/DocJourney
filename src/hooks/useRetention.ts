import { useState, useEffect, useCallback, useRef } from 'react';
import {
  processRetentions,
  getRetentionForDocument,
  getAllRetentions,
  getRetentionStats,
} from '../services/retentionService';
import type { DocumentRetention } from '../types';

export function useRetentionProcessor(enabled: boolean, intervalMs: number = 3600000) {
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!enabled) return;

    processRetentions();
    timerRef.current = setInterval(() => processRetentions(), intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, intervalMs]);
}

export function useDocumentRetention(documentId: string | undefined) {
  const [retention, setRetention] = useState<DocumentRetention | undefined>();
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!documentId) {
      setRetention(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    const r = await getRetentionForDocument(documentId);
    setRetention(r);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { retention, loading, refresh };
}

export function useRetentionDashboard() {
  const [records, setRecords] = useState<DocumentRetention[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    warned: 0,
    protected: 0,
    deleted: 0,
    pendingBackup: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [allRecords, retStats] = await Promise.all([
      getAllRetentions(),
      getRetentionStats(),
    ]);
    setRecords(allRecords);
    setStats(retStats);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { records, stats, loading, refresh };
}
