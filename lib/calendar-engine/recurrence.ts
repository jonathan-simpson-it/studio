import { RRule, rrulestr } from 'rrule';

export function expandRecurrences(
  startTime: Date | string,
  endTime: Date | string,
  rrule: string | null,
  windowStart: Date,
  windowEnd: Date
): { start: Date; end: Date }[] {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = end.getTime() - start.getTime();

  if (!rrule) {
    if (start < windowEnd && end > windowStart) {
      return [{ start, end }];
    }
    return [];
  }

  try {
    const rule = rrulestr(rrule, { dtstart: start });
    const occurrences = rule.between(windowStart, windowEnd, true);
    return occurrences.map((occ) => {
      const occStart = new Date(occ);
      const occEnd = new Date(occ.getTime() + duration);
      return { start: occStart, end: occEnd };
    });
  } catch {
    if (start < windowEnd && end > windowStart) {
      return [{ start, end }];
    }
    return [];
  }
}

export function generateRRule(options: {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  byweekday?: number[];
  count?: number;
  until?: Date;
  dtstart: Date;
}): string {
  const rule = new RRule({
    freq: RRule[options.freq],
    interval: options.interval || 1,
    byweekday: options.byweekday,
    count: options.count,
    until: options.until,
    dtstart: options.dtstart,
  });
  return rule.toString();
}

export const WEEKDAYS: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export function parseRRuleText(rruleStr: string): string {
  try {
    const rule = rrulestr(rruleStr);
    return rule.toText();
  } catch {
    return rruleStr;
  }
}
