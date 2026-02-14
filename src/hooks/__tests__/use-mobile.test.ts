import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

function createMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '(max-width: 767px)',
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
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: nextMatches ? 500 : 1024,
      });
      for (const cb of listeners) {
        cb({ matches: nextMatches } as MediaQueryListEvent);
      }
    },
  };
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;
  let mediaHelper: ReturnType<typeof createMatchMedia>;

  beforeEach(() => {
    mediaHelper = createMatchMedia(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaHelper.mql);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('returns false for desktop width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      mediaHelper.trigger(true);
    });

    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(mediaHelper.mql.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
