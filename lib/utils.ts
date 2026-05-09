import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    HKD: 'HK$',
    GBP: '£',
    IDR: 'Rp',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date | null, timezone: string = 'Asia/Hong_Kong'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(d, timezone);
  return format(zoned, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date | null, timezone: string = 'Asia/Hong_Kong'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(d, timezone);
  return format(zoned, 'MMM d, yyyy HH:mm');
}

export function formatRelative(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function toUTC(date: Date, timezone: string = 'Asia/Hong_Kong'): Date {
  return fromZonedTime(date, timezone);
}

export function toTimezone(date: Date, timezone: string = 'Asia/Hong_Kong'): Date {
  return toZonedTime(date, timezone);
}

export function generateDocNumber(
  prefix: string,
  year: number,
  sequence: number
): string {
  return `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
}
