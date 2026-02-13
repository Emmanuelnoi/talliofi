import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_CURRENCY, dollarsToCents, formatMoney } from '@/domain/money';
import { useOnboardingDataStore } from '../stores/onboarding-data-store';
import { FREQUENCY_LABELS } from '../constants';
import type { OnboardingData } from '../types';

interface SummaryStepProps {
  onBack: () => void;
  onComplete: (data: OnboardingData) => Promise<void>;
}

export function SummaryStep({ onBack, onComplete }: SummaryStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getData = useOnboardingDataStore((s) => s.getData);
  const data = getData();
  const formatDollars = (value: number) =>
    formatMoney(dollarsToCents(value), { currency: DEFAULT_CURRENCY });

  const handleBack = () => {
    setError(null);
    onBack();
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onComplete(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
          Summary
        </p>
        <CardTitle>Review your plan</CardTitle>
        <CardDescription>
          Here is a summary of your financial plan. You can go back to make
          changes or finish setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Income */}
        <div>
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-[0.2em]">
            Income
          </h3>
          <div className="bg-muted/40 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Gross income</span>
              <span className="text-sm font-semibold tabular-nums">
                {formatDollars(data.income.grossIncomeDollars)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Frequency</span>
              <span className="text-sm font-medium">
                {FREQUENCY_LABELS[data.income.incomeFrequency]}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Taxes */}
        <div>
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-[0.2em]">
            Taxes
          </h3>
          <div className="bg-muted/40 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Effective tax rate</span>
              <span className="text-sm font-semibold tabular-nums">
                {data.tax.effectiveRate}%
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Buckets */}
        <div>
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-[0.2em]">
            Buckets ({data.buckets.length})
          </h3>
          <div className="space-y-2">
            {data.buckets.map((bucket, index) => (
              <div
                key={index}
                className="bg-muted/40 flex items-center justify-between rounded-lg border border-border/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="text-sm">{bucket.name}</span>
                </div>
                <Badge variant="secondary">
                  {bucket.mode === 'percentage'
                    ? `${bucket.targetPercentage}%`
                    : formatDollars(bucket.targetAmountDollars ?? 0)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Expenses */}
        <div>
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-[0.2em]">
            Expenses ({data.expenses.length})
          </h3>
          {data.expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No expenses added yet. You can add them after setup.
            </p>
          ) : (
            <div className="space-y-2">
              {data.expenses.map((expense, index) => (
                <div
                  key={index}
                  className="bg-muted/40 flex items-center justify-between rounded-lg border border-border/60 p-3"
                >
                  <span className="text-sm">{expense.name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatDollars(expense.amountDollars)}
                    <span className="text-muted-foreground ml-1 text-xs">
                      /{FREQUENCY_LABELS[expense.frequency]?.toLowerCase()}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg border border-destructive/30 p-3 text-xs">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button onClick={handleComplete} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
                Creating Plan…
              </>
            ) : (
              <>
                <CheckCircle className="size-4" aria-hidden="true" />
                Create Plan
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
