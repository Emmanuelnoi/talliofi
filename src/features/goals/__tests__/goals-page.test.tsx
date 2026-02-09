import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import GoalsPage from '../pages/goals-page';
import { db } from '@/data/db';
import type { Plan, Goal } from '@/domain/plan';

// Mock nuqs
vi.mock('nuqs', () => ({
  useQueryStates: () => [{ status: 'all', type: 'all' }, vi.fn()],
  parseAsString: {
    withDefault: () => ({ defaultValue: '' }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

const mockPlan: Plan = {
  id: 'test-plan-id',
  name: 'Test Plan',
  grossIncomeCents: 500000,
  incomeFrequency: 'monthly',
  taxMode: 'simple',
  taxEffectiveRate: 25,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
};

const mockGoal: Goal = {
  id: 'goal-1',
  planId: 'test-plan-id',
  name: 'Emergency Fund',
  type: 'savings',
  targetAmountCents: 1000000,
  currentAmountCents: 250000,
  color: '#10B981',
  isCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCompletedGoal: Goal = {
  id: 'goal-2',
  planId: 'test-plan-id',
  name: 'Credit Card Payoff',
  type: 'debt_payoff',
  targetAmountCents: 500000,
  currentAmountCents: 500000,
  color: '#EF4444',
  isCompleted: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('GoalsPage', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.plans.clear();
    await db.goals.clear();
  });

  it('shows loading spinner initially', () => {
    render(<GoalsPage />, { wrapper: createWrapper() });

    // Look for the spinner by class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows empty state when no goals exist', async () => {
    await db.plans.add(mockPlan);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/create your first financial goal/i),
    ).toBeInTheDocument();
  });

  it('displays goals when they exist', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    expect(screen.getByText('Savings')).toBeInTheDocument();
    // There are multiple 25% elements (stats and goal card), use getAllByText
    expect(screen.getAllByText('25%').length).toBeGreaterThan(0);
  });

  it('shows add goal button', async () => {
    await db.plans.add(mockPlan);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add goal/i }),
      ).toBeInTheDocument();
    });
  });

  it('opens goal form when add button is clicked', async () => {
    await db.plans.add(mockPlan);
    const user = userEvent.setup();

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add goal/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add goal/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('New goal')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target amount/i)).toBeInTheDocument();
  });

  it('displays progress bar for goals', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  it('displays goal statistics', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockGoal);
    await db.goals.add(mockCompletedGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Active Goals')).toBeInTheDocument();
    });

    // The page shows "Completed" in both stats and badges
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
  });

  it('shows remaining amount for incomplete goals', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    expect(screen.getByText(/\$7,500\.00 remaining/)).toBeInTheDocument();
  });

  it('shows completed badge for completed goals', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockCompletedGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Credit Card Payoff')).toBeInTheDocument();
    });

    // There are multiple "Completed" elements (stats and badge)
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
  });

  it('shows filter controls', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('combobox', { name: /filter by status/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /filter by type/i }),
    ).toBeInTheDocument();
  });

  it('shows goal type labels correctly', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  it('shows debt payoff type correctly', async () => {
    await db.plans.add(mockPlan);
    await db.goals.add(mockCompletedGoal);

    render(<GoalsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Credit Card Payoff')).toBeInTheDocument();
    });

    expect(screen.getByText('Debt Payoff')).toBeInTheDocument();
  });
});
