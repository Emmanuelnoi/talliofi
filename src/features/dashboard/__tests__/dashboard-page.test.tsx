import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { cents } from '@/domain/money';
import DashboardPage from '../pages/dashboard-page';

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

async function seedFullDashboard() {
  const planId = crypto.randomUUID();
  const bucketId = crypto.randomUUID();

  await planRepo.create({
    id: planId,
    name: 'Dashboard Test Plan',
    grossIncomeCents: cents(800000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 20,
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
    amountCents: cents(200000),
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { planId, bucketId };
}

/**
 * Seeds a plan that triggers zero alerts:
 * - includes a "Savings" bucket so NO_SAVINGS_BUCKET does not fire
 * - allocations do not exceed 100%
 * - no deficit (surplus is positive)
 * - bucket spending is on-target
 */
async function seedDashboardWithNoAlerts() {
  const planId = crypto.randomUUID();
  const savingsBucketId = crypto.randomUUID();

  await planRepo.create({
    id: planId,
    name: 'No Alerts Plan',
    grossIncomeCents: cents(800000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0,
  });

  await bucketRepo.create({
    id: savingsBucketId,
    planId,
    name: 'Savings',
    color: '#50C878',
    mode: 'percentage',
    targetPercentage: 30,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  });

  return { planId };
}

describe('DashboardPage', () => {
  it('shows empty state when no plan exists', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No plan yet')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Complete onboarding to see your financial overview.'),
    ).toBeInTheDocument();
  });

  it('renders page header', async () => {
    await seedFullDashboard();
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Overview of your financial plan.'),
    ).toBeInTheDocument();
  });

  it('renders income summary card with seeded data', async () => {
    await seedFullDashboard();
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Income Summary')).toBeInTheDocument();
    });

    // Gross Income label should be present
    expect(screen.getByText('Gross Income')).toBeInTheDocument();
    // Net Income appears in both IncomeSummaryCard and KeyNumbersGrid
    expect(screen.getAllByText('Net Income').length).toBeGreaterThanOrEqual(1);
  });

  it('renders key numbers grid', async () => {
    await seedFullDashboard();
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Surplus / Deficit')).toBeInTheDocument();
    });

    expect(screen.getByText('Savings Rate')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
  });

  it('renders spending by category chart', async () => {
    await seedFullDashboard();
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Spending by Category')).toBeInTheDocument();
    });
  });

  it('hides alerts panel when no alerts are triggered', async () => {
    await seedDashboardWithNoAlerts();
    render(<DashboardPage />, { wrapper: createWrapper() });

    // Wait for the dashboard to fully load
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Income Summary')).toBeInTheDocument();
    });

    // The "Alerts" card title should not appear when there are no alerts
    expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
  });
});
