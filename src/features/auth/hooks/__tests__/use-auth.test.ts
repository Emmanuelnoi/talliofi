import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// Mock the supabase module before importing useAuth
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockListFactors = vi.fn();

const mockSubscription = {
  unsubscribe: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (
        callback: (event: string, session: Session | null) => void,
      ) => {
        mockOnAuthStateChange(callback);
        return {
          data: { subscription: mockSubscription },
        };
      },
      signInWithPassword: (args: { email: string; password: string }) =>
        mockSignInWithPassword(args),
      signUp: (args: { email: string; password: string }) => mockSignUp(args),
      signOut: () => mockSignOut(),
      mfa: {
        listFactors: () => mockListFactors(),
      },
    },
  },
}));

// Import useAuth after mocking
import { useAuth } from '../use-auth';

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

function createMockSession(user: User): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

function createAuthError(message: string): AuthError {
  return {
    message,
    name: 'AuthError',
    status: 400,
  } as AuthError;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no session
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('starts with loading state when supabase is configured', async () => {
      const { result } = renderHook(() => useAuth());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('fetches initial session on mount', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      mockGetSession.mockResolvedValue({ data: { session }, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(user);
      expect(result.current.session).toEqual(session);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it('sets up auth state change listener', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
      expect(typeof mockOnAuthStateChange.mock.calls[0][0]).toBe('function');
    });

    it('unsubscribes on unmount', async () => {
      const { result, unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('updates state when auth state changes', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      let authCallback: (event: string, session: Session | null) => void;

      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: mockSubscription } };
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate auth state change (user signs in)
      act(() => {
        authCallback('SIGNED_IN', session);
      });

      expect(result.current.user).toEqual(user);
      expect(result.current.session).toEqual(session);

      // Simulate sign out
      act(() => {
        authCallback('SIGNED_OUT', null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword with correct credentials', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      mockSignInWithPassword.mockResolvedValue({
        data: { session },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signInResult:
        | Awaited<ReturnType<typeof result.current.signIn>>
        | undefined;
      await act(async () => {
        signInResult = await result.current.signIn(
          'user@example.com',
          'password123',
        );
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(signInResult).toEqual({ status: 'signed_in' });
    });

    it('throws error when sign in fails', async () => {
      const authError = createAuthError('Invalid credentials');
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: authError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signIn('user@example.com', 'wrongpassword');
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('returns MFA required when session is missing', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockListFactors.mockResolvedValue({
        data: {
          totp: [
            {
              id: 'factor-1',
              status: 'verified',
              factorType: 'totp',
            },
          ],
        },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signInResult:
        | Awaited<ReturnType<typeof result.current.signIn>>
        | undefined;
      await act(async () => {
        signInResult = await result.current.signIn(
          'user@example.com',
          'password123',
        );
      });

      expect(signInResult).toEqual({
        status: 'mfa_required',
        factors: [
          {
            id: 'factor-1',
            status: 'verified',
            factorType: 'totp',
          },
        ],
      });
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp with correct credentials', async () => {
      mockSignUp.mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('newuser@example.com', 'newpassword');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'newpassword',
      });
    });

    it('throws error when sign up fails', async () => {
      const authError = createAuthError('Email already registered');
      mockSignUp.mockResolvedValue({ data: null, error: authError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signUp('existing@example.com', 'password');
        }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('throws error when sign out fails', async () => {
      const authError = createAuthError('Network error');
      mockSignOut.mockResolvedValue({ error: authError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signOut();
        }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('return value stability', () => {
    it('returns stable function references', async () => {
      const { result, rerender } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const {
        signIn: signIn1,
        signUp: signUp1,
        signOut: signOut1,
      } = result.current;

      rerender();

      const {
        signIn: signIn2,
        signUp: signUp2,
        signOut: signOut2,
      } = result.current;

      // Functions should be stable across re-renders (using useCallback)
      expect(signIn1).toBe(signIn2);
      expect(signUp1).toBe(signUp2);
      expect(signOut1).toBe(signOut2);
    });
  });
});

describe('useAuth - supabase not configured', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null user and not loading when supabase is unconfigured', async () => {
    // Re-mock with isSupabaseConfigured = false
    vi.doMock('@/lib/supabase', () => ({
      isSupabaseConfigured: false,
      supabase: null,
    }));

    // Dynamic import to get the hook with new mock
    const { useAuth: useAuthUnconfigured } = await import('../use-auth');

    const { result } = renderHook(() => useAuthUnconfigured());

    // Should immediately be not loading with null user
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
