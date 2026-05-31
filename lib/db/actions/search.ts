'use server';

import { cache } from 'react';
import { connect } from '@/lib/db/connect';
import { Project } from '@/lib/db/models/projects';
import { Client } from '@/lib/db/models/crm';
import { Note } from '@/lib/db/models/docs';
import { toPlain } from '@/lib/db/to-plain';
import type { Project as ProjectType, Client as ClientType, Note as NoteType } from '@/types';

export interface SearchEntityResult {
  projects: Array<{ id: string; name: string; path: string }>;
  clients: Array<{ id: string; name: string; path: string }>;
  notes: Array<{ id: string; title: string; path: string }>;
}

export const searchEntities = cache(async function (
  query: string,
  limit = 10
): Promise<SearchEntityResult> {
  await connect();

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [projects, clients, notes] = await Promise.all([
    Project.find({ name: regex }).limit(limit).sort({ created_at: -1 }).lean({ virtuals: true }),
    Client.find({
      $or: [{ company_name: regex }, { contact_name: regex }],
    }).limit(limit).sort({ created_at: -1 }).lean({ virtuals: true }),
    Note.find({ title: regex }).limit(limit).sort({ created_at: -1 }).lean({ virtuals: true }),
  ]);

  return {
    projects: toPlain(projects).map((p: ProjectType) => ({
      id: p.id,
      name: p.name,
      path: `/projects/${p.id}`,
    })),
    clients: toPlain(clients).map((c: ClientType) => ({
      id: c.id,
      name: c.company_name,
      path: `/clients/${c.id}`,
    })),
    notes: toPlain(notes).map((n: NoteType) => ({
      id: n.id,
      title: n.title,
      path: `/notes/${n.id}`,
    })),
  };
});

export const searchProjects = cache(async function (
  query: string,
  limit = 10
): Promise<Array<{ id: string; name: string; path: string }>> {
  await connect();
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const projects = await Project.find({ name: regex })
    .limit(limit)
    .sort({ created_at: -1 })
    .lean({ virtuals: true });
  return toPlain(projects).map((p: ProjectType) => ({
    id: p.id,
    name: p.name,
    path: `/projects/${p.id}`,
  }));
});

export const searchClients = cache(async function (
  query: string,
  limit = 10
): Promise<Array<{ id: string; name: string; path: string }>> {
  await connect();
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const clients = await Client.find({
    $or: [{ company_name: regex }, { contact_name: regex }],
  })
    .limit(limit)
    .sort({ created_at: -1 })
    .lean({ virtuals: true });
  return toPlain(clients).map((c: ClientType) => ({
    id: c.id,
    name: c.company_name,
    path: `/clients/${c.id}`,
  }));
});

export const searchNotes = cache(async function (
  query: string,
  limit = 10
): Promise<Array<{ id: string; title: string; path: string }>> {
  await connect();
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const notes = await Note.find({ title: regex })
    .limit(limit)
    .sort({ created_at: -1 })
    .lean({ virtuals: true });
  return toPlain(notes).map((n: NoteType) => ({
    id: n.id,
    title: n.title,
    path: `/notes/${n.id}`,
  }));
});
