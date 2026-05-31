'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
import sanitizeHtml from 'sanitize-html';
import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';
import { GoogleCalendarSync, GoogleInbox, InboxMessage } from '@/lib/db/models/google';
import { Calendar, CalendarMember, Event } from '@/lib/db/models/calendar';
import { refreshGoogleToken } from '@/lib/google/client';
import { listGoogleCalendars, listGoogleCalendarEvents } from '@/lib/google/calendar';
import { listLabels, listMessages, getMessage, getHeader, getPlainBody, getHtmlBody } from '@/lib/google/gmail';
import { summarizeBatch } from '@/lib/google/summarize';
import { auth } from '@/auth';
import { toPlain } from '@/lib/db/to-plain';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'span', 'del', 'ins', 'style', 'figure', 'figcaption',
    'section', 'article', 'header', 'footer', 'main', 'nav',
  ]),
  allowedAttributes: {
    '*': ['style', 'class', 'id'],
    a: ['href', 'target', 'rel', 'title', 'style'],
    img: ['src', 'alt', 'width', 'height', 'style', 'align', 'border'],
    td: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'bgcolor', 'style'],
    th: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'bgcolor', 'style'],
    tr: ['align', 'valign', 'bgcolor', 'style'],
    table: ['width', 'border', 'cellpadding', 'cellspacing', 'align', 'bgcolor', 'style'],
    col: ['width', 'style'],
    colgroup: ['span', 'width', 'style'],
    span: ['style', 'class'],
    p: ['style', 'align'],
    div: ['style', 'align'],
    h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], h5: ['style'], h6: ['style'],
    hr: ['style'],
    ul: ['style'], ol: ['style'], li: ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
  },
};

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
  return toPlain(await GoogleCalendarSync.findByIdAndUpdate(id, { is_active: isActive }).lean({ virtuals: true }));
}

export async function fetchAndStoreGoogleCalendars() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const accessToken = await getAccessToken(session.user.id);
  const calendars = await listGoogleCalendars(accessToken);
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

    const calendarDoc = await Calendar.findOneAndUpdate(
      { google_calendar_id: cal.id, created_by: session.user.id },
      {
        name: cal.summary,
        color: cal.backgroundColor || '#3b82f6',
        type: 'personal',
        google_calendar_id: cal.id,
        sync_to_google: true,
        created_by: session.user.id,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const memberExists = await CalendarMember.findOne({
      calendar_id: (calendarDoc as any)._id.toString(),
      user_id: session.user.id,
    });
    if (!memberExists) {
      await CalendarMember.create({
        calendar_id: (calendarDoc as any)._id.toString(),
        user_id: session.user.id,
        role: 'OWNER',
      });
    }
  }
}

export async function syncAllGoogleCalendarsForUser(userId: string) {
  await connect();
  const accessToken = await getAccessToken(userId);
  const refreshToken = await User.findById(userId).select('google_refresh_token').lean() as any;
  if (!refreshToken?.google_refresh_token) return { synced: 0 };
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
  return toPlain(await GoogleInbox.findByIdAndUpdate(id, { is_active: isActive }).lean({ virtuals: true }));
}

export async function fetchAndStoreGoogleLabels() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const accessToken = await getAccessToken(session.user.id);
  const labels = await listLabels(accessToken);
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

export interface SyncOptions {
  readStatus?: 'unread' | 'all';
  dateRange?: 'today' | '7d' | '14d' | '30d';
}

function buildGmailQuery(options: SyncOptions): string {
  const parts: string[] = [];
  if (options.readStatus === 'unread') parts.push('is:unread');
  if (options.dateRange === 'today') parts.push('after:today');
  else if (options.dateRange === '7d') parts.push('newer_than:7d');
  else if (options.dateRange === '14d') parts.push('newer_than:14d');
  else if (options.dateRange === '30d') parts.push('newer_than:30d');
  return parts.join(' ');
}

