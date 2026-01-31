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
        <CardTitle>Review your plan</CardTitle>
        <CardDescription>
          Here is a summary of your financial plan. You can go back to make
          changes or finish setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Income */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Income</h3>
          <div className="bg-muted/50 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Gross income</span>
              <span className="money text-sm font-medium">
                ${data.income.grossIncomeDollars.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Frequency</span>
              <span className="text-sm">
                {FREQUENCY_LABELS[data.income.incomeFrequency]}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Taxes */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Taxes</h3>
          <div className="bg-muted/50 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Effective tax rate</span>
              <span className="money text-sm font-medium">
                {data.tax.effectiveRate}%
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Buckets */}
        <div>
          <h3 className="mb-2 text-sm font-medium">
            Buckets ({data.buckets.length})
          </h3>
          <div className="space-y-2">
            {data.buckets.map((bucket, index) => (
              <div
                key={index}
                className="bg-muted/50 flex items-center justify-between rounded-lg border p-3"
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
                    : `$${bucket.targetAmountDollars?.toLocaleString()}`}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Expenses */}
        <div>
          <h3 className="mb-2 text-sm font-medium">
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
                  className="bg-muted/50 flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm">{expense.name}</span>
                  <span className="money text-sm font-medium">
                    ${expense.amountDollars.toLocaleString()}
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
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
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
                <Loader2 className="size-4 animate-spin" />
                Creating plan...
              </>
            ) : (
              <>
                <CheckCircle className="size-4" />
                Create plan
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
