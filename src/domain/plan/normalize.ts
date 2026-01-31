import type { Cents } from '@/domain/money';
import { multiplyMoney } from '@/domain/money';

export type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'quarterly'
  | 'annual';

const MONTHLY_FACTORS: Record<Frequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

export function normalizeToMonthly(amount: Cents, frequency: Frequency): Cents {
  return multiplyMoney(amount, MONTHLY_FACTORS[frequency]);
}

export function denormalizeFromMonthly(
  monthlyAmount: Cents,
  targetFrequency: Frequency,
): Cents {
  return multiplyMoney(monthlyAmount, 1 / MONTHLY_FACTORS[targetFrequency]);
}
