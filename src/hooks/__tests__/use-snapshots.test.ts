import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { useSnapshots } from '../use-snapshots';
import { planRepo } from '@/data/repos/plan-repo';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { cents } from '@/domain/money';
import type { Plan, MonthlySnapshot } from '@/domain/plan/types';

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
    name: 'Test Plan',
    grossIncomeCents: cents(500000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 20,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

function makeSnapshot(
  planId: string,
  overrides: Partial<MonthlySnapshot> = {},
): MonthlySnapshot {
  return {
    id: crypto.randomUUID(),
    planId,
    yearMonth: '2026-01',
    grossIncomeCents: cents(500000),
    netIncomeCents: cents(400000),
    totalExpensesCents: cents(300000),
    bucketSummaries: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('useSnapshots', () => {
  it('returns empty array when no snapshots exist', async () => {
    const plan = makePlan();
    await planRepo.create(plan);

    const { result } = renderHook(() => useSnapshots(plan.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('returns snapshots sorted by yearMonth for a seeded plan', async () => {
    const plan = makePlan();
    await planRepo.create(plan);

    await snapshotRepo.upsert(makeSnapshot(plan.id, { yearMonth: '2026-03' }));
    await snapshotRepo.upsert(makeSnapshot(plan.id, { yearMonth: '2026-01' }));
    await snapshotRepo.upsert(makeSnapshot(plan.id, { yearMonth: '2026-02' }));

    const { result } = renderHook(() => useSnapshots(plan.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.map((s) => s.yearMonth)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('does not fetch when planId is undefined', () => {
    const { result } = renderHook(() => useSnapshots(undefined), {
      wrapper: createWrapper(),
    });

    // Query should not run — isPending is true because it's disabled
    expect(result.current.fetchStatus).toBe('idle');
  });
});
