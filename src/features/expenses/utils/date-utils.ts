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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
