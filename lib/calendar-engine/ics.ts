import ical, { ICalCalendarMethod } from 'ical-generator';

export interface ICSEvent {
  uid?: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  rrule?: string;
}

export function generateICS(events: ICSEvent[], calendarName: string = 'Studio Calendar'): string {
  const cal = ical({
    name: calendarName,
    method: ICalCalendarMethod.PUBLISH,
  });

  for (const event of events) {
    const ev = cal.createEvent({
      start: typeof event.start === 'string' ? new Date(event.start) : event.start,
      end: typeof event.end === 'string' ? new Date(event.end) : event.end,
      summary: event.summary,
      description: event.description,
      location: event.location,
    });

    if (event.uid) {
      ev.uid(event.uid);
    }

    if (event.rrule) {
      ev.repeating(event.rrule);
    }
  }

  return cal.toString();
}
