import { useCallback, useMemo, useState } from 'react';
import { Loader2, Plus, Target, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryStates, parseAsString } from 'nuqs';
import type { Goal, GoalType } from '@/domain/plan';
import { dollarsToCents } from '@/domain/money';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { useActivePlan } from '@/hooks/use-active-plan';
import { useGoals } from '@/hooks/use-plan-data';
import {
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
} from '@/hooks/use-plan-mutations';
import { GOAL_TYPE_LABELS, GOAL_COLORS } from '@/lib/constants';
import { GoalCard } from '../components/goal-card';
import { GoalForm } from '../components/goal-form';
import type { GoalFormData } from '../components/goal-form';

type GoalFilter = 'all' | 'active' | 'completed';
type GoalTypeFilter = 'all' | GoalType;

/**
 * Goals page component that displays and manages financial goals.
 * Supports filtering by status and type, with CRUD operations.
 */
export default function GoalsPage() {
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: goals = [], isLoading: goalsLoading } = useGoals(plan?.id);

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);

  // URL-based filter state
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault('active'),
    type: parseAsString.withDefault('all'),
  });

  const hasActiveFilters =
    filters.status !== 'active' || filters.type !== 'all';

  const clearFilters = useCallback(() => {
    void setFilters({
      status: 'active',
      type: 'all',
    });
  }, [setFilters]);

  // Filter goals based on current filters
  const filteredGoals = useMemo(() => {
    let result = [...goals];

    // Filter by status
    const statusFilter = (filters.status || 'active') as GoalFilter;
    if (statusFilter === 'active') {
      result = result.filter((g) => !g.isCompleted);
    } else if (statusFilter === 'completed') {
      result = result.filter((g) => g.isCompleted);
    }

    // Filter by type
    const typeFilter = (filters.type || 'all') as GoalTypeFilter;
    if (typeFilter !== 'all') {
      result = result.filter((g) => g.type === typeFilter);
    }

    // Sort: incomplete goals first (by progress desc), then completed goals by date
    result.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (!a.isCompleted) {
        // Sort active goals by progress (highest first)
        const aProgress =
          a.targetAmountCents > 0
            ? a.currentAmountCents / a.targetAmountCents
            : 0;
        const bProgress =
          b.targetAmountCents > 0
            ? b.currentAmountCents / b.targetAmountCents
            : 0;
        return bProgress - aProgress;
      }
      // Sort completed goals by completion date (newest first)
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return result;
  }, [goals, filters]);

  // Summary stats
  const stats = useMemo(() => {
    const activeGoals = goals.filter((g) => !g.isCompleted);
    const completedGoals = goals.filter((g) => g.isCompleted);
    const totalProgress = activeGoals.reduce(
      (sum, g) => sum + g.currentAmountCents,
      0,
    );
    const totalTarget = activeGoals.reduce(
      (sum, g) => sum + g.targetAmountCents,
      0,
    );
    const overallProgress =
      totalTarget > 0 ? (totalProgress / totalTarget) * 100 : 0;

    return {
      activeCount: activeGoals.length,
      completedCount: completedGoals.length,
      overallProgress,
    };
  }, [goals]);

  // --- Handlers ---
  const handleOpenAdd = useCallback(() => {
    setEditingGoal(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: GoalFormData) => {
      if (!plan) return;
      const now = new Date().toISOString();

      try {
        if (editingGoal) {
          const updated: Goal = {
            ...editingGoal,
            name: data.name,
            type: data.type,
            targetAmountCents: dollarsToCents(data.targetAmountDollars),
            currentAmountCents: dollarsToCents(data.currentAmountDollars),
            targetDate: data.targetDate || undefined,
            color: data.color,
            notes: data.notes,
            // Auto-complete if current >= target
            isCompleted:
              editingGoal.isCompleted ||
              dollarsToCents(data.currentAmountDollars) >=
                dollarsToCents(data.targetAmountDollars),
            updatedAt: now,
          };
          await updateGoal.mutateAsync(updated);
          toast.success('Goal updated');
        } else {
          const goal: Goal = {
            id: crypto.randomUUID(),
            planId: plan.id,
            name: data.name,
            type: data.type,
            targetAmountCents: dollarsToCents(data.targetAmountDollars),
            currentAmountCents: dollarsToCents(data.currentAmountDollars),
            targetDate: data.targetDate || undefined,
            color: data.color || GOAL_COLORS[0],
            notes: data.notes,
            isCompleted:
              dollarsToCents(data.currentAmountDollars) >=
              dollarsToCents(data.targetAmountDollars),
            createdAt: now,
            updatedAt: now,
          };
          await createGoal.mutateAsync(goal);
          toast.success('Goal created');
        }
        setSheetOpen(false);
        setEditingGoal(null);
      } catch {
        toast.error('Failed to save goal');
      }
    },
    [plan, editingGoal, createGoal, updateGoal],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingGoal || !plan) return;
    try {
      await deleteGoal.mutateAsync({
        id: deletingGoal.id,
        planId: plan.id,
      });
      toast.success('Goal deleted');
      setDeletingGoal(null);
    } catch {
      toast.error('Failed to delete goal. Please try again.');
    }
  }, [deletingGoal, plan, deleteGoal]);

  const handleComplete = useCallback(
    async (goal: Goal) => {
      if (!plan) return;
      try {
        const updated: Goal = {
          ...goal,
          isCompleted: true,
          updatedAt: new Date().toISOString(),
        };
        await updateGoal.mutateAsync(updated);
        toast.success('Congratulations! Goal completed!');
      } catch {
        toast.error('Failed to update goal');
      }
    },
    [plan, updateGoal],
  );

  const isLoading = planLoading || goalsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Goals"
          description="Complete onboarding to start tracking goals."
          eyebrow="Planning"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Goals"
        description="Track your savings targets and debt payoff progress."
        eyebrow="Planning"
        action={
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            Add Goal
          </Button>
        }
      />

      {/* Stats summary */}
      {goals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                Active goals
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.activeCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                Completed
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.completedCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                Overall progress
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.overallProgress.toFixed(0)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {goals.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="text-muted-foreground size-4 shrink-0" />

              <Select
                value={filters.status}
                onValueChange={(val) => void setFilters({ status: val })}
              >
                <SelectTrigger
                  className="h-8 w-[140px]"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All goals</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.type}
                onValueChange={(val) => void setFilters({ type: val })}
              >
                <SelectTrigger
                  className="h-8 w-[140px]"
                  aria-label="Filter by type"
                >
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {(
                    Object.entries(GOAL_TYPE_LABELS) as [GoalType, string][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  <X className="size-3" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {filteredGoals.length > 0 && (
        <div className="text-muted-foreground text-sm">
          {filteredGoals.length} goal
          {filteredGoals.length !== 1 && 's'}
          {hasActiveFilters && ` (filtered from ${goals.length})`}
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create your first financial goal to start tracking your progress toward savings targets or debt payoff."
          action={{
            label: 'Create your first goal',
            onClick: handleOpenAdd,
          }}
        />
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No matching goals"
          description="Try adjusting your filters to see more results."
          action={{
            label: 'Reset filters',
            onClick: clearFilters,
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleOpenEdit}
              onDelete={setDeletingGoal}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingGoal ? 'Edit goal' : 'New goal'}</SheetTitle>
            <SheetDescription>
              {editingGoal
                ? 'Update your goal details and progress.'
                : 'Create a new savings target or debt payoff goal.'}
            </SheetDescription>
          </SheetHeader>
          <GoalForm
            key={editingGoal?.id ?? 'new'}
            goal={editingGoal}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingGoal}
        onOpenChange={(open) => {
          if (!open) setDeletingGoal(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingGoal?.name}&rdquo;
              and all its progress data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
