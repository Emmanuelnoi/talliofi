import type { MonthlySnapshot } from './types';
import type { Cents } from '@/domain/money';
import { cents } from '@/domain/money';

/** Returns the current year-month in YYYY-MM format. */
export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns the previous year-month (YYYY-MM) for a given year-month. */
export function getPreviousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Builds a rollover map using the previous month's snapshot.
 * Uses the prior month bucket remaining amounts as carry-over values.
 */
export function getRolloverMapFromSnapshots(
  snapshots: readonly MonthlySnapshot[],
  yearMonth: string,
): ReadonlyMap<string, Cents> {
  if (snapshots.length === 0) return new Map();
  const previousMonth = getPreviousYearMonth(yearMonth);
  const previousSnapshot = snapshots.find((s) => s.yearMonth === previousMonth);
  if (!previousSnapshot) return new Map();

  const map = new Map<string, Cents>();
  for (const summary of previousSnapshot.bucketSummaries) {
    map.set(summary.bucketId, summary.remainingCents ?? cents(0));
  }
  return map;
}
