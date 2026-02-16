import { useMemo, useState } from 'react';
import { Database, RotateCcw, Trash2, WandSparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useActivePlan, useAllPlans } from '@/hooks/use-active-plan';
import { queryKeys } from '@/hooks/query-keys';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { planRepo } from '@/data/repos/plan-repo';
import {
  DEMO_PLAN_ID,
  DEMO_PRESETS,
  ensureDemoPlan,
  type DemoPreset,
} from '@/features/demo/lib/ensure-demo-plan';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function DemoToolsSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: activePlan } = useActivePlan();
  const { data: allPlans = [] } = useAllPlans();
  const { scheduleVaultSave } = useLocalEncryption();
  const [preset, setPreset] = useState<DemoPreset>('basic');
  const [isResetting, setIsResetting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const demoPlanExists = useMemo(
    () => allPlans.some((plan) => plan.id === DEMO_PLAN_ID),
    [allPlans],
  );
  const demoActive = activePlan?.id === DEMO_PLAN_ID;

  async function refreshAllQueries() {
    await queryClient.invalidateQueries();
    await queryClient.invalidateQueries({ queryKey: queryKeys.activePlan });
  }

  async function handleResetDemoData() {
    setIsResetting(true);
    try {
      const plan = await ensureDemoPlan({ preset });
      queryClient.setQueryData(queryKeys.activePlan, plan);
      await refreshAllQueries();
      scheduleVaultSave();
      toast.success(`Demo data reset with "${preset}" preset.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to reset demo data. Please try again.';
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  }

  async function handleRemoveDemoPlan() {
    setIsRemoving(true);
    try {
      await planRepo.delete(DEMO_PLAN_ID);
      await refreshAllQueries();
      scheduleVaultSave();
      toast.success('Demo plan removed.');

      const remainingPlans = await planRepo.getAll();
      if (remainingPlans.length === 0) {
        navigate('/onboarding', { replace: true });
      } else if (demoActive) {
        navigate('/plans', { replace: true });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to remove demo plan. Please try again.';
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-5 text-primary" />
          Demo Tools
          {demoActive && <Badge variant="secondary">Demo mode active</Badge>}
        </CardTitle>
        <CardDescription>
          Generate sample data to showcase every section of the app without
          changing your real plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={preset}
            onValueChange={(value) => setPreset(value as DemoPreset)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Demo preset" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_PRESETS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => navigate(`/demo?preset=${preset}`)}
            className="gap-2"
          >
            <WandSparkles className="size-4" />
            Load Demo Data
          </Button>

          <Button
            variant="outline"
            onClick={handleResetDemoData}
            disabled={isResetting}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            {isResetting ? 'Resetting…' : 'Reset Demo Data'}
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Direct URLs: `/demo`, `/demo?preset=heavy`, `/demo?preset=investor`.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={!demoPlanExists || isRemoving}
              className="gap-2"
            >
              <Trash2 className="size-4" />
              {isRemoving ? 'Removing…' : 'Remove Demo Plan'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove demo plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This only deletes the generated demo plan and its demo records.
                Your other plans remain unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemoving}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isRemoving}
                onClick={handleRemoveDemoPlan}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isRemoving ? 'Removing…' : 'Remove demo'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
