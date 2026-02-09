import { Loader2 } from 'lucide-react';
import type { Plan } from '@/domain/plan/types';
import { useActivePlan, useSwitchPlan } from '@/hooks/use-active-plan';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePlanMutations } from '../hooks/use-plan-mutations';

interface DeletePlanDialogProps {
  plan: Plan | null;
  allPlans: Plan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for deleting a budget plan.
 * Warns about data loss and prevents deleting the last plan.
 */
export function DeletePlanDialog({
  plan,
  allPlans,
  open,
  onOpenChange,
}: DeletePlanDialogProps) {
  const { data: activePlan } = useActivePlan();
  const switchPlan = useSwitchPlan();
  const { deletePlan } = usePlanMutations();

  const isLastPlan = allPlans.length <= 1;
  const isDeleting = deletePlan.isPending;

  const handleDelete = async () => {
    if (!plan || isLastPlan) return;

    try {
      // If deleting active plan, switch to another plan first
      if (plan.id === activePlan?.id) {
        const otherPlan = allPlans.find((p) => p.id !== plan.id);
        if (otherPlan) {
          await switchPlan(otherPlan.id);
        }
      }

      await deletePlan.mutateAsync(plan.id);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Plan</AlertDialogTitle>
          <AlertDialogDescription>
            {isLastPlan ? (
              <>
                This is your only budget plan. You cannot delete it. Create
                another plan first if you want to delete this one.
              </>
            ) : (
              <>
                Are you sure you want to delete <strong>{plan?.name}</strong>?
                This will permanently delete all data associated with this plan,
                including:
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>All expenses and transactions</li>
                  <li>Bucket allocations</li>
                  <li>Goals and progress</li>
                  <li>Net worth records</li>
                  <li>Historical snapshots</li>
                </ul>
                <p className="mt-2 font-medium">This action cannot be undone.</p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {!isLastPlan && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Plan
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
