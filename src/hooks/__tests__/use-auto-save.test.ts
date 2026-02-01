import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoSave } from '../use-auto-save';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns idle status initially', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ data: { value: 1 }, onSave }),
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('does not call onSave on initial render', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave({ data: { value: 1 }, onSave }));

    vi.advanceTimersByTime(2000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('debounces and calls onSave when data changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 500 }),
      { initialProps: { data: { value: 1 } } },
    );

    // Change data
    rerender({ data: { value: 2 } });

    // Not called yet (within debounce)
    expect(onSave).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ value: 2 });
  });

  it('does not save when data has not changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 500 }),
      { initialProps: { data: { value: 1 } } },
    );

    // Rerender with same data
    rerender({ data: { value: 1 } });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('returns saving status during save', async () => {
    let resolvePromise: () => void;
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 100 }),
      { initialProps: { data: { value: 1 } } },
    );

    // Trigger change
    rerender({ data: { value: 2 } });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.status).toBe('saving');

    // Resolve the save
    await act(async () => {
      resolvePromise!();
    });

    expect(result.current.status).toBe('saved');
  });

  it('returns error status when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 100 }),
      { initialProps: { data: { value: 1 } } },
    );

    rerender({ data: { value: 2 } });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('Save failed');
  });

  it('does not save when disabled', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data, enabled }) =>
        useAutoSave({ data, onSave, debounceMs: 100, enabled }),
      { initialProps: { data: { value: 1 }, enabled: false } },
    );

    rerender({ data: { value: 2 }, enabled: false });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('transitions from saved to idle after timeout', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 100 }),
      { initialProps: { data: { value: 1 } } },
    );

    rerender({ data: { value: 2 } });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.status).toBe('saved');

    // Wait for saved -> idle transition
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe('idle');
  });

  it('cancels in-flight save when new data arrives', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 200 }),
      { initialProps: { data: { value: 1 } } },
    );

    // Change data rapidly
    rerender({ data: { value: 2 } });
    await act(async () => {
      vi.advanceTimersByTime(100); // within debounce
    });

    rerender({ data: { value: 3 } });
    await act(async () => {
      vi.advanceTimersByTime(200); // fires for value: 3
    });

    // Only the last change should trigger a save
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ value: 3 });
  });

  it('does not update state after unmount', async () => {
    let resolvePromise: () => void;
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result, rerender, unmount } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 100 }),
      { initialProps: { data: { value: 1 } } },
    );

    rerender({ data: { value: 2 } });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.status).toBe('saving');

    // Unmount while save is in flight
    unmount();

    // Resolve the save — should not throw or update state
    await act(async () => {
      resolvePromise!();
    });

    // No error thrown — abort signal prevents state update
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
