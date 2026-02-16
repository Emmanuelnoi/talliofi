import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { planRepo } from '@/data/repos/plan-repo';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { cents } from '@/domain/money';
import type { Plan, MonthlySnapshot } from '@/domain/plan/types';
import HistoryPage from '../pages/history-page';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'History Test Plan',
    grossIncomeCents: cents(800000),
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
    grossIncomeCents: cents(800000),
    netIncomeCents: cents(640000),
    totalExpensesCents: cents(400000),
    bucketSummaries: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('HistoryPage', () => {
  it('renders empty state when no snapshots exist', async () => {
    const plan = makePlan();
    await planRepo.create(plan);

    render(<HistoryPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No history yet')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Snapshots are saved automatically each month. Check back next month to see your trends.',
      ),
    ).toBeInTheDocument();
  });

  it('renders snapshot list and trend chart with seeded data', async () => {
    const plan = makePlan();
    await planRepo.create(plan);

    await snapshotRepo.upsert(
      makeSnapshot(plan.id, {
        yearMonth: '2026-01',
        netIncomeCents: cents(640000),
        totalExpensesCents: cents(400000),
      }),
    );
    await snapshotRepo.upsert(
      makeSnapshot(plan.id, {
        yearMonth: '2026-02',
        netIncomeCents: cents(640000),
        totalExpensesCents: cents(420000),
      }),
    );

    render(<HistoryPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    // Snapshot list should render month labels
    expect(screen.getByText('January 2026')).toBeInTheDocument();
    expect(screen.getByText('February 2026')).toBeInTheDocument();

    // Trend chart title should appear (lazy-loaded via Suspense)
    await waitFor(
      () => {
        expect(screen.getByText('Income vs. Expenses')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Monthly snapshots section header
    expect(screen.getByText('Monthly Snapshots')).toBeInTheDocument();
  });

  it('shows rolling average when enough data exists', async () => {
    const plan = makePlan();
    await planRepo.create(plan);

    // Seed 3 months of data for the 3-month rolling average
    await snapshotRepo.upsert(
      makeSnapshot(plan.id, {
        yearMonth: '2026-01',
        totalExpensesCents: cents(300000),
      }),
    );
    await snapshotRepo.upsert(
      makeSnapshot(plan.id, {
        yearMonth: '2026-02',
        totalExpensesCents: cents(350000),
      }),
    );
    await snapshotRepo.upsert(
      makeSnapshot(plan.id, {
        yearMonth: '2026-03',
        totalExpensesCents: cents(400000),
      }),
    );

    render(<HistoryPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('3-Month Rolling Average')).toBeInTheDocument();
    });

    // Should show the average expense label
    expect(screen.getByText('Avg. Monthly Expenses')).toBeInTheDocument();
  });
});
