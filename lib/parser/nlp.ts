import * as chrono from 'chrono-node';
import { WEEKDAYS } from '@/lib/calendar-engine/recurrence';

export interface ParsedEventInput {
  title: string;
  start: Date | null;
  end: Date | null;
  rrule: string | null;
  location: string | null;
  description: string | null;
  confidence: number;
}

const RECURRENCE_PATTERNS = [
  {
    regex: /every\s+(mon|tue|wed|thu|fri|sat|sun)(day)?\s*(and|&|,)?\s*(mon|tue|wed|thu|fri|sat|sun)?(day)?/gi,
    handler: (_input: string, days: string[]): { freq: 'WEEKLY'; byweekday: number[] } => {
      const daySet = new Set<number>();
      for (const d of days) {
        const upper = d?.toUpperCase().slice(0, 2);
        if (upper && WEEKDAYS[upper] !== undefined) {
          daySet.add(WEEKDAYS[upper]);
        }
      }
      return { freq: 'WEEKLY', byweekday: Array.from(daySet).sort() };
    },
  },
  {
    regex: /every\s+day/gi,
    handler: () => ({ freq: 'DAILY' as const, byweekday: [] }),
  },
  {
    regex: /every\s+week/gi,
    handler: () => ({ freq: 'WEEKLY' as const, byweekday: [] }),
  },
  {
    regex: /every\s+month/gi,
    handler: () => ({ freq: 'MONTHLY' as const, byweekday: [] }),
  },
  {
    regex: /every\s+year/gi,
    handler: () => ({ freq: 'YEARLY' as const, byweekday: [] }),
  },
  {
    regex: /weekly/gi,
    handler: () => ({ freq: 'WEEKLY' as const, byweekday: [] }),
  },
  {
    regex: /monthly/gi,
    handler: () => ({ freq: 'MONTHLY' as const, byweekday: [] }),
  },
];

function extractRecurrence(text: string): { rrule: string | null; cleaned: string } {
  let cleaned = text;
  let freq: string | null = null;
  let byweekday: number[] | null = null;

  for (const pattern of RECURRENCE_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (match) {
      const result = pattern.handler(text, match.slice(1).filter(Boolean) as string[]);
      freq = result.freq;
      byweekday = result.byweekday.length > 0 ? result.byweekday : null;
      cleaned = cleaned.replace(pattern.regex, '').trim();
      break;
    }
  }

  if (!freq) return { rrule: null, cleaned: text };

  const parts: string[] = [`FREQ=${freq}`];
  if (byweekday && byweekday.length > 0) {
    parts.push(`BYDAY=${byweekday.map((d) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d]).join(',')}`);
  }

  return { rrule: parts.join(';'), cleaned };
}

function extractLocation(text: string): { location: string | null; cleaned: string } {
  const match = text.match(/(?:at|in|room)\s+([A-Z0-9][\w\s,.-]+?)(?:\s*(?:from|on|every|$))/i);
  if (match) {
    return {
      location: match[1].trim(),
      cleaned: text.replace(match[0], '').trim(),
    };
  }
  return { location: null, cleaned: text };
}

export function parseNaturalLanguage(input: string): ParsedEventInput {
  let text = input.trim();
  let confidence = 0;

  const { rrule, cleaned: afterRRule } = extractRecurrence(text);
  text = afterRRule;
  if (rrule) confidence += 0.3;

  const { location, cleaned: afterLocation } = extractLocation(text);
  text = afterLocation;
  if (location) confidence += 0.1;

  const chronoResults = chrono.parse(text, undefined, { forwardDate: true });

  let start: Date | null = null;
  let end: Date | null = null;
  let title = input;

  if (chronoResults.length > 0) {
    const result = chronoResults[0];
    start = result.start?.date() || null;
    end = result.end?.date() || null;

    title = result.text || input;

    if (result.start) confidence += 0.4;
    if (result.end) confidence += 0.2;
  }

  return {
    title,
    start,
    end,
    rrule,
    location,
    description: null,
    confidence: Math.min(confidence, 1),
  };
}

export function isParseConfident(result: ParsedEventInput): boolean {
  return result.confidence >= 0.3 && result.start !== null;
}
