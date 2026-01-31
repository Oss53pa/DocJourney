import { db } from '../db';
import { generateId, getDocumentType, getMimeType, getFileExtension, fileToBase64 } from '../utils';
import { logActivity } from './activityService';
import type { DocJourneyDocument, DocumentStatus } from '../types';

export async function importDocument(file: File): Promise<DocJourneyDocument> {
  const content = await fileToBase64(file);
  const docType = getDocumentType(file.name);
  const id = generateId();

  const doc: DocJourneyDocument = {
    id,
    name: file.name,
    type: docType,
    mimeType: getMimeType(file.name),
    content,
    size: file.size,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'draft',
    metadata: {
      originalName: file.name,
      extension: getFileExtension(file.name),
    },
  };

  await db.documents.add(doc);
  await logActivity('document_imported', `Document importé : ${file.name}`, id);

  return doc;
}

export async function getAllDocuments(): Promise<DocJourneyDocument[]> {
  return db.documents.orderBy('updatedAt').reverse().toArray();
}

export async function getDocument(id: string): Promise<DocJourneyDocument | undefined> {
  return db.documents.get(id);
}

export async function updateDocumentStatus(id: string, status: DocumentStatus) {
  await db.documents.update(id, { status, updatedAt: new Date() });
}

export async function updateDocument(id: string, updates: Partial<DocJourneyDocument>) {
  await db.documents.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteDocument(id: string) {
  // Delete associated workflow
  const workflows = await db.workflows.where('documentId').equals(id).toArray();
  for (const w of workflows) {
    await db.workflows.delete(w.id);
    // Delete validation reports
    await db.validationReports.where('workflowId').equals(w.id).delete();
  }
  // Delete activity log entries
  await db.activityLog.where('documentId').equals(id).delete();
  // Delete document
  await db.documents.delete(id);
}

export async function getDocumentsByStatus(status: DocumentStatus): Promise<DocJourneyDocument[]> {
  return db.documents.where('status').equals(status).reverse().sortBy('updatedAt');
}

export async function searchDocuments(query: string): Promise<DocJourneyDocument[]> {
  const lower = query.toLowerCase();
  const all = await db.documents.toArray();
  return all.filter(
    d =>
      d.name.toLowerCase().includes(lower) ||
      d.metadata.category?.toLowerCase().includes(lower) ||
      d.metadata.tags?.some(t => t.toLowerCase().includes(lower))
  );
}
