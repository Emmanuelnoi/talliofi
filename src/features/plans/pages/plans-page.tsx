import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import {
  useActivePlan,
  useAllPlans,
  useSwitchPlan,
} from '@/hooks/use-active-plan';
import type { Plan } from '@/domain/plan/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { PlanCard } from '../components/plan-card';
import { CreatePlanDialog } from '../components/create-plan-dialog';
import { EditPlanDialog } from '../components/edit-plan-dialog';
import { DeletePlanDialog } from '../components/delete-plan-dialog';
import { DuplicatePlanDialog } from '../components/duplicate-plan-dialog';
import { PlansSkeleton } from '../components/plans-skeleton';

/**
 * Plans management page.
 * Lists all budget plans with options to create, edit, duplicate, and delete.
 */
export default function PlansPage() {
  const { data: activePlan, isLoading: isLoadingActive } = useActivePlan();
  const { data: allPlans = [], isLoading: isLoadingAll } = useAllPlans();
  const switchPlan = useSwitchPlan();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [duplicatingPlan, setDuplicatingPlan] = useState<Plan | null>(null);

  const isLoading = isLoadingActive || isLoadingAll;

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.id !== activePlan?.id) {
      await switchPlan(plan.id);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
  };

  const handleDuplicatePlan = (plan: Plan) => {
    setDuplicatingPlan(plan);
  };

  const handleDeletePlan = (plan: Plan) => {
    setDeletingPlan(plan);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Budget Plans"
          description="Manage your budget plans and scenarios."
          eyebrow="Workspace"
        />
        <PlansSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Budget Plans"
        description="Manage your budget plans and scenarios."
        eyebrow="Workspace"
        action={
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4" />
            New Plan
          </Button>
        }
      />

      {allPlans.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No Budget Plans"
          description="Create your first budget plan to start tracking your finances."
          action={{
            label: 'Create Plan',
            onClick: () => setIsCreateDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isActive={plan.id === activePlan?.id}
              onSelect={handleSelectPlan}
              onEdit={handleEditPlan}
              onDuplicate={handleDuplicatePlan}
              onDelete={handleDeletePlan}
            />
          ))}
        </div>
      )}

      <CreatePlanDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <EditPlanDialog
        plan={editingPlan}
        open={!!editingPlan}
        onOpenChange={(open) => !open && setEditingPlan(null)}
      />

      <DuplicatePlanDialog
        plan={duplicatingPlan}
        open={!!duplicatingPlan}
        onOpenChange={(open) => !open && setDuplicatingPlan(null)}
      />

      <DeletePlanDialog
        plan={deletingPlan}
        allPlans={allPlans}
        open={!!deletingPlan}
        onOpenChange={(open) => !open && setDeletingPlan(null)}
      />
    </div>
  );
}
