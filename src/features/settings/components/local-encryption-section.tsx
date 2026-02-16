import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { logger } from '@/lib/logger';
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
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { PasswordStrengthIndicator } from './password-strength-indicator';

const MIN_PASSWORD_LENGTH = 8;

export function LocalEncryptionSection() {
  const {
    enabled,
    isLocked,
    isBusy,
    error,
    enableEncryption,
    unlock,
    lock,
    disableEncryption,
  } = useLocalEncryption();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [storageMB, setStorageMB] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStorageMB(null); // eslint-disable-line react-hooks/set-state-in-effect -- reset on disable
      return;
    }
    navigator.storage
      ?.estimate()
      .then((estimate) => {
        if (estimate.usage) {
          setStorageMB(Math.round(estimate.usage / (1024 * 1024)));
        }
      })
      .catch(() => {
        // Storage API not available
      });
  }, [enabled]);

  async function handleEnable() {
    setFormError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      await enableEncryption(password);
      toast.success('Local encryption enabled.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      logger.error('encryption', err);
    }
  }

  async function handleUnlock() {
    setFormError(null);
    if (!unlockPassword) {
      setFormError('Enter your password to unlock.');
      return;
    }
    try {
      await unlock(unlockPassword);
      toast.success('Vault unlocked.');
      setUnlockPassword('');
    } catch (err) {
      logger.error('encryption', err);
    }
  }

  async function handleLock() {
    try {
      await lock();
      toast.success('Vault locked.');
    } catch (err) {
      logger.error('encryption', err);
    }
  }

  async function handleDisable() {
    try {
      await disableEncryption();
      toast.success('Local encryption disabled.');
    } catch (err) {
      logger.error('encryption', err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-5" />
          Local Encryption
        </CardTitle>
        <CardDescription>
          Protect data stored on this device with a local encryption passphrase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled && (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              If you forget your passphrase, your encrypted data cannot be
              recovered.
            </div>
            <div className="space-y-2">
              <Label htmlFor="encryption-password">Passphrase</Label>
              <Input
                id="encryption-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <PasswordStrengthIndicator password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="encryption-confirm">Confirm passphrase</Label>
              <Input
                id="encryption-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            {(formError || error) && (
              <p className="text-destructive text-sm">{formError ?? error}</p>
            )}
            <Button onClick={handleEnable} disabled={isBusy}>
              <ShieldCheck className="size-4" />
              Enable encryption
            </Button>
          </div>
        )}

        {enabled && isLocked && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <ShieldAlert className="size-4" />
              Vault locked. Enter your passphrase to unlock.
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlock-password">Passphrase</Label>
              <Input
                id="unlock-password"
                type="password"
                value={unlockPassword}
                onChange={(event) => setUnlockPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            {(formError || error) && (
              <p className="text-destructive text-sm">{formError ?? error}</p>
            )}
            <Button onClick={handleUnlock} disabled={isBusy}>
              Unlock vault
            </Button>
          </div>
        )}

        {enabled && !isLocked && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              <ShieldCheck className="size-4" />
              Vault unlocked. Data is encrypted when you lock the vault.
            </div>
            {storageMB !== null && storageMB > 50 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Your local data is using approximately {storageMB}MB. Large
                vaults may take longer to encrypt/decrypt. Consider exporting
                and clearing old data periodically.
              </div>
            )}
            {(error || formError) && (
              <p className="text-destructive text-sm">{formError ?? error}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleLock} disabled={isBusy}>
                Lock vault
              </Button>
              <Button variant="ghost" onClick={handleDisable} disabled={isBusy}>
                Disable encryption
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
