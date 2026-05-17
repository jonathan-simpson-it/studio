'use server';

import { connect } from '@/lib/db/connect';
import { Cost, Invoice } from '@/lib/db/models/docs';
import { Client } from '@/lib/db/models/crm';
import { toPlain } from '@/lib/db/to-plain';

export async function listCosts() {
  await connect();
  return toPlain(await Cost.find().sort({ date: -1 }).lean({ virtuals: true }));
}

export async function createCost(data: Record<string, unknown>) {
  await connect();
  const cost = await Cost.create(data);
  return toPlain(cost.toObject({ virtuals: true }));
}

export async function listFinanceData() {
  await connect();
  const [invoices, costs, clients] = await Promise.all([
    Invoice.find({ status: { $in: ['Sent', 'Overdue', 'Paid'] } }).lean({ virtuals: true }),
    Cost.find().sort({ date: -1 }).lean({ virtuals: true }),
    Client.find({ is_internal: false }).lean({ virtuals: true }),
  ]);
  return toPlain({ invoices, costs, clients });
}
