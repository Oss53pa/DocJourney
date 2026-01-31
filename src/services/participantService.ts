import { db } from '../db';
import type { ParticipantRecord } from '../types';

export async function getAllParticipants(): Promise<ParticipantRecord[]> {
  return db.participants.orderBy('name').toArray();
}

export async function searchParticipants(query: string): Promise<ParticipantRecord[]> {
  if (!query.trim()) return getAllParticipants();
  const lower = query.toLowerCase();
  const all = await db.participants.toArray();
  return all.filter(
    p =>
      p.name.toLowerCase().includes(lower) ||
      p.email.toLowerCase().includes(lower) ||
      (p.organization && p.organization.toLowerCase().includes(lower))
  );
}

export async function getParticipant(email: string): Promise<ParticipantRecord | undefined> {
  return db.participants.where('email').equals(email).first();
}

export async function getParticipantById(id: string): Promise<ParticipantRecord | undefined> {
  return db.participants.get(id);
}

export async function updateParticipant(id: string, data: Partial<ParticipantRecord>): Promise<void> {
  await db.participants.update(id, data);
}

export async function deleteParticipant(id: string): Promise<void> {
  await db.participants.delete(id);
}

export async function setAbsence(
  id: string,
  absent: boolean,
  start?: Date,
  end?: Date,
  substituteEmail?: string
): Promise<void> {
  await db.participants.update(id, {
    isAbsent: absent,
    absenceStart: start,
    absenceEnd: end,
    substituteEmail,
  });
}

export async function clearAbsence(id: string): Promise<void> {
  await db.participants.update(id, {
    isAbsent: false,
    absenceStart: undefined,
    absenceEnd: undefined,
    substituteEmail: undefined,
  });
}

export async function getAbsentParticipants(): Promise<ParticipantRecord[]> {
  const all = await db.participants.toArray();
  return all.filter(p => p.isAbsent);
}

export async function toggleFavorite(id: string): Promise<void> {
  const p = await db.participants.get(id);
  if (p) {
    await db.participants.update(id, { isFavorite: !p.isFavorite });
  }
}

export async function getSubstitute(email: string): Promise<ParticipantRecord | undefined> {
  const participant = await db.participants.where('email').equals(email).first();
  if (!participant?.isAbsent || !participant.substituteEmail) return undefined;
  return db.participants.where('email').equals(participant.substituteEmail).first();
}
