import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { cents } from '@/domain/money';
import type { Cents } from '@/domain/money';
import ExpensesPage from '../pages/expenses-page';

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
      createElement(NuqsTestingAdapter, null, children),
    );
  };
}

async function seedData() {
  const plan = await planRepo.create({
    id: crypto.randomUUID(),
    name: 'Test Plan',
    grossIncomeCents: cents(500000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0,
  });

  const bucket = await bucketRepo.create({
    id: crypto.randomUUID(),
    planId: plan.id,
    name: 'Essentials',
    color: '#4A90D9',
    mode: 'percentage',
    targetPercentage: 50,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  });

  const expense = await expenseRepo.create({
    id: crypto.randomUUID(),
    planId: plan.id,
    bucketId: bucket.id,
    name: 'Rent',
    amountCents: cents(150000) as Cents,
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { plan, bucket, expense };
}

describe('ExpensesPage', () => {
  it('renders page header', async () => {
    await seedData();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Expenses')).toBeInTheDocument();
    });
  });

  it('shows empty state when no expenses exist', async () => {
    await planRepo.create({
      id: crypto.randomUUID(),
      name: 'Empty Plan',
      grossIncomeCents: cents(500000),
      incomeFrequency: 'monthly',
      taxMode: 'simple',
      taxEffectiveRate: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
    });

    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No expenses yet')).toBeInTheDocument();
    });
  });

  it('displays expense list from database', async () => {
    await seedData();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Fixed')).toBeInTheDocument();
  });

  it('shows add expense button', async () => {
    await seedData();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add expense/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows onboarding message when no plan exists', async () => {
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText('Complete onboarding to start tracking expenses.'),
      ).toBeInTheDocument();
    });
  });

  it('shows monthly amount with normalized display', async () => {
    const plan = await planRepo.create({
      id: crypto.randomUUID(),
      name: 'Test Plan',
      grossIncomeCents: cents(500000),
      incomeFrequency: 'monthly',
      taxMode: 'simple',
      taxEffectiveRate: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
    });

    const bucket = await bucketRepo.create({
      id: crypto.randomUUID(),
      planId: plan.id,
      name: 'Essentials',
      color: '#4A90D9',
      mode: 'percentage',
      targetPercentage: 50,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    });

    // Create a quarterly expense
    await expenseRepo.create({
      id: crypto.randomUUID(),
      planId: plan.id,
      bucketId: bucket.id,
      name: 'Insurance',
      amountCents: cents(60000) as Cents,
      frequency: 'quarterly',
      category: 'insurance',
      isFixed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      // "Insurance" appears in both the expense card and filter dropdown
      // so we check for the normalized monthly amount which is unique
      expect(screen.getByText('$200.00/mo')).toBeInTheDocument();
    });
  });
});
