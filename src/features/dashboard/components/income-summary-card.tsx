import type { PlanSummary } from '@/domain/plan';
import { formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Gross Income</span>
          <span className="money text-sm font-medium">
            {formatMoney(summary.grossMonthlyIncome, {
              currency: currencyCode,
            })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Estimated Tax</span>
          <span className="money text-destructive text-sm font-medium">
            &minus;
            {formatMoney(summary.estimatedTax, {
              currency: currencyCode,
            })}
          </span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Net Income</span>
          <span className="money text-surplus text-sm font-bold">
            {formatMoney(summary.netMonthlyIncome, {
              currency: currencyCode,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
