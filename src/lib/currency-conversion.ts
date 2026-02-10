import type { CurrencyCode, ExchangeRates, Cents } from '@/domain/money';
import { convertCents } from '@/domain/money';
import type { ExpenseItem, ExpenseSplit } from '@/domain/plan';

function resolveExpenseCurrency(
  expense: ExpenseItem,
  baseCurrency: CurrencyCode,
): CurrencyCode {
  return expense.currencyCode ?? baseCurrency;
}

function convertSplitAmounts(
  splits: readonly ExpenseSplit[] | undefined,
  from: CurrencyCode,
  to: CurrencyCode,
  rates?: ExchangeRates,
): readonly ExpenseSplit[] | undefined {
  if (!splits) return undefined;
  return splits.map((split) => ({
    ...split,
    amountCents: convertCents(split.amountCents, from, to, rates),
  }));
}

export function convertExpenseToBase(
  expense: ExpenseItem,
  baseCurrency: CurrencyCode,
  rates?: ExchangeRates,
): ExpenseItem {
  const fromCurrency = resolveExpenseCurrency(expense, baseCurrency);
  if (fromCurrency === baseCurrency) return expense;

  return {
    ...expense,
    amountCents: convertCents(
      expense.amountCents as Cents,
      fromCurrency,
      baseCurrency,
      rates,
    ),
    splits: convertSplitAmounts(
      expense.splits,
      fromCurrency,
      baseCurrency,
      rates,
    ),
  };
}

export function convertExpensesToBase(
  expenses: readonly ExpenseItem[],
  baseCurrency: CurrencyCode,
  rates?: ExchangeRates,
): ExpenseItem[] {
  if (expenses.length === 0) return [];
  return expenses.map((expense) =>
    convertExpenseToBase(expense, baseCurrency, rates),
  );
}
