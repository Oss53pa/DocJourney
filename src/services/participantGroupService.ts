import { db } from '../db';
import { generateId } from '../utils';
import type { ParticipantGroup, ParticipantRecord } from '../types';

export async function createGroup(
  name: string,
  description?: string,
  memberEmails: string[] = []
): Promise<ParticipantGroup> {
  const now = new Date();
  const group: ParticipantGroup = {
    id: generateId(),
    name,
    description,
    memberEmails,
    createdAt: now,
    updatedAt: now,
  };
  await db.participantGroups.add(group);
  return group;
}

export async function getGroup(id: string): Promise<ParticipantGroup | undefined> {
  return db.participantGroups.get(id);
}

export async function getAllGroups(): Promise<ParticipantGroup[]> {
  return db.participantGroups.orderBy('name').toArray();
}

export async function updateGroup(id: string, data: Partial<ParticipantGroup>): Promise<void> {
  await db.participantGroups.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteGroup(id: string): Promise<void> {
  await db.participantGroups.delete(id);
}

export async function addMember(groupId: string, email: string): Promise<void> {
  const group = await db.participantGroups.get(groupId);
  if (!group) return;
  if (!group.memberEmails.includes(email)) {
    group.memberEmails.push(email);
    group.updatedAt = new Date();
    await db.participantGroups.put(group);
  }
}

export async function removeMember(groupId: string, email: string): Promise<void> {
  const group = await db.participantGroups.get(groupId);
  if (!group) return;
  group.memberEmails = group.memberEmails.filter(e => e !== email);
  group.updatedAt = new Date();
  await db.participantGroups.put(group);
}

export async function getGroupMembers(groupId: string): Promise<ParticipantRecord[]> {
  const group = await db.participantGroups.get(groupId);
  if (!group) return [];
  const all = await db.participants.toArray();
  return all.filter(p => group.memberEmails.includes(p.email));
}
