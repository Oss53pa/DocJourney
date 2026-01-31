import { useState, useEffect, useCallback } from 'react';
import { getAllGroups, getGroup, getGroupDocuments } from '../services/documentGroupService';
import type { DocumentGroup, DocJourneyDocument } from '../types';

export function useDocumentGroups() {
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllGroups();
    setGroups(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { groups, loading, refresh };
}

export function useDocumentGroup(id: string | undefined) {
  const [group, setGroup] = useState<DocumentGroup | null>(null);
  const [documents, setDocuments] = useState<DocJourneyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const g = await getGroup(id);
    setGroup(g || null);
    if (g) {
      const docs = await getGroupDocuments(id);
      setDocuments(docs);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { group, documents, loading, refresh };
}
