'use server';

import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';
import { GoogleCalendarSync, GoogleInbox, InboxMessage } from '@/lib/db/models/google';
import { Event } from '@/lib/db/models/calendar';
import { refreshGoogleToken } from '@/lib/google/client';
import { listGoogleCalendars, listGoogleCalendarEvents } from '@/lib/google/calendar';
import { listLabels, listMessages, getMessage, getHeader, getPlainBody } from '@/lib/google/gmail';
import { summarizeEmail } from '@/lib/google/summarize';
import { auth } from '@/auth';
import { toPlain } from '@/lib/db/to-plain';

async function getAccessToken(userId: string): Promise<string> {
  const user = await User.findById(userId).lean({ virtuals: true });
  if (!user || !(user as any).google_refresh_token) throw new Error('Google not connected');

  try {
    const tokenData = await refreshGoogleToken((user as any).google_refresh_token);
    return tokenData.access_token;
  } catch {
    await User.findByIdAndUpdate(userId, {
      google_id: null,
      google_email: null,
      google_refresh_token: null,
    });
    throw new Error('Google session expired. Please reconnect.');
  }
}

// ---- Calendar ----

export async function getGoogleCalendars() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return toPlain(await GoogleCalendarSync.find({ user_id: session.user.id }).lean({ virtuals: true }));
}

export async function toggleGoogleCalendar(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return GoogleCalendarSync.findByIdAndUpdate(id, { is_active: isActive }).lean({ virtuals: true });
}

export async function fetchAndStoreGoogleCalendars() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const accessToken = await getAccessToken(session.user.id);
  const calendars = await listGoogleCalendars(accessToken);

  await connect();
  for (const cal of calendars) {
    await GoogleCalendarSync.findOneAndUpdate(
      { user_id: session.user.id, google_calendar_id: cal.id },
      {
        user_id: session.user.id,
        google_calendar_id: cal.id,
        name: cal.summary,
        color: cal.backgroundColor || '#3b82f6',
        is_active: true,
      },
      { upsert: true }
    );
  }
}

export async function syncAllGoogleCalendarsForUser(userId: string) {
  const accessToken = await getAccessToken(userId);
  const refreshToken = (await User.findById(userId).select('google_refresh_token').lean()) as any;
  if (!refreshToken?.google_refresh_token) return { synced: 0 };

  await connect();
  const activeCals = await GoogleCalendarSync.find({ user_id: userId, is_active: true }).lean();

  let synced = 0;
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  for (const cal of activeCals) {
    const c = cal as any;
    try {
      const events = await listGoogleCalendarEvents(
        accessToken,
        c.google_calendar_id,
        threeMonthsAgo.toISOString(),
        now.toISOString()
      );

      for (const event of events) {
        const startStr = event.start?.dateTime || event.start?.date;
        const endStr = event.end?.dateTime || event.end?.date;

        if (!startStr || !endStr) continue;

        await Event.findOneAndUpdate(
          { external_event_id: event.id, calendar_id: `google-${c.google_calendar_id}` },
          {
            calendar_id: `google-${c.google_calendar_id}`,
            title: event.summary || '(No title)',
            description: event.description || null,
            location: event.location || null,
            start_time: new Date(startStr),
            end_time: new Date(endStr),
            rrule: event.recurrence?.join('\n') || null,
            external_source_id: c._id.toString(),
            external_event_id: event.id,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date(),
          },
          { upsert: true }
        );
        synced++;
      }

      await GoogleCalendarSync.findByIdAndUpdate(c._id, { last_synced_at: now });
    } catch (err) {
      console.error(`Failed to sync calendar ${c.name}:`, err);
    }
  }

  return { synced };
}

// ---- Inbox ----

export async function getGoogleInboxes() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return toPlain(await GoogleInbox.find({ user_id: session.user.id }).lean({ virtuals: true }));
}

export async function toggleGoogleInbox(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return GoogleInbox.findByIdAndUpdate(id, { is_active: isActive }).lean({ virtuals: true });
}

export async function fetchAndStoreGoogleLabels() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const accessToken = await getAccessToken(session.user.id);
  const labels = await listLabels(accessToken);

  await connect();
  for (const label of labels) {
    await GoogleInbox.findOneAndUpdate(
      { user_id: session.user.id, label_id: label.id },
      {
        user_id: session.user.id,
        label_id: label.id,
        name: label.name,
        is_active: true,
      },
      { upsert: true }
    );
  }
}

export async function syncGmailForUser(userId: string, labelId: string) {
  const accessToken = await getAccessToken(userId);

  const messageRefs = await listMessages(accessToken, labelId, 50);

  let synced = 0;
  for (const ref of messageRefs) {
    await connect();
    const existing = await InboxMessage.findOne({ google_message_id: ref.id }).lean();
    if (existing) continue;

    try {
      const msg = await getMessage(accessToken, ref.id);
      const from = getHeader(msg, 'from') || '';
      const fromEmail = from.match(/<(.+)>/)?.[1] || from;
      const fromName = from.replace(/<.+>/, '').trim() || fromEmail;
      const subject = getHeader(msg, 'subject') || '(No subject)';
      const body = getPlainBody(msg);

      const aiResult = await summarizeEmail(from, subject, body);

      await InboxMessage.create({
        user_id: userId,
        google_message_id: msg.id,
        thread_id: msg.threadId,
        label_id: labelId,
        from_name: fromName,
        from_email: fromEmail,
        subject,
        snippet: msg.snippet || '',
        body_plain: body.slice(0, 5000),
        ai_summary: aiResult.summary,
        importance: aiResult.importance,
        action_needed: aiResult.action_needed,
        action_description: aiResult.action_description,
        is_read: false,
        is_archived: false,
        received_at: new Date(parseInt(msg.internalDate)),
      });

      synced++;
    } catch (err) {
      console.error(`Failed to sync message ${ref.id}:`, err);
    }
  }

  return { synced };
}

export async function getInboxMessages(options?: {
  limit?: number;
  includeArchived?: boolean;
  importance?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  const filter: Record<string, unknown> = { user_id: session.user.id };
  if (!options?.includeArchived) filter.is_archived = false;
  if (options?.importance) filter.importance = options.importance;

  const messages = await InboxMessage.find(filter)
    .sort({ received_at: -1 })
    .limit(options?.limit || 50)
    .lean({ virtuals: true });

  return toPlain(messages);
}

export async function markMessageRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return InboxMessage.findByIdAndUpdate(id, { is_read: true }).lean({ virtuals: true });
}

export async function archiveMessage(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return InboxMessage.findByIdAndUpdate(id, { is_archived: true }).lean({ virtuals: true });
}
