'use server';

import { connect } from '@/lib/db/connect';
import { InboundMessage } from '@/lib/db/models/inbound';
import { User } from '@/lib/db/models/core';
import { auth } from '@/auth';
import { toPlain } from '@/lib/db/to-plain';

export async function getInboundMessages(opts?: {
  limit?: number;
  includeArchived?: boolean;
  isRead?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  const filter: Record<string, unknown> = { user_id: session.user.id };
  if (!opts?.includeArchived) filter.is_archived = false;
  if (opts?.isRead !== undefined) filter.is_read = opts.isRead;

  const messages = await InboundMessage.find(filter)
    .sort({ received_at: -1 })
    .limit(opts?.limit || 50)
    .lean({ virtuals: true });

  return toPlain(messages);
}

export async function markInboundRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return toPlain(await InboundMessage.findByIdAndUpdate(id, { is_read: true }).lean({ virtuals: true }));
}

export async function archiveInbound(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return toPlain(await InboundMessage.findByIdAndUpdate(id, { is_archived: true }).lean({ virtuals: true }));
}

export async function setInboxSource(source: 'gmail' | 'custom_domain') {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return toPlain(await User.findByIdAndUpdate(session.user.id, { inbox_source: source }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function storeInboundEmail(data: {
  user_id: string;
  to_email: string;
  from_email: string;
  from_name?: string;
  subject?: string;
  body_plain?: string;
  body_html?: string | null;
}) {
  await connect();
  return toPlain(await InboundMessage.create({
    user_id: data.user_id,
    to_email: data.to_email,
    from_email: data.from_email,
    from_name: data.from_name || '',
    subject: data.subject || '',
    body_plain: data.body_plain || '',
    body_html: data.body_html || null,
    is_read: false,
    is_archived: false,
    received_at: new Date(),
  }));
}
