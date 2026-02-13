import { useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import env from '@/env';
import { safeGetLocalStorage, safeSetLocalStorage } from '@/lib/safe-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = 'talliofi-browser-hardening-acknowledged';

function getInitialAcknowledgedValue(): boolean {
  return (
    env.VITE_SECURITY_BROWSER_HARDENING_ACKNOWLEDGED ||
    safeGetLocalStorage(STORAGE_KEY) === 'true'
  );
}

export function BrowserSecuritySection() {
  const [acknowledged, setAcknowledged] = useState<boolean>(() =>
    getInitialAcknowledgedValue(),
  );

  const badgeVariant = useMemo(
    () => (acknowledged ? 'secondary' : 'outline'),
    [acknowledged],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          Browser Security
          <Badge variant={badgeVariant}>
            {acknowledged ? 'Acknowledged' : 'Action needed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span
              className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            Use a dedicated browser profile for finance activity only.
          </li>
          <li className="flex items-start gap-2">
            <span
              className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            Disable untrusted browser extensions in that profile.
          </li>
          <li className="flex items-start gap-2">
            <span
              className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            Keep browser and OS auto-update enabled and use full-disk
            encryption.
          </li>
        </ul>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="browser-security-ack">
              I am using a hardened browser profile
            </Label>
            <p className="text-xs text-muted-foreground">
              This setting is stored locally on this device only.
            </p>
          </div>
          <Switch
            id="browser-security-ack"
            checked={acknowledged}
            onCheckedChange={(checked) => {
              setAcknowledged(checked);
              safeSetLocalStorage(STORAGE_KEY, checked ? 'true' : 'false');
            }}
            aria-label="Acknowledge browser hardening checklist"
          />
        </div>
      </CardContent>
    </Card>
  );
}
