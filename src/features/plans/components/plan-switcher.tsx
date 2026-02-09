import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  useActivePlan,
  useAllPlans,
  useSwitchPlan,
} from '@/hooks/use-active-plan';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreatePlanDialog } from './create-plan-dialog';

interface PlanSwitcherProps {
  /** Whether the sidebar is in collapsed state */
  collapsed?: boolean;
}

/**
 * Plan switcher dropdown for the sidebar.
 * Shows current plan and allows switching between plans.
 */
export function PlanSwitcher({ collapsed = false }: PlanSwitcherProps) {
  const navigate = useNavigate();
  const { data: activePlan } = useActivePlan();
  const { data: allPlans = [] } = useAllPlans();
  const switchPlan = useSwitchPlan();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleSwitchPlan = async (planId: string) => {
    if (planId !== activePlan?.id) {
      await switchPlan(planId);
    }
  };

  const handleManagePlans = () => {
    navigate('/plans');
  };

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Switch plan"
          >
            <FolderOpen className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Budget Plans</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allPlans.map((plan) => (
            <DropdownMenuItem
              key={plan.id}
              onClick={() => handleSwitchPlan(plan.id)}
            >
              <Check
                className={cn(
                  'mr-2 size-4',
                  plan.id === activePlan?.id ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="truncate">{plan.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create New Plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleManagePlans}>
            <FolderOpen className="mr-2 size-4" />
            Manage Plans
          </DropdownMenuItem>
        </DropdownMenuContent>
        <CreatePlanDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
            aria-label="Switch plan"
          >
            <span className="truncate">{activePlan?.name ?? 'Select plan'}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Budget Plans</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allPlans.map((plan) => (
            <DropdownMenuItem
              key={plan.id}
              onClick={() => handleSwitchPlan(plan.id)}
            >
              <Check
                className={cn(
                  'mr-2 size-4',
                  plan.id === activePlan?.id ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="truncate">{plan.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create New Plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleManagePlans}>
            <FolderOpen className="mr-2 size-4" />
            Manage Plans
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreatePlanDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
}
