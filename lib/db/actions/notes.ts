'use server';

import { connect } from '@/lib/db/connect';
import { Note } from '@/lib/db/models/docs';
import { toPlain } from '@/lib/db/to-plain';

export async function listNotes() {
  await connect();
  return toPlain(await Note.find().sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getNote(id: string) {
  await connect();
  return toPlain(await Note.findById(id).lean({ virtuals: true }));
}

export async function createNote(data: Record<string, unknown>) {
  await connect();
  const note = await Note.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(note.toObject({ virtuals: true }));
}

export async function updateNote(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Note.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteNote(id: string) {
  await connect();
  return toPlain(await Note.findByIdAndDelete(id));
}

export async function getNotesForEntity(
  entityType: 'project' | 'client',
  entityId: string
) {
  const field = entityType === 'project' ? 'project_id' : 'client_id';
  await connect();
  return toPlain(await Note.find({ [field]: entityId }).sort({ created_at: -1 }).lean({ virtuals: true }));
}
