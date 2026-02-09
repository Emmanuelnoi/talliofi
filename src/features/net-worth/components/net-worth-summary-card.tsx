import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMoney } from '@/domain/money';
import type { Cents } from '@/domain/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NetWorthSummaryCardProps {
  totalAssets: Cents;
  totalLiabilities: Cents;
  netWorth: Cents;
  className?: string;
}

export function NetWorthSummaryCard({
  totalAssets,
  totalLiabilities,
  netWorth,
  className,
}: NetWorthSummaryCardProps) {
  const isPositive = netWorth > 0;
  const isNegative = netWorth < 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Net Worth
          {isPositive && (
            <TrendingUp
              className="size-5 text-emerald-500"
              aria-hidden="true"
            />
          )}
          {isNegative && (
            <TrendingDown className="size-5 text-red-500" aria-hidden="true" />
          )}
          {!isPositive && !isNegative && (
            <Minus
              className="text-muted-foreground size-5"
              aria-hidden="true"
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Net Worth Display */}
          <div
            className={cn(
              'text-3xl font-bold tabular-nums',
              isPositive && 'text-emerald-600 dark:text-emerald-400',
              isNegative && 'text-red-600 dark:text-red-400',
            )}
          >
            {formatMoney(netWorth)}
          </div>

          {/* Asset/Liability Breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-muted-foreground text-sm">Total Assets</p>
              <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMoney(totalAssets)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total Liabilities</p>
              <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                {formatMoney(totalLiabilities)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
