import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, null, children);
}

function fireKey(key: string, options: KeyboardEventInit = {}) {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...options }),
  );
}

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('returns isShortcutsDialogOpen as false initially', () => {
    const { result } = renderHook(() => useGlobalShortcuts(), { wrapper });
    expect(result.current.isShortcutsDialogOpen).toBe(false);
  });

  it('opens shortcuts dialog when ? is pressed', () => {
    const { result } = renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      fireKey('?');
    });

    expect(result.current.isShortcutsDialogOpen).toBe(true);
  });

  it('closes shortcuts dialog via setShortcutsDialogOpen(false)', () => {
    const { result } = renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      fireKey('?');
    });
    expect(result.current.isShortcutsDialogOpen).toBe(true);

    act(() => {
      result.current.setShortcutsDialogOpen(false);
    });
    expect(result.current.isShortcutsDialogOpen).toBe(false);
  });

  it('navigates to /dashboard on Meta+D', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      fireKey('d', { metaKey: true });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to /expenses on Meta+E', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      fireKey('e', { metaKey: true });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/expenses');
  });

  it('dispatches app:save custom event on Meta+S', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper });

    const handler = vi.fn();
    document.addEventListener('app:save', handler);

    act(() => {
      fireKey('s', { metaKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener('app:save', handler);
  });

  it('dispatches app:focus-search custom event on Meta+F', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper });

    const handler = vi.fn();
    document.addEventListener('app:focus-search', handler);

    act(() => {
      fireKey('f', { metaKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener('app:focus-search', handler);
  });
});
