import { useState, useEffect, useCallback } from 'react';
import type { BlockedWorkflowInfo } from '../types';
import { detectBlockedWorkflows } from '../services/blockageService';

export function useBlockedWorkflows() {
  const [blocked, setBlocked] = useState<BlockedWorkflowInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await detectBlockedWorkflows();
    setBlocked(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { blocked, loading, refresh };
}
