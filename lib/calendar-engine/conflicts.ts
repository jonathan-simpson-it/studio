import { rrulestr } from 'rrule';

export interface EventLike {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  rrule: string | null;
  calendar_id: string;
}

export interface Conflict {
  event: EventLike;
  overlapping: EventLike[];
}

function expandRecurrences(event: EventLike, windowStart: Date, windowEnd: Date): Date[][] {
  if (!event.rrule) {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    if (start < windowEnd && end > windowStart) {
      return [[start, end]];
    }
    return [];
  }

  const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();

  try {
    const rule = rrulestr(event.rrule, {
      dtstart: new Date(event.start_time),
    });

    const occurrences = rule.between(windowStart, windowEnd, true);
    return occurrences.map((occ) => {
      const occStart = new Date(occ);
      const occEnd = new Date(occ.getTime() + duration);
      return [occStart, occEnd];
    });
  } catch {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    if (start < windowEnd && end > windowStart) {
      return [[start, end]];
    }
    return [];
  }
}

export function detectConflicts(
  existingEvents: EventLike[],
  newEvent: EventLike,
  windowStart?: Date,
  windowEnd?: Date
): Conflict[] {
  const start = new Date(newEvent.start_time);
  const end = new Date(newEvent.end_time);
  const ws = windowStart || new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const we = windowEnd || new Date(end.getFullYear(), end.getMonth() + 2, 0);

  const newOccurrences = expandRecurrences(newEvent, ws, we);
  const conflicts: Conflict[] = [];

  for (const [newStart, newEnd] of newOccurrences) {
    for (const existing of existingEvents) {
      if (existing.id === newEvent.id) continue;
      const existingOccurrences = expandRecurrences(existing, ws, we);
      for (const [exStart, exEnd] of existingOccurrences) {
        if (newStart < exEnd && newEnd > exStart) {
          const existingConflict = conflicts.find((c) => c.event.id === existing.id);
          if (!existingConflict) {
            conflicts.push({ event: existing, overlapping: [newEvent] });
          }
        }
      }
    }
  }

  return conflicts;
}

export function findOverlapping(
  events: EventLike[],
  target: EventLike
): EventLike[] {
  const targetStart = new Date(target.start_time);
  const targetEnd = new Date(target.end_time);

  return events.filter((ev) => {
    if (ev.id === target.id) return false;
    const evStart = new Date(ev.start_time);
    const evEnd = new Date(ev.end_time);
    return targetStart < evEnd && targetEnd > evStart;
  });
}
