import type { DateFormat } from '@/store/slices/settingsSlice';

/**
 * Converts a Date object to a "YYYY-MM-DD" string using its LOCAL date
 * parts, not `.toISOString()`. `.toISOString()` always converts to
 * UTC first — in any timezone behind UTC, a Date representing, say,
 * 8pm local time on the 18th can already be into the 19th in UTC, so
 * `.toISOString().split('T')[0]` silently returns tomorrow's date.
 * Use this instead anywhere a Date object needs to become a stored
 * "YYYY-MM-DD" string.
 */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Parses a "YYYY-MM-DD" string as local midnight, not UTC midnight.
 * `new Date("2026-07-18")` on its own parses as UTC midnight — in any
 * timezone behind UTC (all of the US, for instance), calling local
 * methods like .getDate() or .toLocaleDateString() on that then reads
 * back as the previous day. Appending a local time-of-day avoids that
 * entirely. Use this instead of `new Date(dateStr)` anywhere a stored
 * "YYYY-MM-DD" date needs its day/month/weekday read back out.
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
}

/**
 * Formats a date consistently according to the person's stored
 * preference. Accepts either a "YYYY-MM-DD" string (how dates are
 * stored everywhere in this app) or a Date object. Defaults to
 * MM-DD-YYYY if no format is passed, matching the app-wide default.
 */
export function formatDate(input: string | Date, format: DateFormat = 'MM-DD-YYYY'): string {
  const date = typeof input === 'string' ? parseLocalDate(input) : input;
  if (isNaN(date.getTime())) return typeof input === 'string' ? input : '';

  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();

  switch (format) {
    case 'DD-MM-YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'MM-DD-YYYY':
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
}
