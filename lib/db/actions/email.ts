'use server';

import { connect } from '@/lib/db/connect';
import { InboxMessage } from '@/lib/db/models/google';
import { EmailOutbox } from '@/lib/db/models/docs';
import { ActivityLog, Client } from '@/lib/db/models/crm';
import { auth } from '@/auth';
import { toPlain } from '@/lib/db/to-plain';
import { sendInvoiceEmail, sendProposalEmail, sendGeneralEmail } from '@/lib/resend';
import { getInvoice, getProposal } from './invoices';
import { generateInvoicePDF, generateProposalPDF } from '@/lib/pdf';

export async function getInboxStats() {
  const session = await auth();
  if (!session?.user?.id) return { unread: 0, highPriority: 0, actionNeeded: 0 };

  await connect();
  const userId = session.user.id;

  const [unread, highPriority, actionNeeded] = await Promise.all([
    InboxMessage.countDocuments({ user_id: userId, is_read: false, is_archived: false }),
    InboxMessage.countDocuments({ user_id: userId, is_archived: false, importance: 'high' }),
    InboxMessage.countDocuments({ user_id: userId, is_archived: false, action_needed: true }),
  ]);

  return { unread, highPriority, actionNeeded };
}

export async function sendInvoiceWithEmail(invoiceId: string, subject: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  const client = (invoice as any).client as any;
  const clientEmail = client?.email;
  if (!clientEmail) throw new Error('Client has no email address');

  const pdfBuffer = await generateInvoicePDF(invoice);

  let resendId: string | null = null;
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | null = null;

  try {
    const result = await sendInvoiceEmail(clientEmail, invoice.invoice_number, pdfBuffer);
    resendId = result?.id || null;
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  await EmailOutbox.create({
    user_id: session.user.id,
    from_email: process.env.EMAIL_FROM || 'studio@jonathansimpson.co',
    to_email: clientEmail,
    to_name: client?.contact_name || client?.company_name || '',
    subject,
    body_text: body,
    status,
    resend_id: resendId,
    entity_type: 'invoice',
    entity_id: invoiceId,
    sent_at: status === 'sent' ? new Date() : null,
    error_message: errorMessage,
  });

  if (status === 'sent') {
    const { Invoice } = await import('@/lib/db/models/docs');
    await Invoice.findByIdAndUpdate(invoiceId, { status: 'Sent', sent_at: new Date(), updated_at: new Date() });

    await ActivityLog.create({
      entity_type: 'invoice',
      entity_id: invoiceId,
      action: 'invoice_sent',
      actor_id: session.user.id,
      meta: { invoice_number: invoice.invoice_number, amount: invoice.total, currency: invoice.currency },
    });
  }

  return { status, errorMessage };
}

export async function sendProposalWithEmail(proposalId: string, subject: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  const proposal = await getProposal(proposalId);
  if (!proposal) throw new Error('Proposal not found');

  const client = (proposal as any).client as any;
  const clientEmail = client?.email;
  if (!clientEmail) throw new Error('Client has no email address');

  const pdfBuffer = await generateProposalPDF(proposal);

  let resendId: string | null = null;
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | null = null;

  try {
    const result = await sendProposalEmail(clientEmail, proposal.proposal_number, pdfBuffer);
    resendId = result?.id || null;
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  await EmailOutbox.create({
    user_id: session.user.id,
    from_email: process.env.EMAIL_FROM || 'studio@jonathansimpson.co',
    to_email: clientEmail,
    to_name: client?.contact_name || client?.company_name || '',
    subject,
    body_text: body,
    status,
    resend_id: resendId,
    entity_type: 'proposal',
    entity_id: proposalId,
    sent_at: status === 'sent' ? new Date() : null,
    error_message: errorMessage,
  });

  if (status === 'sent') {
    const { Proposal } = await import('@/lib/db/models/docs');
    await Proposal.findByIdAndUpdate(proposalId, { status: 'Sent', sent_at: new Date(), updated_at: new Date() });

    await ActivityLog.create({
      entity_type: 'proposal',
      entity_id: proposalId,
      action: 'proposal_sent',
      actor_id: session.user.id,
      meta: { proposal_number: proposal.proposal_number, amount: proposal.total, currency: proposal.currency },
    });
  }

  return { status, errorMessage };
}

export async function sendComposedEmail(
  to: string,
  subject: string,
  body: string,
  toName?: string,
  attachments?: Array<{ filename: string; content: string }>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  let resendId: string | null = null;
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | null = null;

  try {
    const result = await sendGeneralEmail(to, subject, body, attachments);
    resendId = result?.id || null;
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  await EmailOutbox.create({
    user_id: session.user.id,
    from_email: process.env.EMAIL_FROM || 'studio@jonathansimpson.co',
    to_email: to,
    to_name: toName || '',
    subject,
    body_text: body,
    status,
    resend_id: resendId,
    entity_type: 'general',
    sent_at: status === 'sent' ? new Date() : null,
    error_message: errorMessage,
  });

  return { status, errorMessage };
}

export async function listOutbox(limit = 50) {
  const session = await auth();
  if (!session?.user?.id) return [];

  await connect();
  return toPlain(await EmailOutbox.find({ user_id: session.user.id }).sort({ sent_at: -1 }).limit(limit).lean({ virtuals: true }));
}

export interface NotificationItem {
  id: string;
  type: 'overdue_task' | 'stale_lead' | 'invoice_due' | 'invoice_overdue';
  message: string;
  entity_href: string;
  created_at: string;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  await connect();
  const { Task, Project } = await import('@/lib/db/models/projects');
  const { Lead } = await import('@/lib/db/models/crm');
  const { Invoice } = await import('@/lib/db/models/docs');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const notifications: NotificationItem[] = [];

  // Overdue tasks (past due, not done)
  const overdueTasks = await Task.find({
    due_date: { $lt: now },
    status: { $ne: 'Done' },
    assignee_ids: session.user.id,
  }).lean({ virtuals: true });

  for (const t of overdueTasks) {
    notifications.push({
      id: `task-${t._id}`,
      type: 'overdue_task',
      message: `Task "${(t as any).title || 'Untitled'}" is overdue`,
      entity_href: `/tasks/${(t as any)._id}`,
      created_at: (t as any).due_date?.toISOString() || now.toISOString(),
    });
  }

  // Stale leads (no contact in 7+ days, not won/lost)
  const staleLeads = await Lead.find({
    $or: [
      { last_contacted_at: { $lt: sevenDaysAgo } },
      { last_contacted_at: { $exists: false } },
    ],
    stage: { $nin: ['Won', 'Lost'] },
  }).lean({ virtuals: true });

  for (const l of staleLeads) {
    notifications.push({
      id: `lead-${l._id}`,
      type: 'stale_lead',
      message: `Lead "${(l as any).company_name || 'Untitled'}" hasn't been contacted in 7+ days`,
      entity_href: `/leads/${(l as any)._id}`,
      created_at: now.toISOString(),
    });
  }

  // Due/overdue invoices
  const dueInvoices = await Invoice.find({
    status: { $in: ['Sent', 'Overdue'] },
    due_date: { $lte: now },
  }).lean({ virtuals: true });

  for (const inv of dueInvoices) {
    notifications.push({
      id: `inv-${inv._id}`,
      type: inv.status === 'Overdue' ? 'invoice_overdue' : 'invoice_due',
      message: `Invoice ${(inv as any).invoice_number || ''} is ${inv.status === 'Overdue' ? 'overdue' : 'due'}`,
      entity_href: `/invoices/${(inv as any)._id}`,
      created_at: (inv as any).due_date?.toISOString() || now.toISOString(),
    });
  }

  return notifications.slice(0, 20);
}
