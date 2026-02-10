import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useUIStore } from '@/stores/ui-store';
import OnboardingPage from '../pages/onboarding-page';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderOnboarding() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/dashboard"
            element={<div data-testid="dashboard">Dashboard</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    // Reset onboarding step to 0 before each test
    useUIStore.setState({ onboardingStep: 0 });
  });

  it('renders the first step (income)', () => {
    renderOnboarding();

    expect(screen.getByText('What is your gross income?')).toBeInTheDocument();
    expect(screen.getByLabelText('Gross income ($)')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
  });

  it('shows income frequency select', () => {
    renderOnboarding();

    expect(screen.getByLabelText('Pay frequency')).toBeInTheDocument();
  });

  it('navigates to tax step when income is valid', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    const incomeInput = screen.getByLabelText('Gross income ($)');
    await user.clear(incomeInput);
    await user.type(incomeInput, '5000');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Estimate your taxes')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
  });

  it('navigates back from tax step to income step', async () => {
    const user = userEvent.setup();

    // Start at step 1 (tax)
    useUIStore.setState({ onboardingStep: 1 });
    renderOnboarding();

    expect(screen.getByText('Estimate your taxes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(
      await screen.findByText('What is your gross income?'),
    ).toBeInTheDocument();
  });

  it('shows progress indicator with correct step count', () => {
    renderOnboarding();

    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the summary step title in header', () => {
    useUIStore.setState({ onboardingStep: 5 });
    renderOnboarding();

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Step 6 of 6')).toBeInTheDocument();
  });

  it('shows the template step', () => {
    useUIStore.setState({ onboardingStep: 2 });
    renderOnboarding();

    expect(screen.getByText('Choose a starting point')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument();
  });
});
