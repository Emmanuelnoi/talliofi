import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSignOut = vi.fn().mockResolvedValue({});
const mockToast = { info: vi.fn(), warning: vi.fn() };
const mockUseAuth = vi.fn().mockReturnValue({ user: null });
const mockUseSyncStore = vi.fn().mockReturnValue('local');

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { signOut: mockSignOut } },
}));

vi.mock('@/lib/constants', () => ({
  SESSION_TIMEOUT_MS: 1000,
  SESSION_WARNING_MS: 500,
}));

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/stores/sync-store', () => ({
  useSyncStore: mockUseSyncStore,
}));

describe('useSessionTimeout', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSignOut.mockClear();
    mockToast.info.mockClear();
    mockToast.warning.mockClear();
    mockUseAuth.mockReturnValue({ user: null });
    mockUseSyncStore.mockReturnValue('local');
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.useRealTimers();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  async function importHook() {
    const mod = await import('../use-session-timeout');
    return mod.useSessionTimeout;
  }

  it('does not set timers when storageMode is local', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' } });
    mockUseSyncStore.mockReturnValue('local');

    const useSessionTimeout = await importHook();
    renderHook(() => useSessionTimeout());

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('does not set timers when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockUseSyncStore.mockReturnValue('cloud');

    const useSessionTimeout = await importHook();
    renderHook(() => useSessionTimeout());

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('sets timers when cloud mode and user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' } });
    mockUseSyncStore.mockReturnValue('cloud');

    const useSessionTimeout = await importHook();
    renderHook(() => useSessionTimeout());

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];
    for (const event of activityEvents) {
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        event,
        expect.any(Function),
        { passive: true },
      );
    }
  });

  it('shows warning toast after SESSION_WARNING_MS', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' } });
    mockUseSyncStore.mockReturnValue('cloud');

    const useSessionTimeout = await importHook();
    renderHook(() => useSessionTimeout());

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockToast.warning).toHaveBeenCalledWith(
      'Session expiring in 1 minute due to inactivity\u2026',
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('calls signOut after SESSION_TIMEOUT_MS', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' } });
    mockUseSyncStore.mockReturnValue('cloud');

    const useSessionTimeout = await importHook();
    renderHook(() => useSessionTimeout());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // signOut is called inside an async callback; flush the microtask queue
    await vi.waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('resets timers on user activity (mousemove event)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' } });
    mockUseSyncStore.mockReturnValue('cloud');

    const useSessionTimeout = await importHook();
    renderHook(() => useSessionTimeout());

    // Advance to just before warning fires
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockToast.warning).not.toHaveBeenCalled();

    // Simulate user activity to reset timers
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });

    // Advance another 400ms from the reset point -- warning should NOT fire
    // because the timer was reset at t=400, so warning would fire at t=900
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockToast.warning).not.toHaveBeenCalled();

    // Advance the remaining 100ms to reach 500ms after the reset
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockToast.warning).toHaveBeenCalledTimes(1);
  });

  it('cleans up event listeners on unmount', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' } });
    mockUseSyncStore.mockReturnValue('cloud');

    const useSessionTimeout = await importHook();
    const { unmount } = renderHook(() => useSessionTimeout());

    unmount();

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];
    for (const event of activityEvents) {
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        event,
        expect.any(Function),
      );
    }
  });
});
