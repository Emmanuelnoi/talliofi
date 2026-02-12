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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NetWorthCardProps {
  totalAssets: Cents;
  totalLiabilities: Cents;
  netWorth: Cents;
  className?: string;
}

export function NetWorthCard({
  totalAssets,
  totalLiabilities,
  netWorth,
  className,
}: NetWorthCardProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const isPositive = netWorth > 0;
  const isNegative = netWorth < 0;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
            <Landmark className="size-4" aria-hidden="true" />
            Net Worth
          </div>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>Assets minus liabilities.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/net-worth">
            <ArrowRight className="size-4" aria-hidden="true" />
            <span className="sr-only">View net worth details</span>
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'text-2xl font-semibold tabular-nums tracking-tight',
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
              Assets
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatMoney(totalAssets, { currency: currencyCode })}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
              Liabilities
            </p>
            <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
              {formatMoney(totalLiabilities, { currency: currencyCode })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
