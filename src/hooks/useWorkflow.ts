import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { Workflow } from '../types';

export function useWorkflow(id: string | undefined) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) { setWorkflow(null); setLoading(false); return; }
    setLoading(true);
    const wf = await db.workflows.get(id);
    setWorkflow(wf || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { workflow, loading, refresh };
}

export function useWorkflowByDocument(documentId: string | undefined) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!documentId) { setWorkflow(null); setLoading(false); return; }
    setLoading(true);
    const wf = await db.workflows.where('documentId').equals(documentId).first();
    setWorkflow(wf || null);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { workflow, loading, refresh };
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const wfs = await db.workflows.orderBy('createdAt').reverse().toArray();
    setWorkflows(wfs);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { workflows, loading, refresh };
}
