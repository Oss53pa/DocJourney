import { useState, useEffect, useCallback, useRef } from 'react';
import type { ParticipantRecord } from '../types';
import { getAllParticipants, searchParticipants } from '../services/participantService';

export function useParticipants() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllParticipants();
    setParticipants(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { participants, loading, refresh };
}

export function useParticipantSearch(query: string) {
  const [results, setResults] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const data = await searchParticipants(query);
      setResults(data);
      setLoading(false);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, loading };
}
