import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockProceed = vi.fn();
const mockReset = vi.fn();
let mockBlockerState = 'idle';

vi.mock('react-router', () => ({
  useBlocker: vi.fn(() => ({
    state: mockBlockerState,
    proceed: mockProceed,
    reset: mockReset,
  })),
}));

import { useUnsavedChanges } from '../use-unsaved-changes';

describe('useUnsavedChanges', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockBlockerState = 'idle';
    mockProceed.mockClear();
    mockReset.mockClear();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('does not add beforeunload listener when isDirty is false', () => {
    renderHook(() => useUnsavedChanges({ isDirty: false }));

    const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(beforeUnloadCalls).toHaveLength(0);
  });

  it('adds beforeunload listener when isDirty is true', () => {
    renderHook(() => useUnsavedChanges({ isDirty: true }));

    const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(beforeUnloadCalls).toHaveLength(1);
  });

  it('removes beforeunload listener when isDirty changes to false', () => {
    const { rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => useUnsavedChanges({ isDirty }),
      { initialProps: { isDirty: true } },
    );

    rerender({ isDirty: false });

    const removeBeforeUnloadCalls = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(removeBeforeUnloadCalls).toHaveLength(1);
  });

  it('confirmNavigation calls blocker.proceed when state is blocked', () => {
    mockBlockerState = 'blocked';

    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    act(() => {
      result.current.confirmNavigation();
    });

    expect(mockProceed).toHaveBeenCalledOnce();
  });

  it('confirmNavigation does nothing when state is idle', () => {
    mockBlockerState = 'idle';

    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    act(() => {
      result.current.confirmNavigation();
    });

    expect(mockProceed).not.toHaveBeenCalled();
  });

  it('cancelNavigation calls blocker.reset when state is blocked', () => {
    mockBlockerState = 'blocked';

    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    act(() => {
      result.current.cancelNavigation();
    });

    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('cancelNavigation does nothing when state is idle', () => {
    mockBlockerState = 'idle';

    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    act(() => {
      result.current.cancelNavigation();
    });

    expect(mockReset).not.toHaveBeenCalled();
  });
});
