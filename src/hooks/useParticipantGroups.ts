import { useState, useEffect, useCallback } from 'react';
import type { ParticipantGroup } from '../types';
import { getAllGroups } from '../services/participantGroupService';

export function useParticipantGroups() {
  const [groups, setGroups] = useState<ParticipantGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllGroups();
    setGroups(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { groups, loading, refresh };
}
