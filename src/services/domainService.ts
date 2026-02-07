import { db } from '../db';
import { generateId } from '../utils';
import { logActivity } from './activityService';
import type { AuthorizedDomain } from '../types';

// ── Queries ──

export async function getAllDomains(): Promise<AuthorizedDomain[]> {
  return db.authorizedDomains.orderBy('createdAt').toArray();
}

export async function getActiveDomains(): Promise<AuthorizedDomain[]> {
  return db.authorizedDomains.where('isActive').equals(1).toArray();
}

// ── CRUD ──

export async function addDomain(
  domain: string,
  description?: string,
  allowSubdomains?: boolean
): Promise<AuthorizedDomain> {
  const normalised = domain.trim().toLowerCase();

  if (await isDomainDuplicate(normalised)) {
    throw new Error(`Le domaine "${normalised}" existe déjà.`);
  }

  const now = new Date();
  const entry: AuthorizedDomain = {
    id: generateId(),
    domain: normalised,
    description,
    allowSubdomains: allowSubdomains ?? true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.authorizedDomains.add(entry);
  await logActivity('domain_added', `Domaine autorisé ajouté : ${normalised}`);
  return entry;
}

export async function updateDomain(
  id: string,
  updates: Partial<Pick<AuthorizedDomain, 'domain' | 'description' | 'allowSubdomains' | 'isActive'>>
): Promise<void> {
  if (updates.domain) {
    updates.domain = updates.domain.trim().toLowerCase();
    if (await isDomainDuplicate(updates.domain, id)) {
      throw new Error(`Le domaine "${updates.domain}" existe déjà.`);
    }
  }
  await db.authorizedDomains.update(id, { ...updates, updatedAt: new Date() });
}

export async function removeDomain(id: string): Promise<void> {
  const domain = await db.authorizedDomains.get(id);
  await db.authorizedDomains.delete(id);
  await logActivity('domain_removed', `Domaine autorisé supprimé : ${domain?.domain ?? id}`);
}

export async function toggleDomainActive(id: string): Promise<void> {
  const domain = await db.authorizedDomains.get(id);
  if (!domain) return;
  await db.authorizedDomains.update(id, {
    isActive: !domain.isActive,
    updatedAt: new Date(),
  });
}

// ── Validation ──

export async function isEmailDomainAuthorized(
  email: string
): Promise<{ authorized: boolean; matchedDomain?: string }> {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return { authorized: false };

  const settings = await db.settings.get('default');
  const caseSensitive = settings?.domainCaseSensitive ?? false;

  let emailDomain = email.slice(atIndex + 1).trim();
  if (!caseSensitive) emailDomain = emailDomain.toLowerCase();

  const domains = await db.authorizedDomains.where('isActive').equals(1).toArray();

  for (const d of domains) {
    const target = caseSensitive ? d.domain : d.domain.toLowerCase();

    // Exact match
    if (emailDomain === target) {
      return { authorized: true, matchedDomain: d.domain };
    }

    // Subdomain match
    if (d.allowSubdomains && emailDomain.endsWith('.' + target)) {
      return { authorized: true, matchedDomain: d.domain };
    }
  }

  return { authorized: false };
}

export async function isDomainDuplicate(domain: string, excludeId?: string): Promise<boolean> {
  const normalised = domain.trim().toLowerCase();
  const all = await db.authorizedDomains.toArray();
  return all.some(d => d.domain.toLowerCase() === normalised && d.id !== excludeId);
}
