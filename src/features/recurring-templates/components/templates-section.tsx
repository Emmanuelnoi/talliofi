import { useCallback, useMemo, useState } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { dollarsToCents } from '@/domain/money';
import type {
  RecurringTemplate,
  BucketAllocation,
  TemplateSuggestion,
} from '@/domain/plan';
import { recurringService } from '@/services/recurring-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRecurringTemplates } from '@/hooks/use-plan-data';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import {
  useCreateRecurringTemplate,
  useUpdateRecurringTemplate,
  useDeleteRecurringTemplate,
  useToggleRecurringTemplate,
} from '@/hooks/use-plan-mutations';
import { TemplateList } from './template-list';
import { TemplateForm } from './template-form';
import { SuggestionCard } from './suggestion-card';
import type { TemplateFormData } from './template-form';

interface TemplatesSectionProps {
  /** The current plan ID */
  planId: string;
  /** Available buckets for template assignment */
  buckets: BucketAllocation[];
}

/**
 * Section component for managing recurring templates.
 *
 * Features:
 * - List of existing templates with CRUD actions
 * - Create new template form
 * - Detect recurring patterns button
 * - Pattern suggestions with accept/dismiss
 */
export function TemplatesSection({ planId, buckets }: TemplatesSectionProps) {
  const { data: templates = [], isLoading } = useRecurringTemplates(planId);
  const { scheduleVaultSave } = useLocalEncryption();

  const createTemplate = useCreateRecurringTemplate();
  const updateTemplate = useUpdateRecurringTemplate();
  const deleteTemplate = useDeleteRecurringTemplate();
  const toggleTemplate = useToggleRecurringTemplate();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<RecurringTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] =
    useState<RecurringTemplate | null>(null);

  // Pattern detection state
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedBucketForSuggestion, setSelectedBucketForSuggestion] =
    useState<string>('');
  const [activeSuggestion, setActiveSuggestion] =
    useState<TemplateSuggestion | null>(null);

  const bucketMap = useMemo(() => {
    const map = new Map<string, BucketAllocation>();
    for (const b of buckets) {
      map.set(b.id, b);
    }
    return map;
  }, [buckets]);

  // --- Handlers ---

  const handleOpenAdd = useCallback(() => {
    setEditingTemplate(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((template: RecurringTemplate) => {
    setEditingTemplate(template);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: TemplateFormData) => {
      const now = new Date().toISOString();

      try {
        if (editingTemplate) {
          const updated: RecurringTemplate = {
            ...editingTemplate,
            name: data.name,
            amountCents: dollarsToCents(data.amountDollars),
            frequency: data.frequency,
            category: data.category,
            bucketId: data.bucketId,
            currencyCode: data.currencyCode ?? editingTemplate.currencyCode,
            dayOfMonth: data.dayOfMonth,
            isActive: data.isActive,
            isFixed: data.isFixed,
            notes: data.notes,
            updatedAt: now,
          };
          await updateTemplate.mutateAsync(updated);
          toast.success('Template updated');
        } else {
          const template: RecurringTemplate = {
            id: crypto.randomUUID(),
            planId,
            name: data.name,
            amountCents: dollarsToCents(data.amountDollars),
            frequency: data.frequency,
            category: data.category,
            bucketId: data.bucketId,
            currencyCode: data.currencyCode,
            dayOfMonth: data.dayOfMonth,
            isActive: data.isActive,
            isFixed: data.isFixed,
            notes: data.notes,
            createdAt: now,
            updatedAt: now,
          };
          await createTemplate.mutateAsync(template);
          toast.success('Template created');
        }
        setSheetOpen(false);
        setEditingTemplate(null);
      } catch {
        toast.error('Failed to save template');
      }
    },
    [planId, editingTemplate, createTemplate, updateTemplate],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingTemplate) return;
    try {
      await deleteTemplate.mutateAsync({
        id: deletingTemplate.id,
        planId,
      });
      toast.success('Template deleted');
      setDeletingTemplate(null);
    } catch {
      toast.error('Failed to delete template');
    }
  }, [deletingTemplate, planId, deleteTemplate]);

  const handleToggleActive = useCallback(
    async (template: RecurringTemplate) => {
      try {
        await toggleTemplate.mutateAsync({
          id: template.id,
          planId,
        });
        toast.success(
          template.isActive ? 'Template paused' : 'Template activated',
        );
      } catch {
        toast.error('Failed to update template');
      }
    },
    [planId, toggleTemplate],
  );

  const handleGenerateNow = useCallback(
    async (template: RecurringTemplate) => {
      try {
        await recurringService.generateNow(template.id);
        scheduleVaultSave();
        toast.success(`Generated expense from "${template.name}"`);
      } catch {
        toast.error('Failed to generate expense');
      }
    },
    [scheduleVaultSave],
  );

  // --- Pattern Detection ---

  const handleDetectPatterns = useCallback(async () => {
    setIsDetecting(true);
    try {
      const detected = await recurringService.detectRecurringPatterns(planId);
      setSuggestions(detected);
      if (detected.length === 0) {
        toast.info('No recurring patterns detected');
      } else {
        toast.success(
          `Found ${detected.length} potential recurring pattern(s)`,
        );
      }
    } catch {
      toast.error('Failed to detect patterns');
    } finally {
      setIsDetecting(false);
    }
  }, [planId]);

  const handleAcceptSuggestion = useCallback(
    (suggestion: TemplateSuggestion) => {
      setActiveSuggestion(suggestion);
      setSelectedBucketForSuggestion(buckets[0]?.id ?? '');
    },
    [buckets],
  );

  const handleConfirmSuggestion = useCallback(async () => {
    if (!activeSuggestion || !selectedBucketForSuggestion) return;

    try {
      await recurringService.createTemplateFromSuggestion(
        planId,
        activeSuggestion,
        selectedBucketForSuggestion,
      );
      scheduleVaultSave();
      toast.success(`Created template "${activeSuggestion.name}"`);

      // Remove from suggestions
      setSuggestions((prev) =>
        prev.filter((s) => s.name !== activeSuggestion.name),
      );
      setActiveSuggestion(null);
    } catch {
      toast.error('Failed to create template');
    }
  }, [
    planId,
    activeSuggestion,
    selectedBucketForSuggestion,
    scheduleVaultSave,
  ]);

  const handleDismissSuggestion = useCallback(
    (suggestion: TemplateSuggestion) => {
      setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
    },
    [],
  );

  const isMutating =
    createTemplate.isPending ||
    updateTemplate.isPending ||
    deleteTemplate.isPending ||
    toggleTemplate.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {templates.length} template{templates.length !== 1 && 's'}
          {templates.filter((t) => t.isActive).length > 0 && (
            <span> ({templates.filter((t) => t.isActive).length} active)</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetectPatterns}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Detect recurring
          </Button>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            New template
          </Button>
        </div>
      </div>

      {/* Pattern Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="text-primary size-4" />
              Detected Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.name}
                suggestion={suggestion}
                onAccept={() => handleAcceptSuggestion(suggestion)}
                onDismiss={() => handleDismissSuggestion(suggestion)}
                isLoading={isMutating}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Template List */}
      <TemplateList
        templates={templates}
        bucketMap={bucketMap}
        onEdit={handleOpenEdit}
        onDelete={setDeletingTemplate}
        onToggleActive={handleToggleActive}
        onGenerateNow={handleGenerateNow}
        onCreateNew={handleOpenAdd}
        isLoading={isMutating}
      />

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingTemplate ? 'Edit template' : 'New template'}
            </SheetTitle>
            <SheetDescription>
              {editingTemplate
                ? 'Update this recurring template.'
                : 'Create a template to automatically generate expenses on a schedule.'}
            </SheetDescription>
          </SheetHeader>
          <TemplateForm
            key={editingTemplate?.id ?? 'new'}
            template={editingTemplate}
            buckets={buckets}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => {
          if (!open) setDeletingTemplate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingTemplate?.name}
              &rdquo;. Existing expenses created from this template will not be
              affected.
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

      {/* Bucket selection for suggestion */}
      <AlertDialog
        open={!!activeSuggestion}
        onOpenChange={(open) => {
          if (!open) setActiveSuggestion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create template</AlertDialogTitle>
            <AlertDialogDescription>
              Select a bucket for the template &ldquo;{activeSuggestion?.name}
              &rdquo;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="suggestion-bucket">Bucket</Label>
            <Select
              value={selectedBucketForSuggestion}
              onValueChange={setSelectedBucketForSuggestion}
            >
              <SelectTrigger id="suggestion-bucket" className="mt-2">
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                {buckets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span
                      className="mr-1.5 inline-block size-2 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSuggestion}
              disabled={!selectedBucketForSuggestion}
            >
              Create template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
