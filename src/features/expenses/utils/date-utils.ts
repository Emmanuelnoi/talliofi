import { format, parseISO } from 'date-fns';

export function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatTransactionDate(date: string | undefined): string {
  if (!date) return 'No date';
  try {
    return format(parseISO(date), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a Date or ISO string for display (e.g. "Jan 5, 2026").
 * Consistent alternative to scattered `toLocaleDateString` calls.
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Formats a yearMonth string (e.g. "2026-01") into a short label (e.g. "Jan '26").
 */
export function formatShortMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return format(d, "MMM ''yy");
}

/**
 * Formats a yearMonth string (e.g. "2026-01") into just the month (e.g. "Jan").
 */
export function formatMonthOnly(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return format(d, 'MMM');
}

/**
 * Formats a yearMonth string (e.g. "2026-01") into long form (e.g. "January 2026").
 */
export function formatLongMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return format(d, 'MMMM yyyy');
}

/**
 * Formats a Date as "Mar 2026" (short month + year).
 */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMM yyyy');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
