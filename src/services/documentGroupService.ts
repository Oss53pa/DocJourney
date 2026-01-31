import JSZip from 'jszip';
import { db } from '../db';
import { generateId } from '../utils';
import { logActivity } from './activityService';
import type { DocumentGroup, DocJourneyDocument } from '../types';

export async function createGroup(name: string, documentIds: string[], description?: string): Promise<DocumentGroup> {
  const group: DocumentGroup = {
    id: generateId(),
    name,
    description,
    documentIds,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.documentGroups.add(group);
  await logActivity('group_created', `Groupe créé : ${name}`);
  return group;
}

export async function getAllGroups(): Promise<DocumentGroup[]> {
  return db.documentGroups.orderBy('updatedAt').reverse().toArray();
}

export async function getGroup(id: string): Promise<DocumentGroup | undefined> {
  return db.documentGroups.get(id);
}

export async function updateGroup(id: string, updates: Partial<Pick<DocumentGroup, 'name' | 'description'>>): Promise<void> {
  await db.documentGroups.update(id, { ...updates, updatedAt: new Date() });
  await logActivity('group_updated', `Groupe mis à jour`);
}

export async function deleteGroup(id: string): Promise<void> {
  const group = await db.documentGroups.get(id);
  await db.documentGroups.delete(id);
  if (group) {
    await logActivity('group_deleted', `Groupe supprimé : ${group.name}`);
  }
}

export async function addDocumentsToGroup(groupId: string, documentIds: string[]): Promise<void> {
  const group = await db.documentGroups.get(groupId);
  if (!group) return;
  const existing = new Set(group.documentIds);
  for (const id of documentIds) existing.add(id);
  await db.documentGroups.update(groupId, {
    documentIds: [...existing],
    updatedAt: new Date(),
  });
  await logActivity('group_updated', `Documents ajoutés au groupe ${group.name}`);
}

export async function removeDocumentFromGroup(groupId: string, documentId: string): Promise<void> {
  const group = await db.documentGroups.get(groupId);
  if (!group) return;
  await db.documentGroups.update(groupId, {
    documentIds: group.documentIds.filter(id => id !== documentId),
    updatedAt: new Date(),
  });
}

export async function getGroupDocuments(groupId: string): Promise<DocJourneyDocument[]> {
  const group = await db.documentGroups.get(groupId);
  if (!group) return [];
  const docs: DocJourneyDocument[] = [];
  for (const docId of group.documentIds) {
    const doc = await db.documents.get(docId);
    if (doc) docs.push(doc);
  }
  return docs;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

export async function exportGroupAsZip(groupId: string): Promise<void> {
  const group = await db.documentGroups.get(groupId);
  if (!group) throw new Error('Groupe introuvable');

  const docs = await getGroupDocuments(groupId);
  if (docs.length === 0) throw new Error('Aucun document dans le groupe');

  const zip = new JSZip();

  for (const doc of docs) {
    const blob = base64ToBlob(doc.content, doc.mimeType);
    zip.file(doc.metadata.originalName || doc.name, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
