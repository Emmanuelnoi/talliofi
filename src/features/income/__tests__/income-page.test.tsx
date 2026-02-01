import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { planRepo } from '@/data/repos/plan-repo';
import { cents } from '@/domain/money';
import IncomePage from '../pages/income-page';

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

async function seedPlan() {
  return planRepo.create({
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
}

describe('IncomePage', () => {
  it('renders page header', async () => {
    await seedPlan();
    render(createElement(IncomePage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Income')).toBeInTheDocument();
    });
  });

  it('shows onboarding message when no plan exists', async () => {
    render(createElement(IncomePage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText('Complete onboarding to set up your income.'),
      ).toBeInTheDocument();
    });
  });

  it('displays current income value from plan', async () => {
    await seedPlan();
    render(createElement(IncomePage), { wrapper: createWrapper() });

    await waitFor(() => {
      const input = screen.getByLabelText('Amount');
      expect(input).toHaveValue('5,000.00');
    });
  });

  it('displays current frequency from plan', async () => {
    await seedPlan();
    render(createElement(IncomePage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument();
    });
  });

  it('renders gross income card', async () => {
    await seedPlan();
    render(createElement(IncomePage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Gross income')).toBeInTheDocument();
    });
  });
});
