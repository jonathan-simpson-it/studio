'use server';

import mongoose from 'mongoose';
import { connect } from '@/lib/db/connect';
import { Note } from '@/lib/db/models/docs';
import { toPlain } from '@/lib/db/to-plain';
import type { Note as NoteType } from '@/types';

export async function listNotes(opts: {
  cursor?: string;
  query?: string;
  tags?: string[];
  entityType?: 'project' | 'client';
  entityId?: string;
  sort?: 'newest' | 'oldest' | 'title';
  limit?: number;
} = {}) {
  await connect();
  const { cursor, query, tags, entityType, entityId, sort = 'newest', limit = 20 } = opts;

  const filter: Record<string, unknown> = {};

  if (query) {
    filter.$text = { $search: query };
  }
  if (tags?.length) {
    filter.tags = { $in: tags };
  }
  if (entityType && entityId) {
    const field = entityType === 'project' ? 'project_id' : 'client_id';
    filter[field] = entityId;
  }

  let sortOption: Record<string, unknown> = {};
  if (query) {
    sortOption = { score: { $meta: 'textScore' }, _id: -1 } as Record<string, unknown>;
  } else if (sort === 'oldest') {
    sortOption = { created_at: 1 as const, _id: 1 as const };
  } else if (sort === 'title') {
    sortOption = { title: 1 as const, _id: 1 as const };
  } else {
    sortOption = { created_at: -1 as const, _id: -1 as const };
  }

  if (cursor && sort !== 'title' && !query) {
    const dir = sort === 'oldest' ? '$gt' : '$lt';
    filter._id = { [dir]: new mongoose.Types.ObjectId(cursor) };
  }

  let skip = 0;
  if (cursor && (query || sort === 'title')) {
    skip = parseInt(cursor, 10) || 0;
  }

  const notes = toPlain(
    await Note.find(filter).sort(sortOption as Record<string, 1 | -1 | { $meta: string }>).skip(skip).limit(limit + 1).lean({ virtuals: true })
  ) as NoteType[];

  const hasMore = notes.length > limit;
  if (hasMore) notes.pop();

  const nextCursor = hasMore
    ? query || sort === 'title'
      ? String(skip + limit)
      : notes[notes.length - 1].id
    : null;

  let pinned: NoteType[] = [];
  if (!cursor) {
    const pinnedFilter = { ...filter };
    delete (pinnedFilter as Record<string, unknown>).$text;
    (pinnedFilter as Record<string, unknown>).is_pinned = true;
    pinned = toPlain(
      await Note.find(pinnedFilter).sort(sortOption as Record<string, 1 | -1>).lean({ virtuals: true })
    ) as NoteType[];
  }

  return { notes, pinned, nextCursor };
}

export async function getNote(id: string) {
  await connect();
  return toPlain(await Note.findById(id).lean({ virtuals: true })) as NoteType | null;
}

export async function createNote(data: Record<string, unknown>) {
  await connect();
  const note = await Note.create({ ...data, tags: [], is_pinned: false, parent_note_id: null, created_at: new Date(), updated_at: new Date() });
  return toPlain(note.toObject({ virtuals: true })) as NoteType;
}

export async function updateNote(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Note.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true })) as NoteType | null;
}

export async function deleteNote(id: string) {
  await connect();
  return toPlain(await Note.findByIdAndDelete(id));
}

export async function togglePin(id: string) {
  await connect();
  const note = await Note.findById(id).select('is_pinned').lean({ virtuals: true });
  if (!note) throw new Error('Note not found');
  return toPlain(await Note.findByIdAndUpdate(
    id,
    { is_pinned: !note.is_pinned, updated_at: new Date() },
    { returnDocument: 'after' }
  ).lean({ virtuals: true })) as NoteType | null;
}

export async function updateTags(id: string, tags: string[]) {
  await connect();
  return toPlain(await Note.findByIdAndUpdate(
    id,
    { tags, updated_at: new Date() },
    { returnDocument: 'after' }
  ).lean({ virtuals: true })) as NoteType | null;
}

export async function getNoteBacklinks(id: string) {
  await connect();
  return toPlain(
    await Note.find({ body: { $regex: `\\[\\[${escapeRegex(id)}\\]\\]` } }).sort({ created_at: -1 }).lean({ virtuals: true })
  ) as NoteType[];
}

export async function getNotesForEntity(
  entityType: 'project' | 'client',
  entityId: string
) {
  const field = entityType === 'project' ? 'project_id' : 'client_id';
  await connect();
  return toPlain(await Note.find({ [field]: entityId }).sort({ created_at: -1 }).lean({ virtuals: true })) as NoteType[];
}

export async function getAllTags() {
  await connect();
  const result = await Note.distinct('tags');
  return result as string[];
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
