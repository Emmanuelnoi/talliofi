import { useState } from 'react';
import type { BudgetTemplate } from '@/lib/budget-templates';
import { templateBucketsToFormData } from '@/lib/budget-templates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TemplateSelector } from '@/components/budget-templates';
import { useOnboardingDataStore } from '../stores/onboarding-data-store';

interface TemplateStepProps {
  /** Callback when the user proceeds to the next step */
  onNext: () => void;
  /** Callback when the user goes back to the previous step */
  onBack: () => void;
}

/**
 * Onboarding step for selecting a budget template.
 * Users can choose from pre-built templates or start from scratch.
 */
export function TemplateStep({ onNext, onBack }: TemplateStepProps) {
  const setBuckets = useOnboardingDataStore((s) => s.setBuckets);
  const [selectedTemplate, setSelectedTemplate] =
    useState<BudgetTemplate | null>(null);

  const handleSelectTemplate = (template: BudgetTemplate | null) => {
    setSelectedTemplate(template);
  };

  const handleContinue = () => {
    if (selectedTemplate) {
      // Apply template buckets to the onboarding store
      const buckets = templateBucketsToFormData(selectedTemplate.buckets);
      setBuckets(buckets);
    }
    // If no template selected (scratch), keep existing default buckets
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
          Starting point
        </p>
        <CardTitle>Choose a starting point</CardTitle>
        <CardDescription>
          Select a budget template to get started quickly, or create your own
          from scratch. You can always customize the buckets later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <TemplateSelector
          selectedTemplateId={selectedTemplate?.id ?? null}
          onSelectTemplate={handleSelectTemplate}
          showScratchOption={true}
        />

        {/* Selected template details */}
        {selectedTemplate?.details && (
          <div className="rounded-lg border border-border/70 bg-accent/40 p-4">
            <p className="text-sm text-muted-foreground">
              {selectedTemplate.details}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleContinue}>Continue to Buckets</Button>
        </div>
      </CardContent>
    </Card>
  );
}
