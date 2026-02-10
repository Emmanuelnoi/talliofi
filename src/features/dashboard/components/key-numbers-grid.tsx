import type { PlanSummary } from '@/domain/plan';
import { formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { formatPercent, getMoneyVariant } from '@/lib/format';
import { KeyNumberCard } from './key-number-card';

interface KeyNumbersGridProps {
  summary: PlanSummary;
}

export function KeyNumbersGrid({ summary }: KeyNumbersGridProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const savingsVariant =
    summary.savingsRate > 0
      ? 'positive'
      : summary.savingsRate < 0
        ? 'negative'
        : 'neutral';

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KeyNumberCard
        label="Net Income"
        value={formatMoney(summary.netMonthlyIncome, {
          currency: currencyCode,
        })}
        variant="neutral"
      />
      <KeyNumberCard
        label="Expenses"
        value={formatMoney(summary.totalMonthlyExpenses, {
          currency: currencyCode,
        })}
        variant="neutral"
      />
      <KeyNumberCard
        label="Surplus / Deficit"
        value={formatMoney(summary.surplusOrDeficit, {
          currency: currencyCode,
        })}
        variant={getMoneyVariant(summary.surplusOrDeficit)}
      />
      <KeyNumberCard
        label="Savings Rate"
        value={formatPercent(summary.savingsRate)}
        variant={savingsVariant}
      />
    </div>
  );
}