export async function syncGmailForUser(userId: string, labelId: string, options: SyncOptions = {}): Promise<{ synced: number; error?: string }> {
  await connect();
  let accessToken: string;
  try {
    accessToken = await getAccessToken(userId);
  } catch (err) {
    return { synced: 0, error: err instanceof Error ? err.message : 'Failed to authenticate with Google. Please reconnect.' };
  }

  const query = buildGmailQuery(options);
  let messageRefs: { id: string; threadId: string }[];
  try {
    messageRefs = await listMessages(accessToken, labelId, 50, query || undefined);
  } catch (err) {
    return { synced: 0, error: err instanceof Error ? err.message : 'Failed to fetch messages from Gmail.' };
  }

  const emailItems: Array<{ from: string; subject: string; body: string; ref: { id: string; threadId: string }; msgData: any }> = [];

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
      const body = await getPlainBody(accessToken, ref.id, msg);

      emailItems.push({
        from: fromEmail,
        subject,
        body,
        ref: { id: msg.id, threadId: msg.threadId },
        msgData: { msg, fromName, fromEmail, subject, body, snippet: msg.snippet || '', internalDate: msg.internalDate },
      });
    } catch (err) {
      console.error(`Failed to get message ${ref.id}:`, err);
    }
  }

  if (emailItems.length === 0) {
    await GoogleInbox.findOneAndUpdate(
      { user_id: userId, label_id: labelId },
      { last_synced_at: new Date() }
    );
    return { synced: 0 };
  }

  const aiResults = await summarizeBatch(emailItems.map((e) => ({ from: e.from, subject: e.subject, body: e.body })));

  for (let i = 0; i < emailItems.length; i++) {
    const { msgData, ref } = emailItems[i];
    const { msg, fromName, fromEmail, subject, body, snippet, internalDate } = msgData;
    const rawHtml = await getHtmlBody(accessToken, ref.id, msg);
    const safeHtml = rawHtml ? sanitizeHtml(rawHtml, SANITIZE_OPTIONS) : '';

    const aiResult = aiResults[i] || { importance: 'medium' as const, summary: '', action_needed: false, action_description: null };

    try {
      await InboxMessage.create({
        user_id: userId,
        google_message_id: ref.id,
        thread_id: ref.threadId,
        label_id: labelId,
        from_name: fromName,
        from_email: fromEmail,
        subject,
        snippet: snippet || '',
        body_plain: body.slice(0, 50000),
        body_html: safeHtml,
        ai_summary: aiResult.summary,
        importance: aiResult.importance,
        action_needed: aiResult.action_needed,
        action_description: aiResult.action_description,
        is_read: false,
        is_archived: false,
        received_at: new Date(parseInt(internalDate)),
      });
    } catch (err) {
      console.error(`Failed to create message ${ref.id}:`, err);
    }
  }

  await GoogleInbox.findOneAndUpdate(
    { user_id: userId, label_id: labelId },
    { last_synced_at: new Date() }
  );

  return { synced: emailItems.length };
}

export async function syncInboxNow(options: SyncOptions = {}): Promise<{ totalSynced: number; labelsChecked: number; errors: string[] }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  const activeInboxes = await GoogleInbox.find({ user_id: session.user.id, is_active: true }).lean();

  let totalSynced = 0;
  const errors: string[] = [];
  for (const inbox of activeInboxes) {
    const result = await syncGmailForUser(session.user.id, (inbox as any).label_id, options);
    totalSynced += result.synced;
    if (result.error) {
      errors.push(result.error);
    }
  }

  return { totalSynced, labelsChecked: activeInboxes.length, errors };
}

export async function getInboxMessages(options?: {
  limit?: number;
  includeArchived?: boolean;
  importance?: string;
  isRead?: boolean;
  threadId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  const filter: Record<string, unknown> = { user_id: session.user.id };
  if (!options?.includeArchived) filter.is_archived = false;
  if (options?.importance) filter.importance = options.importance;
  if (options?.isRead !== undefined) filter.is_read = options.isRead;
  if (options?.threadId) filter.thread_id = options.threadId;

  const messages = await InboxMessage.find(filter)
    .sort({ received_at: -1 })
    .limit(options?.limit || 50)
    .lean({ virtuals: true });

  return toPlain(messages);
}

export async function getThreadMessages(threadId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  const messages = await InboxMessage.find({
    user_id: session.user.id,
    thread_id: threadId,
    is_archived: false,
  })
    .sort({ received_at: 1 })
    .lean({ virtuals: true });

  return toPlain(messages);
}

export async function markMessageRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return toPlain(await InboxMessage.findByIdAndUpdate(id, { is_read: true }).lean({ virtuals: true }));
}

export async function archiveMessage(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  return toPlain(await InboxMessage.findByIdAndUpdate(id, { is_archived: true }).lean({ virtuals: true }));
}

export async function repairInbox() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  await InboxMessage.deleteMany({ user_id: session.user.id });
}
