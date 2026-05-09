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

export interface ParsedExpenseInput {
  amount: number | null;
  category: string;
  date: string | null;
  note: string | null;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ['lunch', 'dinner', 'breakfast', 'food', 'meal', 'coffee', 'tea', 'drink', 'snack', 'groceries', 'restaurant', 'cafe'],
  Transport: ['transport', 'taxi', 'bus', 'mtr', 'uber', 'grab', 'fuel', 'gas', 'parking', 'toll', 'ferry', 'flight', 'train'],
  Supplies: ['supplies', 'stationery', 'equipment', 'tools', 'materials'],
  Software: ['software', 'subscription', 'saas', 'hosting', 'domain', 'api', 'licence', 'license'],
  Travel: ['travel', 'hotel', 'accommodation', 'lodging', 'airbnb', 'booking'],
  Entertainment: ['entertainment', 'movie', 'games', 'concert', 'event', 'ticket'],
  Health: ['health', 'medical', 'doctor', 'pharmacy', 'medicine', 'gym', 'fitness'],
  Education: ['education', 'course', 'training', 'book', 'books', 'tutorial', 'class'],
  Utilities: ['utility', 'electricity', 'water', 'internet', 'phone', 'bill'],
  Other: [],
};

function extractAmount(text: string): { amount: number | null; cleaned: string } {
  const match = text.match(/(?:HK\$|HKD|\$)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (match) {
    return {
      amount: parseFloat(match[1]),
      cleaned: text.replace(match[0], '').trim(),
    };
  }
  return { amount: null, cleaned: text };
}

function extractCategory(text: string): { category: string; cleaned: string } {
  const lower = text.toLowerCase();
  let bestCategory = 'Other';
  let bestIndex = Infinity;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const idx = lower.indexOf(kw);
      if (idx !== -1 && idx < bestIndex) {
        bestIndex = idx;
        bestCategory = cat;
      }
    }
  }

  if (bestCategory !== 'Other') {
    const cleaned = text.replace(new RegExp(Object.values(CATEGORY_KEYWORDS).flat().join('|'), 'gi'), '').trim();
    return { category: bestCategory, cleaned };
  }

  return { category: 'Other', cleaned: text };
}

export function parseExpense(input: string): ParsedExpenseInput {
  let text = input.trim();
  let confidence = 0;

  const { amount, cleaned: afterAmount } = extractAmount(text);
  text = afterAmount;
  if (amount) confidence += 0.4;

  const { category, cleaned: afterCategory } = extractCategory(text);
  text = afterCategory;
  if (category !== 'Other') confidence += 0.2;

  const chronoResults = chrono.parse(text, undefined, { forwardDate: true });
  let date: string | null = null;

  if (chronoResults.length > 0) {
    const d = chronoResults[0].start?.date();
    if (d) {
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      text = text.replace(chronoResults[0].text, '').trim();
      confidence += 0.3;
    }
  }

  return {
    amount,
    category,
    date,
    note: text || null,
    confidence: Math.min(confidence, 1),
  };
}
