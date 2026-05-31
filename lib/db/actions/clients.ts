'use server';

import { connect } from '@/lib/db/connect';
import { Client, ActivityLog } from '@/lib/db/models/crm';
import { Project, Milestone, Task, ProjectRepo, SyncedGithubIssue } from '@/lib/db/models/projects';
import { Invoice, Note, FileRecord, Proposal, Cost } from '@/lib/db/models/docs';
import { Ticket } from '@/lib/db/models/tickets';
import { TimeEntry } from '@/lib/db/models/meta';
import { toPlain } from '@/lib/db/to-plain';
import { deleteFromGridFS } from '@/lib/storage/gridfs';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function listClients(showInternal = false) {
  await connect();
  const filter: Record<string, unknown> = {};
  if (!showInternal) filter.is_internal = false;

  const clients = await Client.find(filter).sort({ created_at: -1 }).lean({ virtuals: true });

  const enriched = await Promise.all(
    clients.map(async (c: any) => {
      const [activeProjects, invoices] = await Promise.all([
        Project.countDocuments({ client_id: c._id.toString(), status: { $ne: 'Completed' } }),
        Invoice.find({ client_id: c._id.toString() }).lean({ virtuals: true }),
      ]);

      const paid = invoices
        .filter((i: any) => i.status === 'Paid')
        .reduce((s: number, i: any) => s + i.total, 0);
      const outstanding = invoices
        .filter((i: any) => ['Sent', 'Overdue'].includes(i.status))
        .reduce((s: number, i: any) => s + i.total, 0);

      return {
        ...c,
        id: c._id.toString(),
        active_projects: activeProjects,
        total_revenue: paid,
        outstanding,
      };
    })
  );

  return toPlain(enriched);
}

export async function getClient(id: string) {
  await connect();
  return toPlain(await Client.findById(id).lean({ virtuals: true }));
}

export async function createClient(data: Record<string, unknown>) {
  await connect();
  const client = await Client.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(client.toObject({ virtuals: true }));
}

export async function updateClient(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Client.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteClient(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    await connect();

    const files = await FileRecord.find({ client_id: id }).lean();
    await Promise.all(files.map(async (file: any) => {
      try {
        await deleteFromGridFS(file.storage_path);
      } catch {
        // GridFS file may already be deleted
      }
    }));

    await ActivityLog.deleteMany({ entity_id: id });

    const clientProjects = await Project.find({ client_id: id }).lean({ virtuals: true });
    const projectIds = clientProjects.map((p: any) => p._id.toString());

    const childDeletions: Promise<any>[] = [
      FileRecord.deleteMany({ client_id: id }),
      Invoice.deleteMany({ client_id: id }),
    ];

    if (projectIds.length > 0) {
      childDeletions.push(
        Project.deleteMany({ _id: { $in: projectIds } }),
        Milestone.deleteMany({ project_id: { $in: projectIds } }),
        Task.deleteMany({ project_id: { $in: projectIds } }),
        Note.deleteMany({ project_id: { $in: projectIds } }),
        ProjectRepo.deleteMany({ project_id: { $in: projectIds } }),
        SyncedGithubIssue.deleteMany({ project_id: { $in: projectIds } }),
        Proposal.deleteMany({ project_id: { $in: projectIds } }),
        Cost.deleteMany({ project_id: { $in: projectIds } }),
        Ticket.deleteMany({ project_id: { $in: projectIds } }),
        TimeEntry.deleteMany({ project_id: { $in: projectIds } }),
      );
    }

    await Promise.all(childDeletions);

    const deleted = await Client.findByIdAndDelete(id).lean({ virtuals: true });
    if (!deleted) throw new Error('Client not found');

    revalidatePath('/clients');
    return toPlain(deleted);
  } catch (err) {
    console.error('Failed to delete client:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to delete client');
  }
}

export async function getClientCount() {
  await connect();
  return Client.countDocuments({ is_internal: false });
}
