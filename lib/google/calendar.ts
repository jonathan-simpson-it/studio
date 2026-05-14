import { googleApiFetch } from './client';

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string;
  accessRole: string;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  recurrence: string[] | null;
  colorId: string | null;
}

export async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const res = await googleApiFetch(
    accessToken,
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer'
  );
  if (!res.ok) throw new Error(`Failed to list calendars: ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  const res = await googleApiFetch(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  );
  if (!res.ok) throw new Error(`Failed to list events: ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}
