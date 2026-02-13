import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { extractFactors, type MfaFactor } from '@/lib/mfa-utils';
import { mapSupabaseAuthError } from '@/lib/auth-errors';

interface AssuranceLevelData {
  currentLevel: string;
  nextLevel: string;
  currentAuthenticationMethods?: string[];
}

interface EnrollmentState {
  factorId: string;
  qrCode?: string;
  secret?: string;
}

const SAFE_QR_PREFIXES = [
  'data:image/png;base64,',
  'data:image/svg+xml;base64,',
] as const;

function resolveQrSrc(qrCode?: string): string | null {
  if (!qrCode) return null;
  const trimmed = qrCode.trim();
  if (SAFE_QR_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return trimmed;
  }
  return null;
}

export function MfaSection() {
  if (!isSupabaseConfigured) return null;

  return <MfaSectionContent />;
}

function MfaSectionContent() {
  const { user } = useAuth();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [assuranceLevel, setAssuranceLevel] =
    useState<AssuranceLevelData | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const verifiedFactor = useMemo(
    () => factors.find((factor) => factor.status === 'verified') ?? null,
    [factors],
  );
  const hasEnabledMfa = Boolean(verifiedFactor);

  const loadMfaState = useCallback(async () => {
    if (!supabase || !user) return;

    setIsLoading(true);
    try {
      const [factorResult, assuranceResult] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (factorResult.error) {
        throw new Error(
          mapSupabaseAuthError(
            factorResult.error,
            'Failed to load two-factor authentication status.',
          ),
        );
      }
      if (assuranceResult.error) {
        throw new Error(
          mapSupabaseAuthError(
            assuranceResult.error,
            'Failed to load two-factor authentication status.',
          ),
        );
      }

      setFactors(extractFactors(factorResult.data));
      setAssuranceLevel(assuranceResult.data as AssuranceLevelData);
    } catch (error) {
      const message = mapSupabaseAuthError(
        error,
        'Failed to load two-factor authentication status.',
      );
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadMfaState();
  }, [user, loadMfaState]);

  const handleStartEnrollment = useCallback(async () => {
    if (!supabase || !user) return;

    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        throw new Error(
          mapSupabaseAuthError(error, 'Failed to start two-factor setup.'),
        );
      }
      if (!data?.id) {
        throw new Error('Unable to start MFA enrollment.');
      }

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp?.qr_code,
        secret: data.totp?.secret,
      });
      setCode('');
    } catch (error) {
      const message = mapSupabaseAuthError(
        error,
        'Failed to start two-factor setup.',
      );
      toast.error(message);
    } finally {
      setIsEnrolling(false);
    }
  }, [user]);

  const handleVerify = useCallback(async () => {
    if (!supabase || !enrollment) return;

    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      toast.error('Enter a valid 6-digit code from your authenticator app.');
      return;
    }

    setIsVerifying(true);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: enrollment.factorId,
        });

      if (challengeError) {
        throw new Error(
          mapSupabaseAuthError(
            challengeError,
            'Unable to verify your authentication code.',
          ),
        );
      }
      if (!challenge?.id) {
        throw new Error('Unable to verify MFA challenge.');
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
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

      toast.success('Two-factor authentication enabled.');
      setEnrollment(null);
      setCode('');
      await loadMfaState();
    } catch (error) {
      const message = mapSupabaseAuthError(
        error,
        'Verification failed. Please try again.',
      );
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  }, [code, enrollment, loadMfaState]);

  const handleDisable = useCallback(async () => {
    if (!supabase || !verifiedFactor) return;

    setIsDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (error) {
        throw new Error(
          mapSupabaseAuthError(
            error,
            'Failed to disable two-factor authentication.',
          ),
        );
      }

      toast.success('Two-factor authentication disabled.');
      setEnrollment(null);
      setCode('');
      await loadMfaState();
    } catch (error) {
      const message = mapSupabaseAuthError(
        error,
        'Failed to disable two-factor authentication.',
      );
      toast.error(message);
    } finally {
      setIsDisabling(false);
    }
  }, [verifiedFactor, loadMfaState]);

  const qrSrc = resolveQrSrc(enrollment?.qrCode);
  const isCodeValid = /^\d{6}$/.test(code.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add a second verification step to protect your cloud account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!user && (
          <p className="text-sm text-muted-foreground">
            Sign in to manage two-factor authentication.
          </p>
        )}

        {user && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">
                  {hasEnabledMfa
                    ? 'An authenticator app is required at sign-in.'
                    : 'Two-factor authentication is not enabled.'}
                </p>
              </div>
              <Badge variant={hasEnabledMfa ? 'secondary' : 'outline'}>
                {hasEnabledMfa ? 'Enabled' : 'Not enabled'}
              </Badge>
            </div>

            {assuranceLevel && (
              <div className="text-xs text-muted-foreground">
                Current assurance level:{' '}
                <span className="font-medium text-foreground">
                  {assuranceLevel.currentLevel.toUpperCase()}
                </span>
                {assuranceLevel.nextLevel && (
                  <> (Next: {assuranceLevel.nextLevel.toUpperCase()})</>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={hasEnabledMfa ? 'outline' : 'default'}
                onClick={handleStartEnrollment}
                disabled={isEnrolling || hasEnabledMfa}
              >
                {isEnrolling ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Set up authenticator app
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadMfaState}
                disabled={isLoading}
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDisable}
                disabled={!hasEnabledMfa || isDisabling}
              >
                {isDisabling ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : (
                  <ShieldAlert className="size-4" />
                )}
                Disable 2FA
              </Button>
            </div>

            {enrollment && (
              <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium">Scan QR code</p>
                  <p className="text-xs text-muted-foreground">
                    Use an authenticator app like 1Password, Authy, or Google
                    Authenticator.
                  </p>
                </div>
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="Authenticator app QR code"
                    className="max-w-[180px]"
                  />
                ) : (
                  <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                    QR code unavailable. Enter the secret manually.
                  </div>
                )}
                {enrollment.secret && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Manual entry secret
                    </Label>
                    <div className="rounded-md border bg-background px-3 py-2 font-mono text-sm">
                      {enrollment.secret}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="mfa-code">Verification code</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="mfa-code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="123456"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="w-40"
                    />
                    <Button
                      onClick={handleVerify}
                      disabled={isVerifying || !isCodeValid}
                    >
                      {isVerifying && (
                        <Loader2 className="size-4 motion-safe:animate-spin" />
                      )}
                      Verify
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEnrollment(null);
                        setCode('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
