import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/query-keys';
import { ensureDemoPlan, normalizeDemoPreset } from '../lib/ensure-demo-plan';

export default function DemoEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const searchParams = new URLSearchParams(location.search);
    const preset = normalizeDemoPreset(searchParams.get('preset'));

    async function bootstrapDemo() {
      setError(null);
      setIsLoading(true);
      try {
        const plan = await ensureDemoPlan({ preset });
        if (isCancelled) return;
        queryClient.setQueryData(queryKeys.activePlan, plan);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.activePlan,
        });
        navigate('/', { replace: true });
      } catch (err) {
        if (isCancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to prepare demo data. Please try again.';
        setError(message);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapDemo();

    return () => {
      isCancelled = true;
    };
  }, [location.search, navigate, queryClient]);

  if (isLoading) {
    return (
      <main
        className="flex min-h-svh items-center justify-center gap-3"
        role="status"
        aria-label="Preparing demo environment"
      >
        <Loader2 className="text-muted-foreground size-6 motion-safe:animate-spin" />
        <p className="text-muted-foreground text-sm">Preparing demo data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border p-5">
          <p className="text-sm font-semibold">Demo setup failed</p>
          <p className="text-muted-foreground mt-2 text-sm">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => navigate('/demo', { replace: true })}>
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/', { replace: true })}
            >
              Go to app
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
