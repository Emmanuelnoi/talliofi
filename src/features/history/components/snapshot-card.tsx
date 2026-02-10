import type { MonthlySnapshot } from '@/domain/plan/types';
import type { Cents, CurrencyCode } from '@/domain/money';
import { formatMoney, subtractMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SnapshotCardProps {
  snapshot: MonthlySnapshot;
  previousSnapshot?: MonthlySnapshot;
}

/** Formats a yearMonth string (e.g. "2026-01") into a human-readable label. */
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Renders a delta badge showing the change between two values. */
function DeltaBadge({
  current,
  previous,
  currencyCode,
}: {
  current: Cents;
  previous: Cents;
  currencyCode: CurrencyCode;
}) {
  const delta = subtractMoney(current, previous);

  if (delta === 0) return null;

  const isPositive = delta > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPositive ? 'text-[var(--surplus)]' : 'text-[var(--deficit)]',
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {formatMoney(Math.abs(delta) as Cents, { currency: currencyCode })}
    </span>
  );
}

export function SnapshotCard({
  snapshot,
  previousSnapshot,
}: SnapshotCardProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const surplus = subtractMoney(
    snapshot.netIncomeCents,
    snapshot.totalExpensesCents,
  );
  const isSurplus = surplus >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {formatYearMonth(snapshot.yearMonth)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Net Income</span>
            <div className="flex items-center gap-2">
              <span className="money text-sm font-medium">
                {formatMoney(snapshot.netIncomeCents, {
                  currency: currencyCode,
                })}
              </span>
              {previousSnapshot && (
                <DeltaBadge
                  current={snapshot.netIncomeCents}
                  previous={previousSnapshot.netIncomeCents}
                  currencyCode={currencyCode}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Expenses</span>
            <div className="flex items-center gap-2">
              <span className="money text-sm font-medium">
                {formatMoney(snapshot.totalExpensesCents, {
                  currency: currencyCode,
                })}
              </span>
              {previousSnapshot && (
                <DeltaBadge
                  current={snapshot.totalExpensesCents}
                  previous={previousSnapshot.totalExpensesCents}
                  currencyCode={currencyCode}
                />
              )}
            </div>
          </div>

          <div className="bg-border my-1 h-px" role="separator" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isSurplus ? 'Surplus' : 'Deficit'}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'money text-sm font-semibold',
                  isSurplus ? 'text-[var(--surplus)]' : 'text-[var(--deficit)]',
                )}
              >
                {formatMoney(surplus, { currency: currencyCode })}
              </span>
              {previousSnapshot && (
                <DeltaBadge
                  current={surplus}
                  previous={subtractMoney(
                    previousSnapshot.netIncomeCents,
                    previousSnapshot.totalExpensesCents,
                  )}
                  currencyCode={currencyCode}
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
