import type { Cents } from './money';
import { cents } from './money';
import type { CurrencyCode, ExchangeRates } from './currency';
import { logger } from '@/lib/logger';

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

export interface ConversionResult {
  readonly amount: Cents;
  /** Whether the amount was actually converted using a real exchange rate */
  readonly converted: boolean;
}

export function convertCents(
  amount: Cents,
  from: CurrencyCode,
  to: CurrencyCode,
  rates?: ExchangeRates,
): Cents {
  if (from === to) return amount;
  const rate = resolveRate(from, to, rates);
  if (!rate) {
    logger.warn(
      'convertCents',
      `Missing exchange rate for ${from} → ${to}; returning original amount`,
    );
    return amount;
  }
  return cents(Math.round((amount as number) * rate));
}

/**
 * Converts cents between currencies and indicates whether a real rate was used.
 * Use this when callers need to distinguish converted vs unconverted amounts.
 */
export function convertCentsTagged(
  amount: Cents,
  from: CurrencyCode,
  to: CurrencyCode,
  rates?: ExchangeRates,
): ConversionResult {
  if (from === to) return { amount, converted: true };
  const rate = resolveRate(from, to, rates);
  if (!rate) return { amount, converted: false };
  return {
    amount: cents(Math.round((amount as number) * rate)),
    converted: true,
  };
}
