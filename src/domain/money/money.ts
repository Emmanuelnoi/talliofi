/**
 * Money is represented as integer cents to avoid floating-point issues.
 * Branded type prevents accidental mixing with regular numbers.
 */
import type { CurrencyCode } from './currency';
export type Cents = number & { readonly __brand: 'Cents' };

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Invalid cents value: ${value}`);
  }
  return value as Cents;
}

/**
 * Creates a non-negative Cents value. Use for income/expense amounts
 * where negative values are semantically invalid.
 */
export function nonNegativeCents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid non-negative cents value: ${value}`);
  }
  return value as Cents;
}

export function dollarsToCents(dollars: number): Cents {
  return cents(Math.round(dollars * 100));
}

export function centsToDollars(amount: Cents): number {
  return amount / 100;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(
  amount: Cents,
  options: { locale?: string; currency: CurrencyCode },
): string {
  const { locale = 'en-US', currency } = options;
  const key = `${locale}:${currency}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    });
    formatterCache.set(key, formatter);
  }
  return formatter.format(centsToDollars(amount));
}

// Arithmetic
export const addMoney = (a: Cents, b: Cents): Cents => cents(a + b);
export const subtractMoney = (a: Cents, b: Cents): Cents => cents(a - b);
export const multiplyMoney = (amount: Cents, factor: number): Cents =>
  cents(Math.round(amount * factor));
export const divideMoney = (amount: Cents, divisor: number): Cents =>
  cents(Math.round(amount / divisor));
export const percentOf = (amount: Cents, percent: number): Cents =>
  cents(Math.round(amount * (percent / 100)));
export const sumMoney = (amounts: readonly Cents[]): Cents =>
  amounts.reduce((sum, amt) => addMoney(sum, amt), cents(0));
