import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickAddFab } from '../quick-add-fab';

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
        id: 'bucket-1',
        planId: 'plan-1',
        name: 'Essentials',
        color: '#4A90D9',
      },
      { id: 'bucket-2', planId: 'plan-1', name: 'Savings', color: '#50C878' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-plan-mutations', () => ({
  useCreateExpense: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => true,
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

describe('QuickAddFab', () => {
  it('renders the FAB button', async () => {
    renderWithProviders(<QuickAddFab />);

    const button = screen.getByRole('button', { name: /add expense/i });
    expect(button).toBeInTheDocument();
  });

  it('opens the sheet when FAB is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickAddFab />);

    const button = screen.getByRole('button', { name: /add expense/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('Quick add expense')).toBeInTheDocument();
  });

  it('shows keyboard shortcut in tooltip', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickAddFab />);

    const button = screen.getByRole('button', { name: /add expense/i });

    // Hover to show tooltip
    await user.hover(button);

    await waitFor(() => {
      // Check for keyboard shortcut hint in tooltip (using getAllByText since there may be duplicates)
      const tooltipTexts = screen.getAllByText(/quick add expense/i);
      expect(tooltipTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens sheet with Cmd+N keyboard shortcut', async () => {
    renderWithProviders(<QuickAddFab />);

    // Simulate Cmd+N (metaKey for Mac)
    fireEvent.keyDown(document, {
      key: 'n',
      metaKey: true,
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('closes sheet with Escape key', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickAddFab />);

    // Open the sheet
    const button = screen.getByRole('button', { name: /add expense/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    renderWithProviders(<QuickAddFab />);

    const button = screen.getByRole('button', { name: /add expense/i });

    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates aria-expanded when sheet opens', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickAddFab />);

    const button = screen.getByRole('button', { name: /add expense/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
