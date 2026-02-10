import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { planRepo } from '@/data/repos/plan-repo';
import { cents } from '@/domain/money';
import SettingsPage from '../pages/settings-page';

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
      createElement(MemoryRouter, null, children),
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

describe('SettingsPage', () => {
  it('renders all sections', async () => {
    await seedPlan();
    render(createElement(SettingsPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Currency & Exchange Rates')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('Import Data')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('renders theme toggle buttons', async () => {
    render(createElement(SettingsPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument();
    });
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('theme toggle changes the theme', async () => {
    const user = userEvent.setup();
    render(createElement(SettingsPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Dark'));

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await user.click(screen.getByText('Light'));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('export button is rendered', async () => {
    await seedPlan();
    render(createElement(SettingsPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByLabelText('Download financial data as JSON'),
      ).toBeInTheDocument();
    });
  });

  it('clear data button shows confirmation dialog', async () => {
    const user = userEvent.setup();
    render(createElement(SettingsPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Delete All Data')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Delete All Data'));

    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'This will permanently delete all your plans, expenses, buckets, and history. This action cannot be undone.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete Everything')).toBeInTheDocument();
  });

  it('privacy section displays correct information', async () => {
    render(createElement(SettingsPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText('All data is stored locally on your device.'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('No tracking, analytics, or third-party scripts.'),
    ).toBeInTheDocument();

    expect(screen.getByText(/You control your data/)).toBeInTheDocument();
  });

  it('renders import file input', async () => {
    render(createElement(SettingsPage), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByLabelText('Select JSON file to import'),
      ).toBeInTheDocument();
    });
  });
});
