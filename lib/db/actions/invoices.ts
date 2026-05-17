'use server';

import { connect } from '@/lib/db/connect';
import { Proposal, Invoice, FileRecord } from '@/lib/db/models/docs';
import { DocNumberSequence } from '@/lib/db/models/meta';
import { Client } from '@/lib/db/models/crm';
import { toPlain } from '@/lib/db/to-plain';

export async function listProposals() {
  await connect();
  return toPlain(await Proposal.find().sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getProposal(id: string) {
  await connect();
  const proposal = await Proposal.findById(id).lean({ virtuals: true });
  if (!proposal) return null;

  const [client, invoices, projects] = await Promise.all([
    Client.findById(proposal.client_id).lean({ virtuals: true }),
    Invoice.find({ source_proposal_id: id }).lean({ virtuals: true }),
    (await import('@/lib/db/models/projects')).Project.find({ source_proposal_id: id }).lean({ virtuals: true }),
  ]);

  return toPlain({ ...proposal, client, invoices, projects });
}

export async function createProposal(data: Record<string, unknown>) {
  await connect();
  const proposal = await Proposal.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(proposal.toObject({ virtuals: true }));
}

export async function updateProposal(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Proposal.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteProposal(id: string) {
  await connect();
  return Proposal.findByIdAndDelete(id);
}

export async function getProposalNumber(): Promise<string> {
  await connect();
  const now = new Date();
  const year = now.getFullYear();
  const seq = await DocNumberSequence.findOneAndUpdate(
    { entity_type: 'proposal', year },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return `PROP-${year}-${String(seq.sequence).padStart(4, '0')}`;
}

export async function listInvoices() {
  await connect();
  return toPlain(await Invoice.find().sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getInvoice(id: string) {
  await connect();
  const invoice = await Invoice.findById(id).lean({ virtuals: true });
  if (!invoice) return null;

  const client = await Client.findById(invoice.client_id).lean({ virtuals: true });
  return toPlain({ ...invoice, client });
}

export async function createInvoice(data: Record<string, unknown>) {
  await connect();
  const invoice = await Invoice.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(invoice.toObject({ virtuals: true }));
}

export async function updateInvoice(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Invoice.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteInvoice(id: string) {
  await connect();
  return Invoice.findByIdAndDelete(id);
}

export async function getInvoiceNumber(): Promise<string> {
  await connect();
  const now = new Date();
  const year = now.getFullYear();
  const seq = await DocNumberSequence.findOneAndUpdate(
    { entity_type: 'invoice', year },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return `INV-${year}-${String(seq.sequence).padStart(4, '0')}`;
}

export async function getInvoicesForClient(clientId: string) {
  await connect();
  const invoices = await Invoice.find({ client_id: clientId }).lean({ virtuals: true });
  const paid = invoices.filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + i.total, 0);
  const outstanding = invoices.filter((i: any) => ['Sent', 'Overdue'].includes(i.status)).reduce((s: number, i: any) => s + i.total, 0);
  return toPlain({ invoices, paid, outstanding });
}

export async function getOutstandingInvoices() {
  await connect();
  const invoices = await Invoice.find({ status: { $in: ['Sent', 'Overdue'] } }).lean({ virtuals: true });
  const total = invoices.reduce((s: number, i: any) => s + i.total, 0);
  return toPlain({ invoices, total });
}

export async function markInvoicesOverdue() {
  await connect();
  const today = new Date().toISOString().split('T')[0];
  const result = await Invoice.updateMany(
    { status: 'Sent', due_date: { $lt: new Date(today), $ne: null } },
    { $set: { status: 'Overdue', updated_at: new Date() } }
  );
  return result.modifiedCount;
}

export async function getRecurringInvoicesDueToday() {
  await connect();
  const today = new Date().toISOString().split('T')[0];
  return toPlain(await Invoice.find({ is_recurring: true, next_issue_date: new Date(today) }).lean({ virtuals: true }));
}

export async function processOverdueChecks() {
  await connect();
  const today = new Date().toISOString().split('T')[0];

  const overdueResult = await Invoice.updateMany(
    { status: 'Sent', due_date: { $lt: new Date(today), $ne: null } },
    { $set: { status: 'Overdue', updated_at: new Date() } }
  );
  const overdueCount = overdueResult.modifiedCount;

  const recurringInvoices = await Invoice.find({
    is_recurring: true,
    next_issue_date: new Date(today),
  }).lean({ virtuals: true });

  let generatedCount = 0;

  for (const inv of recurringInvoices as any[]) {
    const now = new Date();
    const year = now.getFullYear();
    const seq = await DocNumberSequence.findOneAndUpdate(
      { entity_type: 'invoice', year },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const invoiceNumber = `INV-${year}-${String(seq.sequence).padStart(3, '0')}`;

    await Invoice.create({
      invoice_number: invoiceNumber,
      client_id: inv.client_id,
      project_id: inv.project_id,
      status: 'Draft',
      currency: inv.currency,
      line_items: inv.line_items,
      discount_percent: inv.discount_percent,
      subtotal: inv.subtotal,
      tax_label: inv.tax_label,
      tax_percent: inv.tax_percent,
      total: inv.total,
      issue_date: new Date(today),
      payment_terms: inv.payment_terms,
      is_recurring: true,
      recurring_frequency: inv.recurring_frequency,
      created_by: inv.created_by,
    });

    generatedCount++;

    const nextDate = new Date(inv.next_issue_date);
    switch (inv.recurring_frequency) {
      case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
      case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
    }

    await Invoice.findByIdAndUpdate(inv._id, {
      next_issue_date: nextDate.toISOString().split('T')[0],
    });
  }

  return { overdue: overdueCount, recurring_generated: generatedCount };
}

export async function getAllInvoicesWithDueDates() {
  await connect();
  return toPlain(await Invoice.find({ due_date: { $ne: null } }).select('id invoice_number due_date client_id project_id').lean({ virtuals: true }));
}

export async function getAllProposalsWithExpiry() {
  await connect();
  return toPlain(await Proposal.find({ expires_at: { $ne: null } }).select('id proposal_number client_id expires_at').lean({ virtuals: true }));
}
