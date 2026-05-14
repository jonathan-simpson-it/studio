'use server';

import { connect } from '@/lib/db/connect';
import { Client } from '@/lib/db/models/crm';
import { Project } from '@/lib/db/models/projects';
import { Invoice } from '@/lib/db/models/docs';
import { toPlain } from '@/lib/db/to-plain';

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
  return Client.findById(id).lean({ virtuals: true });
}

export async function createClient(data: Record<string, unknown>) {
  await connect();
  const client = await Client.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(client.toObject({ virtuals: true }));
}

export async function getClientCount() {
  await connect();
  return Client.countDocuments({ is_internal: false });
}
