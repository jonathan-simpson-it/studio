import { google } from 'googleapis';
import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';
import { Event } from '@/lib/db/models/calendar';
import { CalendarMember } from '@/lib/db/models/calendar';
import { refreshGoogleToken } from './client';
import type { calendar_v3 } from 'googleapis';

async function getAuth(userId: string) {
  await connect();
  const user = await User.findById(userId).select('google_refresh_token').lean();
  if (!user || !(user as any).google_refresh_token) throw new Error('Google not connected');

  const tokenData = await refreshGoogleToken((user as any).google_refresh_token);
  const client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  client.setCredentials({ access_token: tokenData.access_token });
  return client;
}

export async function listWritableCalendars(userId: string) {
  const auth = await getAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.calendarList.list({ minAccessRole: 'writer' });
  return (res.data.items || []).map((cal) => ({
    id: cal.id,
    summary: cal.summary,
    backgroundColor: cal.backgroundColor,
  }));
}

export async function createGoogleCalendar(userId: string, summary: string) {
  const auth = await getAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.calendars.insert({
    requestBody: { summary },
  });
  return res.data;
}

export async function shareGoogleCalendar(
  userId: string,
  calendarId: string,
  email: string,
  role: 'reader' | 'writer' | 'owner'
) {
  const auth = await getAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.acl.insert({
    calendarId,
    requestBody: {
      scope: { type: 'user', value: email },
      role,
    },
  });
}

export async function insertEvent(
  userId: string,
  calendarId: string,
  event: {
    title: string;
    description?: string | null;
    location?: string | null;
    start_time: Date;
    end_time: Date;
    is_all_day?: boolean;
  }
) {
  const auth = await getAuth(userId);
  const cal = google.calendar({ version: 'v3', auth });

  const body: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.is_all_day
      ? { date: event.start_time.toISOString().split('T')[0] }
      : { dateTime: event.start_time.toISOString() },
    end: event.is_all_day
      ? { date: event.end_time.toISOString().split('T')[0] }
      : { dateTime: event.end_time.toISOString() },
  };

  const res = await cal.events.insert({
    calendarId,
    requestBody: body,
  });

  return res.data.id!;
}

export async function updateGoogleEvent(
  userId: string,
  calendarId: string,
  googleEventId: string,
  event: {
    title: string;
    description?: string | null;
    location?: string | null;
    start_time: Date;
    end_time: Date;
    is_all_day?: boolean;
  }
) {
  const auth = await getAuth(userId);
  const cal = google.calendar({ version: 'v3', auth });

  const body: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.is_all_day
      ? { date: event.start_time.toISOString().split('T')[0] }
      : { dateTime: event.start_time.toISOString() },
    end: event.is_all_day
      ? { date: event.end_time.toISOString().split('T')[0] }
      : { dateTime: event.end_time.toISOString() },
  };

  await cal.events.update({
    calendarId,
    eventId: googleEventId,
    requestBody: body,
  });
}

export async function deleteGoogleEvent(
  userId: string,
  calendarId: string,
  googleEventId: string
) {
  const auth = await getAuth(userId);
  const cal = google.calendar({ version: 'v3', auth });
  await cal.events.delete({ calendarId, eventId: googleEventId });
}

export async function syncEventToGoogle(
  event: {
    id: string;
    calendar_id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    start_time: Date;
    end_time: Date;
    is_all_day?: boolean;
    google_events?: { user_id: string; google_event_id: string }[];
    sync_status?: string;
  },
  calendar: { type: string; google_calendar_id?: string | null },
  userId: string
): Promise<{ google_events: { user_id: string; google_event_id: string }[]; sync_status: string }> {
  const googleEvents: { user_id: string; google_event_id: string }[] = [];
  const retryCount = 3;
  let syncStatus = 'synced';

  try {
    if (calendar.type === 'personal') {
      if (calendar.google_calendar_id) {
        for (let attempt = 1; attempt <= retryCount; attempt++) {
          try {
            let existing = (event.google_events || []).find((ge) => ge.user_id === userId);
            if (existing?.google_event_id) {
              await updateGoogleEvent(userId, calendar.google_calendar_id, existing.google_event_id, event);
              googleEvents.push(existing);
            } else {
              const gcalId = await insertEvent(userId, calendar.google_calendar_id, event);
              googleEvents.push({ user_id: userId, google_event_id: gcalId });
            }
            syncStatus = 'synced';
            break;
          } catch (err) {
            if (attempt === retryCount) {
              syncStatus = 'failed';
              console.error(`Failed to sync event to Google (attempt ${attempt}):`, err);
            } else {
              await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            }
          }
        }
      }
    } else if (calendar.type === 'shared') {
      await connect();
      const members = await CalendarMember.find({ calendar_id: event.calendar_id, role: { $in: ['OWNER', 'EDITOR'] } }).lean();

      for (const member of members) {
        const m = member as any;
        const memberUserId = m.user_id;
        const memberUser = await User.findById(memberUserId).select('google_email').lean();
        const existingRef = (event.google_events || []).find((ge) => ge.user_id === memberUserId);

        for (let attempt = 1; attempt <= retryCount; attempt++) {
          try {
            if (calendar.google_calendar_id) {
              if (existingRef?.google_event_id) {
                await updateGoogleEvent(memberUserId, calendar.google_calendar_id, existingRef.google_event_id, event);
                googleEvents.push(existingRef);
              } else {
                const gcalId = await insertEvent(memberUserId, calendar.google_calendar_id, event);
                googleEvents.push({ user_id: memberUserId, google_event_id: gcalId });
              }
            }
            syncStatus = 'synced';
            break;
          } catch (err) {
            if (attempt === retryCount) {
              syncStatus = 'failed';
              console.error(`Failed to sync event for user ${memberUserId} (attempt ${attempt}):`, err);
            } else {
              await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            }
          }
        }
      }
    }
  } catch (err) {
    syncStatus = 'failed';
    console.error('Failed to sync event to Google:', err);
  }

  return { google_events: googleEvents, sync_status: syncStatus };
}
