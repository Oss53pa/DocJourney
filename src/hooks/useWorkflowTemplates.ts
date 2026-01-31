import { useState, useEffect, useCallback } from 'react';
import { getAllTemplates } from '../services/workflowTemplateService';
import type { WorkflowTemplate } from '../types';

export function useWorkflowTemplates() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllTemplates();
    setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { templates, loading, refresh };
}
