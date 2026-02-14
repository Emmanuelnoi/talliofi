import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../use-reduced-motion';

function createMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(
      (_event: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb);
      },
    ),
    removeEventListener: vi.fn(
      (_event: string, cb: (e: MediaQueryListEvent) => void) => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      },
    ),
  } as unknown as MediaQueryList;

  return {
    mql,
    listeners,
    trigger(nextMatches: boolean) {
      for (const cb of listeners) {
        cb({ matches: nextMatches } as MediaQueryListEvent);
      }
    },
  };
}

describe('useReducedMotion', () => {
  let mediaHelper: ReturnType<typeof createMatchMedia>;

  beforeEach(() => {
    mediaHelper = createMatchMedia(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaHelper.mql);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when no motion preference', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when reduced motion is preferred', () => {
    mediaHelper = createMatchMedia(true);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaHelper.mql);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when preference changes', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mediaHelper.trigger(true);
    });

    expect(result.current).toBe(true);
  });

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    unmount();
    expect(mediaHelper.mql.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
