import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, it, expect, vi } from 'vitest';
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
    transactionDate: '2026-01-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { plan, bucket, expense };
}

async function seedMultipleExpenses() {
  const { plan, bucket } = await seedData();

  // Add more expenses for filter testing
  await expenseRepo.create({
    id: crypto.randomUUID(),
    planId: plan.id,
    bucketId: bucket.id,
    name: 'Groceries Shopping',
    amountCents: cents(40000) as Cents,
    frequency: 'monthly',
    category: 'groceries',
    isFixed: false,
    notes: 'Weekly grocery run',
    transactionDate: '2026-01-20',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await expenseRepo.create({
    id: crypto.randomUUID(),
    planId: plan.id,
    bucketId: bucket.id,
    name: 'Electric Bill',
    amountCents: cents(15000) as Cents,
    frequency: 'monthly',
    category: 'utilities',
    isFixed: true,
    transactionDate: '2026-01-10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { plan, bucket };
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

  it('displays search input when expenses exist', async () => {
    await seedData();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Search expenses')).toBeInTheDocument();
    });
  });

  it('shows filters toggle button', async () => {
    await seedData();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /filters/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows expense count summary', async () => {
    await seedData();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/1 expense/)).toBeInTheDocument();
    });
  });

  it('shows multiple expenses count', async () => {
    await seedMultipleExpenses();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/3 expenses/)).toBeInTheDocument();
    });
  });

  it('filters expenses by search query', async () => {
    await seedMultipleExpenses();
    const user = userEvent.setup();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    // Wait for expenses to load
    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    // Type in search
    const searchInput = screen.getByLabelText('Search expenses');
    await user.type(searchInput, 'Groceries');

    // Wait for debounce (300ms) and filtering
    await waitFor(
      () => {
        expect(screen.getByText('Groceries Shopping')).toBeInTheDocument();
        expect(screen.queryByText('Electric Bill')).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('shows no matching expenses message when search has no results', async () => {
    await seedData();
    const user = userEvent.setup();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search expenses');
    await user.type(searchInput, 'nonexistent');

    await waitFor(
      () => {
        expect(screen.getByText('No matching expenses')).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('displays filter chips when filters are active', async () => {
    await seedData();
    const user = userEvent.setup();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search expenses');
    await user.type(searchInput, 'Rent');

    await waitFor(
      () => {
        expect(screen.getByText(/Search: "Rent"/)).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('shows clear search button when typing', async () => {
    await seedData();
    const user = userEvent.setup();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search expenses');
    // Type a single character
    await user.type(searchInput, 'a');

    // The Clear search X button appears immediately in the input field
    await waitFor(() => {
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });
  });

  it('clears search input when clear button is clicked', async () => {
    await seedData();
    const user = userEvent.setup();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search expenses');
    await user.type(searchInput, 'test');

    // The Clear search button appears immediately when there's input
    await waitFor(() => {
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Clear search'));

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('displays transaction date in expense card', async () => {
    await seedData();
    render(createElement(ExpensesPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument();
    });
  });
});
