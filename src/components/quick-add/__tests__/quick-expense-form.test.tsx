import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickExpenseForm } from '../quick-expense-form';

const mockMutateAsync = vi.fn().mockResolvedValue({});

// Mock hooks
vi.mock('@/hooks/use-active-plan', () => ({
  useActivePlan: () => ({
    data: {
      id: 'plan-1',
      name: 'Test Plan',
      grossIncomeCents: 500000,
      incomeFrequency: 'monthly',
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-plan-data', () => ({
  useBuckets: () => ({
    data: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        planId: 'plan-1',
        name: 'Essentials',
        color: '#4A90D9',
        mode: 'percentage',
        targetPercentage: 50,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        planId: 'plan-1',
        name: 'Savings',
        color: '#50C878',
        mode: 'percentage',
        targetPercentage: 30,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-plan-mutations', () => ({
  useCreateExpense: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('QuickExpenseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with essential fields', () => {
    renderWithProviders(<QuickExpenseForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bucket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });

  it('shows more options when expanded', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickExpenseForm />);

    // More options should be collapsed initially
    expect(screen.queryByLabelText(/frequency/i)).not.toBeInTheDocument();

    // Click to expand
    const moreOptionsButton = screen.getByRole('button', {
      name: /more options/i,
    });
    await user.click(moreOptionsButton);

    // Now frequency, fixed toggle, and notes should be visible
    expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fixed expense/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickExpenseForm />);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /add expense/i });
    await user.click(submitButton);

    // Should show validation error for name
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('validates amount is positive', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickExpenseForm />);

    // Fill in name but leave amount at 0
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test Expense');

    const submitButton = screen.getByRole('button', { name: /add expense/i });
    await user.click(submitButton);

    // Should show validation error for amount
    await waitFor(() => {
      expect(
        screen.getByText(/amount must be greater than 0/i),
      ).toBeInTheDocument();
    });
  });

  it('submits the form successfully', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<QuickExpenseForm onSuccess={onSuccess} />);

    // Fill in required fields
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Coffee');

    const amountInput = screen.getByRole('textbox', { name: /amount/i });
    await user.clear(amountInput);
    await user.type(amountInput, '5.50');

    // Submit
    const submitButton = screen.getByRole('button', { name: /add expense/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Coffee',
          amountCents: 550,
          category: 'other',
          bucketId: '11111111-1111-4111-8111-111111111111',
        }),
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithProviders(<QuickExpenseForm onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('defaults to today for transaction date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00'));

    try {
      renderWithProviders(<QuickExpenseForm />);

      const dateButton = screen.getByLabelText(/date/i);
      const today = new Date();
      const expectedFormat = today.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // The button should show today's date
      expect(dateButton).toHaveTextContent(new RegExp(expectedFormat, 'i'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders category select with default value', () => {
    renderWithProviders(<QuickExpenseForm />);

    // Category select should be rendered
    const categoryTrigger = screen.getByLabelText(/category/i);
    expect(categoryTrigger).toBeInTheDocument();
    // Default category is "other"
    expect(categoryTrigger).toHaveTextContent(/other/i);
  });

  it('renders bucket select with available buckets', () => {
    renderWithProviders(<QuickExpenseForm />);

    // Bucket select should be rendered
    const bucketTrigger = screen.getByLabelText(/bucket/i);
    expect(bucketTrigger).toBeInTheDocument();
    // Default to first bucket
    expect(bucketTrigger).toHaveTextContent(/essentials/i);
  });
});
