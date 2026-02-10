import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { formatMoney } from '@/domain/money';
import { normalizeToMonthly } from '@/domain/plan';
import type { TemplateSuggestion } from '@/domain/plan';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FREQUENCY_LABELS, CATEGORY_LABELS } from '@/lib/constants';
import { useCurrencyStore } from '@/stores/currency-store';

interface SuggestionCardProps {
  /** The template suggestion to display */
  suggestion: TemplateSuggestion;
  /** Called when user accepts the suggestion */
  onAccept: () => void;
  /** Called when user dismisses the suggestion */
  onDismiss: () => void;
  /** Whether actions are disabled */
  isLoading?: boolean;
}

/**
 * Card component for displaying a detected recurring pattern suggestion.
 *
 * Shows:
 * - Pattern name and amount
 * - Detected frequency
 * - Confidence indicator
 * - Number of matching expenses
 * - Accept/dismiss actions
 */
export function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  isLoading = false,
}: SuggestionCardProps) {
  const monthlyAmount = useMemo(
    () => normalizeToMonthly(suggestion.amountCents, suggestion.frequency),
    [suggestion.amountCents, suggestion.frequency],
  );
  const baseCurrency = useCurrencyStore((s) => s.currencyCode);
  const suggestionCurrency = suggestion.currencyCode ?? baseCurrency;

  const confidencePercent = Math.round(suggestion.confidence * 100);
  const showNormalized = suggestion.frequency !== 'monthly';

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Name and details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{suggestion.name}</span>
              <Badge variant="secondary">
                {FREQUENCY_LABELS[suggestion.frequency]}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-1 text-sm">
              {CATEGORY_LABELS[suggestion.category]}
            </div>
          </div>

          {/* Amount */}
          <div className="shrink-0 text-right">
            <div className="font-medium tabular-nums">
              {formatMoney(suggestion.amountCents, {
                currency: suggestionCurrency,
              })}
              {showNormalized && (
                <span className="text-muted-foreground text-xs">
                  /
                  {suggestion.frequency === 'weekly'
                    ? 'wk'
                    : suggestion.frequency === 'biweekly'
                      ? '2wk'
                      : suggestion.frequency === 'quarterly'
                        ? 'qtr'
                        : suggestion.frequency === 'annual'
                          ? 'yr'
                          : 'mo'}
                </span>
              )}
            </div>
            {showNormalized && (
              <div className="text-muted-foreground text-xs tabular-nums">
                {formatMoney(monthlyAmount, { currency: suggestionCurrency })}
                /mo
              </div>
            )}
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Based on {suggestion.matchingExpenseIds.length} similar expenses
            </span>
            <span className="font-medium">{confidencePercent}% match</span>
          </div>
          <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onDismiss}
            disabled={isLoading}
          >
            <X className="size-4" />
            Dismiss
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={onAccept}
            disabled={isLoading}
          >
            <Check className="size-4" />
            Create template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
