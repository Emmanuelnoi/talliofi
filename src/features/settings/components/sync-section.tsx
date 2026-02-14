import { useState } from 'react';
import { Cloud, HardDrive, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import {
  getMissingServerAuthControls,
  shouldBlockCloudAuthInCurrentBuild,
} from '@/lib/security-controls';
import { useSyncStore } from '@/stores/sync-store';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AuthForm } from '@/features/auth/components/auth-form';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Up to date',
  syncing: 'Syncing…',
  error: 'Sync error',
  offline: 'Offline',
};

const STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  idle: 'secondary',
  syncing: 'default',
  error: 'destructive',
  offline: 'outline',
};

/**
 * Only renders when Supabase env vars are configured.
 * Allows the user to switch between local-only and cloud sync modes,
 * manage authentication, and manually trigger a sync.
 */
export function SyncSection() {
  if (!isSupabaseConfigured) return null;

  return <SyncSectionContent />;
}

function SyncSectionContent() {
  const { user, isLoading: isAuthLoading, signOut } = useAuth();
  const { storageMode, setStorageMode, syncStatus, lastSyncedAt } =
    useSyncStore();
  const shouldBlockCloudAuth = shouldBlockCloudAuthInCurrentBuild();
  const missingServerControls = getMissingServerAuthControls();
  const [isSyncing, setIsSyncing] = useState(false);

  const isCloud = storageMode === 'cloud';

  async function handleManualSync() {
    setIsSyncing(true);
    try {
      // In a full implementation, this would call syncEngine.triggerSync()
      toast.info('Sync triggered.');
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setStorageMode('local');
      toast.success('Signed out.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sign out failed.';
      toast.error(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="size-5" />
          Cloud Sync
        </CardTitle>
        <CardDescription>
          Securely sync your data across devices. Sign in to enable cloud
          storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage mode selector */}
        <div className="flex gap-2" role="radiogroup" aria-label="Storage mode">
          <Button
            variant={!isCloud ? 'default' : 'outline'}
            size="sm"
            role="radio"
            aria-checked={!isCloud}
            onClick={() => setStorageMode('local')}
          >
            <HardDrive className="size-4" />
            Local Only
          </Button>
          <Button
            variant={isCloud ? 'default' : 'outline'}
            size="sm"
            role="radio"
            aria-checked={isCloud}
            onClick={() => {
              if (shouldBlockCloudAuth) {
                toast.error(
                  'Cloud Sync is disabled in production until server-side auth controls are configured.',
                );
                return;
              }
              setStorageMode('cloud');
            }}
            disabled={shouldBlockCloudAuth}
          >
            <Cloud className="size-4" />
            Cloud Sync
          </Button>
        </div>

        {shouldBlockCloudAuth && (
          <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">
              Cloud Sync is blocked in this production build
            </p>
            <p className="text-muted-foreground">
              Configure these server-side controls, then set the matching
              security env vars before enabling cloud authentication:
            </p>
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
          </div>
        )}

        {/* Auth UI when cloud is selected */}
        {isCloud && !isAuthLoading && !user && (
          <div className="pt-2">
            <AuthForm />
          </div>
        )}

        {/* Sync status when authenticated and cloud mode */}
        {isCloud && user && (
          <div className="space-y-3 rounded-md border bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={STATUS_VARIANTS[syncStatus] ?? 'secondary'}>
                {STATUS_LABELS[syncStatus] ?? syncStatus}
              </Badge>
            </div>

            {lastSyncedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last synced</span>
                <span>{new Date(lastSyncedAt).toLocaleString()}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="truncate pl-2">{user.email}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                disabled={isSyncing || syncStatus === 'syncing'}
              >
                {isSyncing ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sync Now
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
