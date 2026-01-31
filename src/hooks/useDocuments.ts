import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { DocJourneyDocument } from '../types';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocJourneyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const docs = await db.documents.orderBy('updatedAt').reverse().toArray();
    setDocuments(docs);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, refresh };
}

export function useDocument(id: string | undefined) {
  const [document, setDocument] = useState<DocJourneyDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) { setDocument(null); setLoading(false); return; }
    setLoading(true);
    const doc = await db.documents.get(id);
    setDocument(doc || null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { document, loading, refresh };
}
