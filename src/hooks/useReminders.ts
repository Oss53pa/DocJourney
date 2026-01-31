import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDueReminders,
  getUpcomingDeadlines,
  markReminderAsSent,
  sendBrowserNotification,
} from '../services/reminderService';
import type { Workflow } from '../types';

export function useReminderChecker(enabled: boolean, intervalMs: number = 60000) {
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!enabled) return;

    const check = async () => {
      const due = await getDueReminders();
      for (const reminder of due) {
        sendBrowserNotification('DocJourney — Rappel', reminder.message);
        await markReminderAsSent(reminder.id);
      }
    };

    check();
    timerRef.current = setInterval(check, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, intervalMs]);
}

export function useUpcomingDeadlines(days: number = 7) {
  const [deadlines, setDeadlines] = useState<{
    workflow: Workflow;
    daysRemaining: number;
    documentName: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getUpcomingDeadlines(days);
    setDeadlines(data);
    setLoading(false);
  }, [days]);

  useEffect(() => { refresh(); }, [refresh]);

  return { deadlines, loading, refresh };
}
