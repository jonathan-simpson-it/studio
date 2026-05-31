'use server';

import { connect } from '@/lib/db/connect';
import { ActivityLog, Lead, Client } from '@/lib/db/models/crm';
import { Project, Task, ProjectRepo } from '@/lib/db/models/projects';
import { Invoice, Proposal, Note, FileRecord } from '@/lib/db/models/docs';
import { Ticket } from '@/lib/db/models/tickets';
import { User } from '@/lib/db/models/core';
import { toPlain } from '@/lib/db/to-plain';

export async function getLeadDetail(id: string) {
  await connect();
  const [lead, proposals] = await Promise.all([
    Lead.findById(id).lean({ virtuals: true }),
    Proposal.find({}).sort({ sent_at: -1 }).lean({ virtuals: true }),
  ]);
  if (!lead) return null;

  const activity = await ActivityLog.find({ entity_id: id })
    .sort({ created_at: -1 }).limit(20).lean({ virtuals: true });

  return toPlain({ ...lead, proposals, activity });
}

export async function convertLeadToClient(
  leadId: string,
  clientId: string,
  projectId: string
) {
  await connect();
  await Lead.findByIdAndUpdate(leadId, {
    stage: 'Won',
    converted_at: new Date(),
    converted_client_id: clientId,
    updated_at: new Date(),
  });
}

export async function getClientDetail(id: string) {
  await connect();
  const [client, projects, contacts, notes, files, proposals, invoices, tickets] = await Promise.all([
    Client.findById(id).lean({ virtuals: true }),
    Project.find({ client_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    (await import('@/lib/db/models/crm')).Contact.find({ client_id: id }).lean({ virtuals: true }),
    Note.find({ client_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    FileRecord.find({ client_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    Proposal.find({ client_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    Invoice.find({ client_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    Ticket.find({ client_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
  ]);
  if (!client) return null;

  const projectIds = projects.map((p: any) => p._id.toString());
  const projectRepos = projectIds.length > 0
    ? await ProjectRepo.find({ project_id: { $in: projectIds } }).lean({ virtuals: true })
    : [];
  const projectRepoMap = new Map(projectRepos.map((r: any) => [r.project_id, r.full_name]));

  const activity = await ActivityLog.find({ entity_id: id })
    .sort({ created_at: -1 }).limit(20).lean({ virtuals: true });

  const projectMap = new Map(projects.map((p: any) => [p._id.toString(), p.name]));

  const ticketsWithProject = tickets.map((t: any) => ({
    ...t,
    project_name: t.project_id ? projectMap.get(t.project_id.toString()) || null : null,
    project_repo: t.project_id ? projectRepoMap.get(t.project_id.toString()) || null : null,
  }));

  return toPlain({ ...client, projects, contacts, notes, files, proposals, invoices, tickets: ticketsWithProject, activity });
}

export async function createActivityLog(data: {
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  meta?: Record<string, unknown>;
}) {
  await connect();
  const log = await ActivityLog.create({
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    action: data.action,
    actor_id: data.actor_id,
    meta: data.meta || {},
    created_at: new Date(),
  });
  return toPlain(log.toObject({ virtuals: true }));
}

export async function getActivityForEntity(entityId: string) {
  await connect();
  return toPlain(await ActivityLog.find({ entity_id: entityId })
    .sort({ created_at: -1 }).limit(20).lean({ virtuals: true }));
}

export async function listActivityLog(options: {
  entity_type?: string;
  action?: string;
  actor_id?: string;
  limit?: number;
  offset?: number;
} = {}) {
  await connect();
  const { entity_type, action, actor_id, limit = 50, offset = 0 } = options;
  const filter: Record<string, unknown> = {};
  if (entity_type) filter.entity_type = entity_type;
  if (action) filter.action = action;
  if (actor_id) filter.actor_id = actor_id;

  const [entries, total] = await Promise.all([
    ActivityLog.find(filter).sort({ created_at: -1 }).skip(offset).limit(limit).lean({ virtuals: true }),
    ActivityLog.countDocuments(filter),
  ]);

  const userIds = [...new Set(entries.map((e: any) => e.actor_id))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('full_name').lean({ virtuals: true });
  const userMap = new Map(users.map((u: any) => [u._id.toString(), u.full_name]));

  return {
    entries: toPlain(entries.map((e: any) => ({
      ...e,
      actor: { full_name: userMap.get(e.actor_id?.toString()) || null },
    }))),
    total,
    limit,
    offset,
  };
}

export async function getRecentActivity() {
  await connect();
  const entries = await ActivityLog.find()
    .sort({ created_at: -1 }).limit(10).lean({ virtuals: true });

  const userIds = [...new Set(entries.map((e: any) => e.actor_id))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('full_name').lean({ virtuals: true });
  const userMap = new Map(users.map((u: any) => [u._id.toString(), u.full_name]));

  return toPlain(entries.map((e: any) => ({
    ...e,
    actor: { full_name: userMap.get(e.actor_id?.toString()) || null },
  })));
}
