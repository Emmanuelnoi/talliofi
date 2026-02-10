import type { Cents } from './money';
import { cents } from './money';
import type { CurrencyCode, ExchangeRates } from './currency';

function resolveRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rates?: ExchangeRates,
): number | null {
  if (!rates) return null;
  if (from === to) return 1;

  const base = rates.baseCurrency;

  if (from === base) {
    return rates.rates[to] ?? null;
  }

  if (to === base) {
    const rate = rates.rates[from];
    return rate ? 1 / rate : null;
  }

  const fromToBase = resolveRate(from, base, rates);
  const baseToTarget = resolveRate(base, to, rates);
  if (!fromToBase || !baseToTarget) return null;
  return fromToBase * baseToTarget;
}

export function convertCents(
  amount: Cents,
  from: CurrencyCode,
  to: CurrencyCode,
  rates?: ExchangeRates,
): Cents {
  if (from === to) return amount;
  const rate = resolveRate(from, to, rates);
  if (!rate) return amount;
  return cents(Math.round((amount as number) * rate));
}
