import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { useActivePlan } from '../use-active-plan';
import { planRepo } from '@/data/repos/plan-repo';
import { cents } from '@/domain/money';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
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

describe('useActivePlan', () => {
  it('returns null when no plan exists', async () => {
    const { result } = renderHook(() => useActivePlan(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('returns the active plan when one exists', async () => {
    const mockPlan = {
      id: crypto.randomUUID(),
      name: 'Test Plan',
      grossIncomeCents: cents(500000),
      incomeFrequency: 'monthly' as const,
      taxMode: 'simple' as const,
      taxEffectiveRate: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
    };

    await planRepo.create(mockPlan);

    const { result } = renderHook(() => useActivePlan(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.name).toBe('Test Plan');
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useActivePlan(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('handles errors from the repo', async () => {
    const spy = vi
      .spyOn(planRepo, 'getActive')
      .mockRejectedValueOnce(new Error('DB error'));

    const { result } = renderHook(() => useActivePlan(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('DB error');

    spy.mockRestore();
  });
});
