import type {
  Plan,
  BucketAllocation,
  BucketAnalysis,
  BudgetAlert,
} from './types';
import type { Cents } from '@/domain/money';
import { centsToDollars } from '@/domain/money';

const BUCKET_OVERAGE_ERROR_THRESHOLD = 20;
const DEFICIT_ERROR_THRESHOLD = 10;
const MAX_ALLOCATION_PERCENT = 100;

export interface AlertContext {
  plan: Plan;
  buckets: readonly BucketAllocation[];
  netMonthlyIncome: Cents;
  totalMonthlyExpenses: Cents;
  bucketAnalysis: readonly BucketAnalysis[];
  surplusOrDeficit: Cents;
}

/**
 * Generates actionable budget alerts based on the current plan state.
 * Checks for: bucket overages, budget deficits, allocation exceeding 100%,
 * and missing savings bucket.
 */
export function generateAlerts(context: AlertContext): readonly BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  // Bucket overages
  for (const bucket of context.bucketAnalysis) {
    if (bucket.status === 'over') {
      const overPercent = Math.abs(
        ((bucket.actualPercentage - bucket.targetPercentage) /
          bucket.targetPercentage) *
          100,
      );
      alerts.push({
        severity:
          overPercent > BUCKET_OVERAGE_ERROR_THRESHOLD ? 'error' : 'warning',
        code: 'BUCKET_OVER_BUDGET',
        message: `${bucket.bucketName} is ${overPercent.toFixed(1)}% over budget`,
        relatedEntityId: bucket.bucketId,
      });
    }
  }

  // Budget deficit
  if (context.surplusOrDeficit < 0) {
    const deficit = Math.abs(context.surplusOrDeficit) as Cents;
    const deficitPercent =
      context.netMonthlyIncome > 0
        ? (deficit / context.netMonthlyIncome) * 100
        : 100;
    alerts.push({
      severity: deficitPercent > DEFICIT_ERROR_THRESHOLD ? 'error' : 'warning',
      code: 'BUDGET_DEFICIT',
      message: `Monthly spending exceeds income by ${centsToDollars(deficit).toFixed(2)}`,
    });
  }

  // Percentage allocations exceed 100%
  const percentBuckets = context.buckets.filter((b) => b.mode === 'percentage');
  const totalAllocation = percentBuckets.reduce(
    (sum, b) => sum + (b.targetPercentage ?? 0),
    0,
  );
  if (totalAllocation > MAX_ALLOCATION_PERCENT) {
    alerts.push({
      severity: 'error',
      code: 'ALLOCATIONS_EXCEED_100',
      message: `Percentage allocations total ${totalAllocation.toFixed(1)}% — exceeds 100%`,
    });
  }

  // No savings bucket
  const hasSavingsBucket = context.bucketAnalysis.some((b) =>
    b.bucketName.toLowerCase().includes('saving'),
  );
  if (!hasSavingsBucket) {
    alerts.push({
      severity: 'info',
      code: 'NO_SAVINGS_BUCKET',
      message: 'Consider adding a savings bucket to track savings goals',
    });
  }

  return alerts;
}
