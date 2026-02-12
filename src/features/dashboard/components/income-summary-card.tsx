import type { PlanSummary } from '@/domain/plan';
import { formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface IncomeSummaryCardProps {
  summary: PlanSummary;
  className?: string;
}

export function IncomeSummaryCard({
  summary,
  className,
}: IncomeSummaryCardProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Income Summary</CardTitle>
        <CardDescription>Monthly income after estimated tax.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
            Net Income
          </p>
          <p className="money text-3xl font-semibold tracking-tight sm:text-4xl">
            {formatMoney(summary.netMonthlyIncome, {
              currency: currencyCode,
            })}
          </p>
          <p className="text-muted-foreground text-xs">
            After estimated tax and deductions.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
              Gross Income
            </p>
            <p className="money mt-2 text-base font-semibold">
              {formatMoney(summary.grossMonthlyIncome, {
                currency: currencyCode,
              })}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
              Estimated Tax
            </p>
            <p className="money mt-2 text-base font-semibold text-deficit">
              &minus;
              {formatMoney(summary.estimatedTax, {
                currency: currencyCode,
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
