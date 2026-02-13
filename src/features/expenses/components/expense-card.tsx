import { useMemo, useState } from 'react';
import { MoreHorizontal, Pencil, Repeat, Split, Trash2 } from 'lucide-react';
import type { Cents } from '@/domain/money';
import { DEFAULT_CURRENCY, formatMoney } from '@/domain/money';
import type { BucketAllocation, ExpenseItem } from '@/domain/plan';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/lib/constants';
import { highlightText } from '@/lib/highlight-text';
import { cn } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency-store';
import { formatTransactionDate } from '../utils/date-utils';

interface ExpenseCardProps {
  expense: ExpenseItem;
  bucket: BucketAllocation | undefined;
  bucketMap: Map<string, BucketAllocation>;
  monthlyAmount: Cents;
  showNormalized: boolean;
  searchQuery: string;
  onEdit: () => void;
  onDelete: () => void;
  onSaveAsTemplate: () => void;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
}

export function ExpenseCard({
  expense,
  bucket,
  bucketMap,
  monthlyAmount,
  showNormalized,
  searchQuery,
  onEdit,
  onDelete,
  onSaveAsTemplate,
  selected,
  onToggleSelected,
}: ExpenseCardProps) {
  const [splitExpanded, setSplitExpanded] = useState(false);
  const baseCurrency = useCurrencyStore((s) => s.currencyCode);
  const expenseCurrency =
    expense.currencyCode ?? baseCurrency ?? DEFAULT_CURRENCY;

  const nameContent = useMemo(() => {
    if (!searchQuery.trim()) return expense.name;
    const { segments } = highlightText(expense.name, searchQuery);
    return segments;
  }, [expense.name, searchQuery]);

  const categoryContent = useMemo(() => {
    const label = CATEGORY_LABELS[expense.category];
    if (!searchQuery.trim()) return label;
    const { segments } = highlightText(label, searchQuery);
    return segments;
  }, [expense.category, searchQuery]);

  const bucketContent = useMemo(() => {
    if (!bucket) return null;
    if (!searchQuery.trim()) return bucket.name;
    const { segments } = highlightText(bucket.name, searchQuery);
    return segments;
  }, [bucket, searchQuery]);

  const isSplit =
    expense.isSplit && expense.splits && expense.splits.length > 0;
  const splitCount = isSplit ? expense.splits!.length : 0;

  return (
    <Card
      className={cn(
        'transition-colors hover:border-foreground/15',
        selected && 'border-primary/50 bg-primary/5',
      )}
    >
      <CardContent className="py-5">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            className="accent-primary size-4 rounded border"
            checked={selected}
            onChange={(e) => onToggleSelected(e.target.checked)}
            aria-label={`Select expense ${expense.name}`}
          />
          {isSplit ? (
            <div className="flex shrink-0 -space-x-1">
              {expense.splits!.slice(0, 3).map((split, idx) => {
                const splitBucket = bucketMap.get(split.bucketId);
                return (
                  <span
                    key={idx}
                    className="size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900"
                    style={{ backgroundColor: splitBucket?.color ?? '#888' }}
                    aria-hidden="true"
                  />
                );
              })}
              {expense.splits!.length > 3 && (
                <span
                  className="flex size-2.5 items-center justify-center rounded-full bg-gray-400 text-[6px] text-white ring-2 ring-white dark:ring-gray-900"
                  aria-hidden="true"
                >
                  +
                </span>
              )}
            </div>
          ) : bucket ? (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: bucket.color }}
              aria-hidden="true"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-semibold">
                {nameContent}
              </span>
              <Badge
                variant={expense.isFixed ? 'secondary' : 'outline'}
                className="shrink-0"
              >
                {expense.isFixed ? 'Fixed' : 'Variable'}
              </Badge>
              {isSplit && (
                <Badge asChild variant="outline" className="shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setSplitExpanded(!splitExpanded)}
                    aria-expanded={splitExpanded}
                    className="flex items-center gap-1"
                  >
                    <Split className="size-3" />
                    {splitCount} splits
                  </button>
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
              <span>{categoryContent}</span>
              {bucketContent && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>{bucketContent}</span>
                </>
              )}
              {isSplit && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span className="text-primary">+{splitCount - 1} more</span>
                </>
              )}
              <span aria-hidden="true">&middot;</span>
              <span>{FREQUENCY_LABELS[expense.frequency]}</span>
              {expense.transactionDate && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>{formatTransactionDate(expense.transactionDate)}</span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-lg font-semibold tabular-nums">
              {formatMoney(expense.amountCents, { currency: expenseCurrency })}
              {showNormalized && (
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                  /
                  {expense.frequency === 'weekly'
                    ? 'wk'
                    : expense.frequency === 'biweekly'
                      ? '2wk'
                      : expense.frequency === 'quarterly'
                        ? 'qtr'
                        : expense.frequency === 'annual'
                          ? 'yr'
                          : expense.frequency === 'semimonthly'
                            ? '2mo'
                            : 'mo'}
                </span>
              )}
            </div>
            {showNormalized && (
              <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em] tabular-nums">
                {formatMoney(monthlyAmount, { currency: expenseCurrency })}/mo
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={`Actions for ${expense.name}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveAsTemplate}>
                <Repeat className="size-4" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isSplit && splitExpanded && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
              Split breakdown
            </div>
            <div className="space-y-2">
              {expense.splits!.map((split, idx) => {
                const splitBucket = bucketMap.get(split.bucketId);
                return (
                  <div
                    key={idx}
                    className="bg-muted/40 flex items-center gap-3 rounded-md px-3 py-2 text-sm"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: splitBucket?.color ?? '#888' }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {splitBucket?.name ?? 'Unknown bucket'}
                        </span>
                        <span className="text-muted-foreground">
                          {CATEGORY_LABELS[split.category]}
                        </span>
                      </div>
                      {split.notes && (
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {split.notes}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 font-medium tabular-nums">
                      {formatMoney(split.amountCents, {
                        currency: expenseCurrency,
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
