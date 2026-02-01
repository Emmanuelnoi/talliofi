import type { Cents } from '@/domain/money';

/**
 * Formats a number as a percentage string.
 * @param value - The numeric value (e.g. 23.456)
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted string, e.g. "23.5%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Determines the display variant based on whether a money amount is positive, negative, or zero. */
export function getMoneyVariant(
  amount: Cents,
): 'positive' | 'negative' | 'neutral' {
  if (amount > 0) return 'positive';
  if (amount < 0) return 'negative';
  return 'neutral';
}
