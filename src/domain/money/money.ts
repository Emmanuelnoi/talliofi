/**
 * Money is represented as integer cents to avoid floating-point issues.
 * Branded type prevents accidental mixing with regular numbers.
 */
export type Cents = number & { readonly __brand: 'Cents' };

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Invalid cents value: ${value}`);
  }
  return value as Cents;
}

export function dollarsToCents(dollars: number): Cents {
  return cents(Math.round(dollars * 100));
}

export function centsToDollars(amount: Cents): number {
  return amount / 100;
}

export function formatMoney(
  amount: Cents,
  options: { locale?: string; currency?: string } = {},
): string {
  const { locale = 'en-US', currency = 'USD' } = options;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(centsToDollars(amount));
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
