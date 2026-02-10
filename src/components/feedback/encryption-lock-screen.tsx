import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface EncryptionLockScreenProps {
  onUnlock: (password: string) => Promise<void>;
  isBusy: boolean;
  error: string | null;
}

const MAX_ATTEMPTS_BEFORE_LOCKOUT = 3;
const MAX_LOCKOUT_MS = 60_000;

export function EncryptionLockScreen({
  onUnlock,
  isBusy,
  error,
}: EncryptionLockScreenProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const failedAttemptsRef = useRef(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
    };
  }, []);

  const handleUnlock = useCallback(async () => {
    setLocalError(null);
    if (isLockedOut) {
      setLocalError(
        'Too many failed attempts. Please wait before trying again.',
      );
      return;
    }
    if (!password) {
      setLocalError('Enter your passphrase to unlock.');
      return;
    }
    try {
      await onUnlock(password);
      setPassword('');
      failedAttemptsRef.current = 0;
    } catch {
      failedAttemptsRef.current += 1;
      if (failedAttemptsRef.current >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
        const delay = Math.min(
          1000 *
            Math.pow(
              2,
              failedAttemptsRef.current - MAX_ATTEMPTS_BEFORE_LOCKOUT + 1,
            ),
          MAX_LOCKOUT_MS,
        );
        setIsLockedOut(true);
        setLocalError(
          `Too many failed attempts. Try again in ${Math.ceil(delay / 1000)}s.`,
        );
        lockoutTimerRef.current = setTimeout(() => {
          setIsLockedOut(false);
          setLocalError(null);
        }, delay);
      }
    }
  }, [password, onUnlock, isLockedOut]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-5" />
            Vault locked
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Enter your passphrase to unlock local data.
          </p>
          <div className="space-y-2">
            <Label htmlFor="vault-passphrase">Passphrase</Label>
            <Input
              id="vault-passphrase"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          {(localError || error) && (
            <p className="text-destructive text-sm">{localError ?? error}</p>
          )}
          <Button
            onClick={handleUnlock}
            disabled={isBusy || isLockedOut}
            className="w-full"
          >
            Unlock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
