import { Link } from 'react-router';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Landmark,
} from 'lucide-react';
import { formatMoney } from '@/domain/money';
import type { Cents } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NetWorthCardProps {
  totalAssets: Cents;
  totalLiabilities: Cents;
  netWorth: Cents;
}

export function NetWorthCard({
  totalAssets,
  totalLiabilities,
  netWorth,
}: NetWorthCardProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const isPositive = netWorth > 0;
  const isNegative = netWorth < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Landmark
            className="text-muted-foreground size-4"
            aria-hidden="true"
          />
          Net Worth
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/net-worth">
            <ArrowRight className="size-4" />
            <span className="sr-only">View net worth details</span>
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div
            className={cn(
              'text-2xl font-bold tabular-nums',
              isPositive && 'text-emerald-600 dark:text-emerald-400',
              isNegative && 'text-red-600 dark:text-red-400',
            )}
          >
            {formatMoney(netWorth, { currency: currencyCode })}
          </div>
          {isPositive && (
            <TrendingUp
              className="size-4 text-emerald-500"
              aria-label="Positive net worth"
            />
          )}
          {isNegative && (
            <TrendingDown
              className="size-4 text-red-500"
              aria-label="Negative net worth"
            />
          )}
          {!isPositive && !isNegative && (
            <Minus
              className="text-muted-foreground size-4"
              aria-label="Zero net worth"
            />
          )}
        </div>
        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
          <span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatMoney(totalAssets, { currency: currencyCode })}
            </span>{' '}
            assets
          </span>
          <span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {formatMoney(totalLiabilities, { currency: currencyCode })}
            </span>{' '}
            liabilities
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
