import type {
  Plan,
  PlanSummary,
  BucketAnalysis,
  BucketAllocation,
  ExpenseCategory,
  ExpenseItem,
  TaxComponent,
} from './types';
import type { Cents } from '@/domain/money';
import { cents, subtractMoney, percentOf, addMoney } from '@/domain/money';
import { normalizeToMonthly } from './normalize';
import { generateAlerts } from './rules';

/** Variance threshold (%) within which a bucket is considered on-target */
const BUCKET_VARIANCE_THRESHOLD = 5;

export interface PlanComputeInput {
  plan: Plan;
  buckets: readonly BucketAllocation[];
  expenses: readonly ExpenseItem[];
  taxComponents: readonly TaxComponent[];
}

/**
 * Computes a full financial summary for the given plan, normalizing all
 * income and expenses to monthly amounts, then deriving tax, net income,
 * bucket allocations, surplus/deficit, and actionable alerts.
 */
export function computePlanSummary(
  input: PlanComputeInput,
  yearMonth?: string,
): PlanSummary {
  const { plan, buckets, expenses, taxComponents } = input;
  const currentYearMonth = yearMonth ?? getCurrentYearMonth();

  // 1. Monthly income
  const grossMonthlyIncome = normalizeToMonthly(
    plan.grossIncomeCents,
    plan.incomeFrequency,
  );

  // 2. Tax
  const estimatedTax = computeTax(grossMonthlyIncome, plan, taxComponents);
  const netMonthlyIncome = subtractMoney(grossMonthlyIncome, estimatedTax);

  // 3. Aggregate expenses
  const { totalMonthlyExpenses, expensesByCategory, expensesByBucket } =
    aggregateExpenses(expenses);

  // 4. Bucket analysis
  const bucketAnalysis = computeBucketAnalysis(
    buckets,
    expensesByBucket,
    netMonthlyIncome,
  );

  // 5. Bottom line
  const surplusOrDeficit = subtractMoney(
    netMonthlyIncome,
    totalMonthlyExpenses,
  );
  const savingsRate =
    netMonthlyIncome > 0 ? (surplusOrDeficit / netMonthlyIncome) * 100 : 0;

  // 6. Alerts
  const alerts = generateAlerts({
    plan,
    buckets,
    netMonthlyIncome,
    totalMonthlyExpenses,
    bucketAnalysis,
    surplusOrDeficit,
  });

  return {
    planId: plan.id,
    yearMonth: currentYearMonth,
    grossMonthlyIncome,
    estimatedTax,
    netMonthlyIncome,
    totalMonthlyExpenses,
    expensesByCategory,
    expensesByBucket,
    bucketAnalysis,
    surplusOrDeficit,
    savingsRate,
    alerts,
  };
}

/**
 * Computes monthly tax in cents. In 'simple' mode, uses the plan's
 * effective rate. In 'itemized' mode, sums individual component rates.
 */
export function computeTax(
  grossMonthly: Cents,
  plan: Plan,
  taxComponents: readonly TaxComponent[],
): Cents {
  if (plan.taxMode === 'simple') {
    return percentOf(grossMonthly, plan.taxEffectiveRate ?? 0);
  }

  const totalRate = taxComponents.reduce((sum, c) => sum + c.ratePercent, 0);
  return percentOf(grossMonthly, totalRate);
}

function aggregateExpenses(expenses: readonly ExpenseItem[]) {
  const byCategory = new Map<ExpenseCategory, Cents>();
  const byBucket = new Map<string, Cents>();
  let total = cents(0);

  for (const expense of expenses) {
    const monthly = normalizeToMonthly(expense.amountCents, expense.frequency);
    total = addMoney(total, monthly);

    const catCurrent = byCategory.get(expense.category) ?? cents(0);
    byCategory.set(expense.category, addMoney(catCurrent, monthly));

    const bucketCurrent = byBucket.get(expense.bucketId) ?? cents(0);
    byBucket.set(expense.bucketId, addMoney(bucketCurrent, monthly));
  }

  return {
    totalMonthlyExpenses: total,
    expensesByCategory: byCategory as ReadonlyMap<ExpenseCategory, Cents>,
    expensesByBucket: byBucket as ReadonlyMap<string, Cents>,
  };
}

function computeBucketAnalysis(
  allocations: readonly BucketAllocation[],
  actualByBucket: ReadonlyMap<string, Cents>,
  netMonthlyIncome: Cents,
): readonly BucketAnalysis[] {
  return allocations.map((allocation) => {
    const targetAmountCents =
      allocation.mode === 'percentage'
        ? percentOf(netMonthlyIncome, allocation.targetPercentage ?? 0)
        : (allocation.targetAmountCents ?? cents(0));

    const targetPercentage =
      allocation.mode === 'percentage'
        ? (allocation.targetPercentage ?? 0)
        : netMonthlyIncome > 0
          ? ((allocation.targetAmountCents ?? 0) / netMonthlyIncome) * 100
          : 0;

    const actualAmountCents = actualByBucket.get(allocation.id) ?? cents(0);

    const varianceCents = subtractMoney(targetAmountCents, actualAmountCents);

    // Guard: avoid division by zero when net income is zero (e.g., no income entered yet)
    const actualPercentage =
      netMonthlyIncome > 0 ? (actualAmountCents / netMonthlyIncome) * 100 : 0;

    // Guard: avoid division by zero when target percentage is zero (e.g., unconfigured bucket)
    const variancePercent =
      targetPercentage > 0
        ? ((targetPercentage - actualPercentage) / targetPercentage) * 100
        : 0;

    const status: 'under' | 'on_target' | 'over' =
      variancePercent > BUCKET_VARIANCE_THRESHOLD
        ? 'under'
        : variancePercent < -BUCKET_VARIANCE_THRESHOLD
          ? 'over'
          : 'on_target';

    return {
      bucketId: allocation.id,
      bucketName: allocation.name,
      targetPercentage,
      actualPercentage,
      targetAmountCents,
      actualAmountCents,
      varianceCents,
      status,
    };
  });
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
