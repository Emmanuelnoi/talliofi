import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { useAutoSnapshot } from '../use-auto-snapshot';
import { planRepo } from '@/data/repos/plan-repo';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { cents } from '@/domain/money';
import type { Plan, MonthlySnapshot } from '@/domain/plan/types';

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

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

function makePlan(overrides: Partial<Plan> = {}): Plan {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Auto Snapshot Plan',
    grossIncomeCents: cents(600000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 25,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

describe('useAutoSnapshot', () => {
  it('creates a snapshot when none exists for current month', async () => {
    const plan = makePlan();
    await planRepo.create(plan);

    const yearMonth = getCurrentYearMonth();

    // Verify no snapshot exists yet
    const before = await snapshotRepo.getByPlanAndMonth(plan.id, yearMonth);
    expect(before).toBeUndefined();

    const getByPlanAndMonthSpy = vi.spyOn(snapshotRepo, 'getByPlanAndMonth');

    const { result } = renderHook(() => useAutoSnapshot(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByPlanAndMonthSpy).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
    getByPlanAndMonthSpy.mockRestore();

    const after = await snapshotRepo.getByPlanAndMonth(plan.id, yearMonth);
    expect(after).toBeDefined();

    const snapshot = await snapshotRepo.getByPlanAndMonth(plan.id, yearMonth);
    expect(snapshot?.planId).toBe(plan.id);
    expect(snapshot?.yearMonth).toBe(yearMonth);
  });

  it('does NOT create a duplicate when snapshot already exists', async () => {
    const plan = makePlan();
    await planRepo.create(plan);

    const yearMonth = getCurrentYearMonth();

    // Pre-seed a snapshot for this month
    const existingSnapshot: MonthlySnapshot = {
      id: crypto.randomUUID(),
      planId: plan.id,
      yearMonth,
      grossIncomeCents: cents(600000),
      netIncomeCents: cents(450000),
      totalExpensesCents: cents(200000),
      bucketSummaries: [],
      createdAt: new Date().toISOString(),
    };
    await snapshotRepo.upsert(existingSnapshot);

    const getByPlanAndMonthSpy = vi.spyOn(snapshotRepo, 'getByPlanAndMonth');

    const { result } = renderHook(() => useAutoSnapshot(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByPlanAndMonthSpy).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
    getByPlanAndMonthSpy.mockRestore();

    const all = await snapshotRepo.getByPlanId(plan.id);
    // Should still have exactly 1 snapshot, not 2
    expect(all).toHaveLength(1);

    // Verify it's the same snapshot (not overwritten)
    const snapshot = await snapshotRepo.getByPlanAndMonth(plan.id, yearMonth);
    expect(snapshot?.id).toBe(existingSnapshot.id);
  });

  it('handles missing plan gracefully', async () => {
    // No plan seeded — hook should not throw
    const { result } = renderHook(() => useAutoSnapshot(), {
      wrapper: createWrapper(),
    });

    // isCreating should remain false since there is no plan
    expect(result.current.isCreating).toBe(false);
  });
});
