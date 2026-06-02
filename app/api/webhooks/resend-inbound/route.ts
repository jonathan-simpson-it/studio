import { InboundMessage } from '@/lib/db/models/inbound';
import { User, AgencySettings } from '@/lib/db/models/core';
import { connect } from '@/lib/db/connect';

async function resolveRecipient(_toEmail: string): Promise<string | null> {
  await connect();
  const firstFounder = await User.findOne({ role: 'founder' }).sort({ created_at: 1 }).select('_id').lean();
  return firstFounder?._id?.toString() || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, from, subject, text, html, attachments } = body;

    if (!to || !from) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await resolveRecipient(to);
    if (!userId) {
      return Response.json({ error: 'No recipient found' }, { status: 404 });
    }

    await connect();
    await InboundMessage.create({
      user_id: userId,
      to_email: to,
      from_email: from,
      from_name: body.from_name || from.split('@')[0],
      subject: subject || '(No subject)',
      body_plain: text || '',
      body_html: html || null,
      is_read: false,
      is_archived: false,
      received_at: new Date(),
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Inbound webhook error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
