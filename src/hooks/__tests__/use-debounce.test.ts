import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    );

    rerender({ value: 'updated' });

    // Advance time by less than the delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');
  });

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    );

    // First update
    rerender({ value: 'first' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Second update before delay completes
    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Still should be initial since timer was reset
    expect(result.current).toBe('initial');

    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('second');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('works with different types', () => {
    // Number
    const { result: numResult } = renderHook(() => useDebounce(42, 100));
    expect(numResult.current).toBe(42);

    // Object
    const obj = { a: 1 };
    const { result: objResult } = renderHook(() => useDebounce(obj, 100));
    expect(objResult.current).toBe(obj);

    // Null
    const { result: nullResult } = renderHook(() => useDebounce(null, 100));
    expect(nullResult.current).toBe(null);
  });

  it('cleans up timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    );

    rerender({ value: 'updated' });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
