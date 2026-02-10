import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { TaxSimpleInputSchema } from '@/domain/plan/schemas';
import type { Plan, TaxComponent } from '@/domain/plan';
import { PageHeader } from '@/components/layout/page-header';
import { SaveIndicator } from '@/components/feedback/save-indicator';
import { PercentInput } from '@/components/forms/percent-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useActivePlan } from '@/hooks/use-active-plan';
import { useTaxComponents } from '@/hooks/use-plan-data';
import {
  useUpdatePlan,
  useCreateTaxComponent,
  useUpdateTaxComponent,
  useDeleteTaxComponent,
} from '@/hooks/use-plan-mutations';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/feedback/unsaved-changes-dialog';

type TaxSimpleFormData = z.infer<typeof TaxSimpleInputSchema>;

export default function TaxesPage() {
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: taxComponents = [], isLoading: taxLoading } = useTaxComponents(
    plan?.id,
  );
  const updatePlan = useUpdatePlan();
  const createTaxComponent = useCreateTaxComponent();
  const updateTaxComponent = useUpdateTaxComponent();
  const deleteTaxComponent = useDeleteTaxComponent();

  const isItemized = plan?.taxMode === 'itemized';

  // --- Simple mode form ---
  const simpleForm = useForm<TaxSimpleFormData>({
    resolver: zodResolver(TaxSimpleInputSchema),
    defaultValues: { effectiveRate: 0 },
  });

  useEffect(() => {
    if (plan && !isItemized) {
      simpleForm.reset({ effectiveRate: plan.taxEffectiveRate ?? 0 });
    }
  }, [plan, isItemized, simpleForm]);

  const simpleData =
    useWatch({ control: simpleForm.control }) ??
    ({ effectiveRate: 0 } as const);

  const { status: simpleStatus } = useAutoSave({
    data: simpleData,
    enabled: !!plan && !isItemized && simpleForm.formState.isValid,
    debounceMs: 800,
    onSave: async (data) => {
      if (!plan) return;
      const updated: Plan = {
        ...plan,
        taxEffectiveRate: data.effectiveRate,
      };
      try {
        await updatePlan.mutateAsync(updated);
      } catch {
        toast.error('Failed to save tax rate');
      }
    },
  });

  // --- Toggle handler ---
  const handleToggleMode = useCallback(async () => {
    if (!plan) return;
    const newMode = isItemized ? 'simple' : 'itemized';
    const updated: Plan = {
      ...plan,
      taxMode: newMode,
    };
    try {
      await updatePlan.mutateAsync(updated);
    } catch {
      toast.error('Failed to switch tax mode');
    }
  }, [plan, isItemized, updatePlan]);

  // --- Itemized mode handlers ---
  const handleAddComponent = useCallback(async () => {
    if (!plan) return;
    const component: TaxComponent = {
      id: crypto.randomUUID(),
      planId: plan.id,
      name: '',
      ratePercent: 0,
      sortOrder: taxComponents.length,
    };
    try {
      await createTaxComponent.mutateAsync(component);
    } catch {
      toast.error('Failed to add tax component');
    }
  }, [plan, taxComponents.length, createTaxComponent]);

  const handleUpdateComponent = useCallback(
    async (component: TaxComponent) => {
      try {
        await updateTaxComponent.mutateAsync(component);
      } catch {
        toast.error('Failed to update tax component');
      }
    },
    [updateTaxComponent],
  );

  const handleDeleteComponent = useCallback(
    async (id: string) => {
      if (!plan) return;
      try {
        await deleteTaxComponent.mutateAsync({ id, planId: plan.id });
      } catch {
        toast.error('Failed to delete tax component');
      }
    },
    [plan, deleteTaxComponent],
  );

  const { blocker, confirmNavigation, cancelNavigation } = useUnsavedChanges({
    isDirty: simpleStatus === 'saving',
  });

  const totalRate = taxComponents.reduce((sum, c) => sum + c.ratePercent, 0);

  const isLoading = planLoading || taxLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Taxes"
          description="Complete onboarding to configure taxes."
        />
      </div>
    );
  }

  const saveStatus = isItemized ? 'idle' : simpleStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxes"
        description="Configure how taxes are estimated for your budget."
        action={
          <SaveIndicator
            status={saveStatus === 'error' ? 'idle' : saveStatus}
          />
        }
      />

      {/* Mode toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Tax calculation mode</CardTitle>
          <CardDescription>
            Use a single effective rate or itemize individual tax components.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="tax-mode-toggle" className="text-sm">
              Simple
            </Label>
            <Switch
              id="tax-mode-toggle"
              checked={isItemized}
              onCheckedChange={handleToggleMode}
              aria-label="Toggle between simple and itemized tax modes"
            />
            <Label htmlFor="tax-mode-toggle" className="text-sm">
              Itemized
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Simple mode */}
      {!isItemized && (
        <Card>
          <CardHeader>
            <CardTitle>Effective tax rate</CardTitle>
            <CardDescription>
              Combined federal, state, and local tax rate. Check your last tax
              return for a more accurate number. Typical range: 15-30%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="effectiveRate">Rate</Label>
              <Controller
                control={simpleForm.control}
                name="effectiveRate"
                render={({ field }) => (
                  <PercentInput
                    id="effectiveRate"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    min={0}
                    max={100}
                    placeholder="25"
                    aria-label="Effective tax rate"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Controller
                control={simpleForm.control}
                name="effectiveRate"
                render={({ field }) => (
                  <Slider
                    value={[field.value]}
                    onValueChange={([val]) => field.onChange(val)}
                    min={0}
                    max={60}
                    step={0.5}
                    aria-label="Tax rate slider"
                  />
                )}
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>0%</span>
                <span>60%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itemized mode */}
      {isItemized && (
        <Card>
          <CardHeader>
            <CardTitle>Tax components</CardTitle>
            <CardDescription>
              Add individual tax components. The total effective rate is
              calculated automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {taxComponents.map((component) => (
              <TaxComponentRow
                key={component.id}
                component={component}
                onUpdate={handleUpdateComponent}
                onDelete={handleDeleteComponent}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAddComponent}
            >
              <Plus className="size-4" />
              Add tax component
            </Button>

            {taxComponents.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">
                    Total effective rate
                  </span>
                  <span className="text-lg font-semibold tabular-nums">
                    {totalRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onStay={cancelNavigation}
        onLeave={confirmNavigation}
      />
    </div>
  );
}

// --- Subcomponent for each tax component row ---

interface TaxComponentRowProps {
  component: TaxComponent;
  onUpdate: (component: TaxComponent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function TaxComponentRow({
  component,
  onUpdate,
  onDelete,
}: TaxComponentRowProps) {
  const [localName, setLocalName] = useState(component.name);
  const [localRate, setLocalRate] = useState(component.ratePercent);

  const handleBlurName = () => {
    if (localName !== component.name && localName.trim()) {
      void onUpdate({ ...component, name: localName.trim() });
    }
  };

  const handleBlurRate = () => {
    if (localRate !== component.ratePercent) {
      void onUpdate({ ...component, ratePercent: localRate });
    }
  };

  return (
    <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
      <div className="flex-1 space-y-1">
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleBlurName}
          placeholder="e.g., Federal"
          className="h-8"
          aria-label="Tax component name"
        />
      </div>
      <div className="w-24">
        <PercentInput
          value={localRate}
          onChange={setLocalRate}
          onBlur={handleBlurRate}
          min={0}
          max={100}
          aria-label={`Rate for ${localName || 'tax component'}`}
        />
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={`Delete ${localName || 'tax component'}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tax component?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &ldquo;{localName || 'this component'}&rdquo;
              from your tax calculation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void onDelete(component.id)}
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
