import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { cents } from '@/domain/money';
import { usePlanSummary } from '../hooks/use-plan-summary';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

async function seedFullPlan() {
  const planId = crypto.randomUUID();
  const bucketId = crypto.randomUUID();

  await planRepo.create({
    id: planId,
    name: 'Test Plan',
    grossIncomeCents: cents(500000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0,
  });

  await bucketRepo.create({
    id: bucketId,
    planId,
    name: 'Essentials',
    color: '#4A90D9',
    mode: 'percentage',
    targetPercentage: 50,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  });

  await expenseRepo.create({
    id: crypto.randomUUID(),
    planId,
    bucketId,
    name: 'Rent',
    amountCents: cents(150000),
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await taxComponentRepo.create({
    id: crypto.randomUUID(),
    planId,
    name: 'Federal',
    ratePercent: 22,
    sortOrder: 0,
  });

  return { planId, bucketId };
}

describe('usePlanSummary', () => {
  it('returns null summary when no plan exists in DB', async () => {
    const { result } = renderHook(() => usePlanSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toBeNull();
    expect(result.current.plan).toBeNull();
  });

  it('computes correct summary with seeded data', async () => {
    await seedFullPlan();

    const { result } = renderHook(() => usePlanSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull();
    });

    const summary = result.current.summary!;

    // Gross income: $5,000 monthly = 500000 cents
    expect(summary.grossMonthlyIncome).toBe(500000);

    // Tax: 25% effective rate on simple mode = 125000 cents
    expect(summary.estimatedTax).toBe(125000);

    // Net: 500000 - 125000 = 375000
    expect(summary.netMonthlyIncome).toBe(375000);

    // Expenses: $1,500 rent = 150000 cents
    expect(summary.totalMonthlyExpenses).toBe(150000);

    // Surplus: 375000 - 150000 = 225000
    expect(summary.surplusOrDeficit).toBe(225000);

    // Savings rate: (225000 / 375000) * 100 = 60%
    expect(summary.savingsRate).toBe(60);

    // Bucket analysis should have one entry
    expect(summary.bucketAnalysis).toHaveLength(1);
    expect(summary.bucketAnalysis[0].bucketName).toBe('Essentials');

    // Expenses by category should include housing
    expect(summary.expensesByCategory.get('housing')).toBe(150000);
  });

  it('handles zero income without division errors', async () => {
    await planRepo.create({
      id: crypto.randomUUID(),
      name: 'Zero Income Plan',
      grossIncomeCents: cents(0),
      incomeFrequency: 'monthly',
      taxMode: 'simple',
      taxEffectiveRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
    });

    const { result } = renderHook(() => usePlanSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull();
    });

    const summary = result.current.summary!;
    expect(summary.grossMonthlyIncome).toBe(0);
    expect(summary.netMonthlyIncome).toBe(0);
    expect(summary.savingsRate).toBe(0);
    // No NaN or Infinity
    expect(Number.isFinite(summary.savingsRate)).toBe(true);
  });
});
