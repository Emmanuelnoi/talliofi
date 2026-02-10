import type { RollingAverages } from '@/domain/plan/types';
import { formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RollingAverageSummaryProps {
  averages: RollingAverages | null;
  months: 3 | 6 | 12;
}

const TREND_CONFIG = {
  increasing: {
    icon: TrendingUp,
    text: 'Spending is increasing',
    className: 'text-[var(--deficit)]',
  },
  decreasing: {
    icon: TrendingDown,
    text: 'Spending is decreasing',
    className: 'text-[var(--surplus)]',
  },
  stable: {
    icon: Minus,
    text: 'Spending is stable',
    className: 'text-[var(--neutral)]',
  },
} as const;

export function RollingAverageSummary({
  averages,
  months,
}: RollingAverageSummaryProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {months}-Month Rolling Average
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!averages ? (
          <p className="text-muted-foreground text-sm">
            Not enough data for a {months}-month average.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground text-sm">
                Avg. Monthly Expenses
              </p>
              <p className="money text-xl font-semibold">
                {formatMoney(averages.avgTotalExpenses, {
                  currency: currencyCode,
                })}
              </p>
            </div>
            <TrendIndicator trend={averages.trend} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendIndicator({
  trend,
}: {
  trend: 'increasing' | 'decreasing' | 'stable';
}) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', config.className)}>
      <Icon className="size-4" aria-hidden="true" />
      <span>{config.text}</span>
    </div>
  );
}
