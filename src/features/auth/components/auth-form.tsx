import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AUTH_MAX_ATTEMPTS, AUTH_RATE_LIMIT_WINDOW_MS } from '@/lib/constants';
import {
  getMissingServerAuthControls,
  shouldBlockCloudAuthInCurrentBuild,
} from '@/lib/security-controls';
import { mapSupabaseAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import type { MfaFactor } from '@/lib/mfa-utils';
import { useAuth } from '../hooks/use-auth';

type AuthMode = 'login' | 'signup';

/**
 * Simple client-side rate limiter for auth attempts.
 * Tracks timestamps of recent attempts and enforces a limit.
 * This improves UX but must be paired with server-side limits.
 */
function useRateLimiter(maxAttempts: number, windowMs: number) {
  const attemptsRef = useRef<number[]>([]);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    // Remove attempts outside the window
    attemptsRef.current = attemptsRef.current.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    return attemptsRef.current.length < maxAttempts;
  }, [maxAttempts, windowMs]);

  const recordAttempt = useCallback(() => {
    attemptsRef.current.push(Date.now());
  }, []);

  const getTimeUntilReset = useCallback((): number => {
    if (attemptsRef.current.length === 0) return 0;
    const oldestAttempt = attemptsRef.current[0];
    const timeUntilReset = windowMs - (Date.now() - oldestAttempt);
    return Math.max(0, Math.ceil(timeUntilReset / 1000));
  }, [windowMs]);

  const getRemainingAttempts = useCallback((): number => {
    const now = Date.now();
    const recentAttempts = attemptsRef.current.filter(
      (timestamp) => now - timestamp < windowMs,
    );
    return Math.max(0, maxAttempts - recentAttempts.length);
  }, [maxAttempts, windowMs]);

  return {
    checkRateLimit,
    recordAttempt,
    getTimeUntilReset,
    getRemainingAttempts,
  };
}

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const shouldBlockCloudAuth = shouldBlockCloudAuthInCurrentBuild();
  const missingServerControls = getMissingServerAuthControls();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isMfaVerifying, setIsMfaVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const rateLimiter = useRateLimiter(
    AUTH_MAX_ATTEMPTS,
    AUTH_RATE_LIMIT_WINDOW_MS,
  );

  const handleCancelMfa = useCallback(() => {
    setMfaFactorId(null);
    setMfaCode('');
  }, []);

  function selectPreferredFactor(factors: MfaFactor[]): MfaFactor | null {
    const verifiedTotp = factors.find(
      (factor) =>
        factor.status === 'verified' &&
        (factor.factorType === 'totp' || factor.type === 'totp'),
    );
    return verifiedTotp ?? factors[0] ?? null;
  }

  async function handleVerifyMfa() {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (!mfaFactorId) return;

    const trimmedCode = mfaCode.trim();
    if (!trimmedCode) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setIsMfaVerifying(true);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: mfaFactorId,
        });
      if (challengeError) {
        throw new Error(
          mapSupabaseAuthError(
            challengeError,
            'Unable to verify your authentication code.',
          ),
        );
      }
      if (!challenge?.id) throw new Error('Unable to verify MFA challenge.');

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: trimmedCode,
      });
      if (verifyError) {
        throw new Error(
          mapSupabaseAuthError(
            verifyError,
            'Unable to verify your authentication code.',
          ),
        );
      }

      toast.success('Signed in successfully.');
      setMfaFactorId(null);
      setMfaCode('');
    } catch (error) {
      rateLimiter.recordAttempt();
      const message = mapSupabaseAuthError(
        error,
        'Verification failed. Please try again.',
      );
      toast.error(message);
    } finally {
      setIsMfaVerifying(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (mode === 'login' && mfaFactorId) {
      await handleVerifyMfa();
      return;
    }

    // Check rate limit before attempting auth
    if (!rateLimiter.checkRateLimit()) {
      const secondsUntilReset = rateLimiter.getTimeUntilReset();
      const message = `Too many attempts. Please wait ${secondsUntilReset} seconds before trying again.`;
      setRateLimitError(message);
      toast.error(message);
      return;
    }

    setRateLimitError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.status === 'mfa_required') {
          const factor = selectPreferredFactor(result.factors ?? []);
          if (!factor) {
            throw new Error('Multi-factor authentication required.');
          }
          setMfaFactorId(factor.id);
          toast.info('Enter the code from your authenticator app.');
          return;
        }
        toast.success('Signed in successfully.');
      } else {
        await signUp(email, password);
        toast.success('Account created. Check your email to confirm.');
      }
    } catch (error) {
      // Record failed attempt for rate limiting
      rateLimiter.recordAttempt();

      const message =
        error instanceof Error ? error.message : 'Authentication failed.';
      toast.error(message);

      // Show remaining attempts warning after failure
      const remaining = rateLimiter.getRemainingAttempts();
      if (remaining > 0 && remaining <= 2) {
        toast.warning(
          `${remaining} attempt${remaining === 1 ? '' : 's'} remaining before rate limit.`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  const isMfaStep = isLogin && mfaFactorId !== null;

  if (shouldBlockCloudAuth) {
    return (
      <Card className="mx-auto w-full max-w-sm border-destructive/40">
        <CardHeader>
          <p className="text-destructive text-[11px] font-semibold uppercase tracking-[0.2em]">
            Security Block
          </p>
          <CardTitle>Cloud auth is disabled in this build</CardTitle>
          <CardDescription>
            Production cloud sign-in is blocked until required server-side
            controls are configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Missing controls:</p>
          <ul className="space-y-1 text-muted-foreground">
            {missingServerControls.map((control) => (
              <li key={control} className="flex items-start gap-2">
                <span
                  className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-destructive"
                  aria-hidden="true"
                />
                {control}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
          {isMfaStep ? 'Security' : 'Cloud Sync'}
        </p>
        <CardTitle>
          {isMfaStep
            ? 'Two-Factor Verification'
            : isLogin
              ? 'Sign In'
              : 'Create Account'}
        </CardTitle>
        <CardDescription>
          {isMfaStep
            ? 'Enter the code from your authenticator app.'
            : isLogin
              ? 'Sign in to sync your data across devices.'
              : 'Create an account to enable cloud sync.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isMfaStep && (
            <>
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com…"
                  required
                  autoComplete="email"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password…"
                  required
                  minLength={6}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                )}
              </div>
            </>
          )}
          {isMfaStep && (
            <div className="space-y-2">
              <Label htmlFor="auth-mfa-code">Verification code</Label>
              <Input
                id="auth-mfa-code"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456…"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                spellCheck={false}
              />
            </div>
          )}
          {rateLimitError && (
            <p className="text-destructive text-xs" role="alert">
              {rateLimitError}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isMfaVerifying}
          >
            {(isSubmitting || isMfaVerifying) && (
              <Loader2
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            )}
            {isMfaStep ? 'Verify Code' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
          {!isMfaStep && (
            <p className="text-center text-xs text-muted-foreground">
              {isLogin ? 'Do not have an account?' : 'Already have an account?'}{' '}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setMode(isLogin ? 'signup' : 'login')}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          )}
          {isMfaStep && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleCancelMfa}
            >
              Back to Sign In
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
