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
import { supabase } from '@/lib/supabase';
import type { MfaFactor } from '@/lib/mfa-utils';
import { useAuth } from '../hooks/use-auth';

type AuthMode = 'login' | 'signup';

/**
 * Simple client-side rate limiter for auth attempts.
 * Tracks timestamps of recent attempts and enforces a limit.
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
      if (challengeError) throw new Error(challengeError.message);
      if (!challenge?.id) throw new Error('Unable to verify MFA challenge.');

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: trimmedCode,
      });
      if (verifyError) throw new Error(verifyError.message);

      toast.success('Signed in successfully.');
      setMfaFactorId(null);
      setMfaCode('');
    } catch (error) {
      rateLimiter.recordAttempt();
      const message =
        error instanceof Error ? error.message : 'Verification failed.';
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

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isMfaStep && (
            <>
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
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
                placeholder="123456"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
              />
            </div>
          )}
          {rateLimitError && (
            <p className="text-destructive text-sm" role="alert">
              {rateLimitError}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isMfaVerifying}
          >
            {(isSubmitting || isMfaVerifying) && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {isMfaStep ? 'Verify Code' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
          {!isMfaStep && (
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setMode(isLogin ? 'signup' : 'login')}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
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
              Back to sign in
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
