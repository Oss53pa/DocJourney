import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthorizedDomain } from '../types';
import {
  getAllDomains,
  addDomain as addDomainService,
  updateDomain as updateDomainService,
  removeDomain as removeDomainService,
  toggleDomainActive as toggleDomainActiveService,
  isEmailDomainAuthorized,
} from '../services/domainService';

export function useDomains() {
  const [domains, setDomains] = useState<AuthorizedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await getAllDomains();
    setDomains(all);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addDomain = async (domain: string, description?: string, allowSubdomains?: boolean) => {
    const entry = await addDomainService(domain, description, allowSubdomains);
    await refresh();
    return entry;
  };

  const updateDomain = async (
    id: string,
    updates: Partial<Pick<AuthorizedDomain, 'domain' | 'description' | 'allowSubdomains' | 'isActive'>>
  ) => {
    await updateDomainService(id, updates);
    await refresh();
  };

  const removeDomain = async (id: string) => {
    await removeDomainService(id);
    await refresh();
  };

  const toggleActive = async (id: string) => {
    await toggleDomainActiveService(id);
    await refresh();
  };

  const validateEmail = async (email: string) => {
    return isEmailDomainAuthorized(email);
  };

  const filteredDomains = useMemo(() => {
    if (!searchQuery.trim()) return domains;
    const lower = searchQuery.toLowerCase();
    return domains.filter(
      d =>
        d.domain.toLowerCase().includes(lower) ||
        (d.description ?? '').toLowerCase().includes(lower)
    );
  }, [domains, searchQuery]);

  return {
    domains,
    loading,
    searchQuery,
    setSearchQuery,
    refresh,
    addDomain,
    updateDomain,
    removeDomain,
    toggleActive,
    validateEmail,
    filteredDomains,
  };
}
