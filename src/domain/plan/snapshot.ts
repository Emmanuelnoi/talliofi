import type { MonthlySnapshot, RollingAverages } from './types';
import type { PlanComputeInput } from './calc';
import { computePlanSummary } from './calc';
import { sumMoney, divideMoney } from '@/domain/money';

/** Percentage change threshold for trend detection */
const TREND_CHANGE_THRESHOLD = 5;

export function createMonthlySnapshot(
  input: PlanComputeInput,
): MonthlySnapshot {
  const summary = computePlanSummary(input);

  return {
    id: crypto.randomUUID(),
    planId: input.plan.id,
    yearMonth: summary.yearMonth,
    grossIncomeCents: summary.grossMonthlyIncome,
    netIncomeCents: summary.netMonthlyIncome,
    totalExpensesCents: summary.totalMonthlyExpenses,
    bucketSummaries: summary.bucketAnalysis.map((b) => ({
      bucketId: b.bucketId,
      bucketName: b.bucketName,
      allocatedCents: b.availableCents,
      spentCents: b.actualAmountCents,
      remainingCents: b.varianceCents,
    })),
    createdAt: new Date().toISOString(),
  };
}

export function computeRollingAverages(
  snapshots: readonly MonthlySnapshot[],
  months: 3 | 6 | 12 = 3,
): RollingAverages | null {
  if (snapshots.length < months) return null;

  const recent = [...snapshots]
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
    .slice(0, months);

  const total = sumMoney(recent.map((s) => s.totalExpensesCents));
  const avgExpenses = divideMoney(total, recent.length);

  const trend = calculateTrend(recent);

  return {
    monthsIncluded: recent.length,
    avgTotalExpenses: avgExpenses,
    trend,
  };
}

export function calculateTrend(
  snapshots: readonly MonthlySnapshot[],
): 'increasing' | 'decreasing' | 'stable' {
  if (snapshots.length < 2) return 'stable';

  // Compare first half average to second half average
  const mid = Math.floor(snapshots.length / 2);
  const recentHalf = snapshots.slice(0, mid);
  const olderHalf = snapshots.slice(mid);

  const recentAvg =
    recentHalf.reduce((sum, s) => sum + s.totalExpensesCents, 0) /
    recentHalf.length;
  const olderAvg =
    olderHalf.reduce((sum, s) => sum + s.totalExpensesCents, 0) /
    olderHalf.length;

  // Guard against division by zero
  if (olderAvg === 0) return 'stable';

  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (changePercent > TREND_CHANGE_THRESHOLD) return 'increasing';
  if (changePercent < -TREND_CHANGE_THRESHOLD) return 'decreasing';
  return 'stable';
}
