import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExpenseDonutChart } from '../ExpenseDonutChart';
import { cents, formatMoney, DEFAULT_CURRENCY } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';

describe('ExpenseDonutChart', () => {
  it('renders title, subtitle, and total', () => {
    useCurrencyStore.setState({ currencyCode: DEFAULT_CURRENCY });
    const data = [
      {
        category: 'housing',
        label: 'House & Utilities',
        valueCents: cents(840000),
      },
      {
        category: 'transport',
        label: 'Transport',
        valueCents: cents(130000),
      },
    ];
    const total = data.reduce((sum, item) => sum + item.valueCents, 0);

    render(<ExpenseDonutChart data={data} />);

    expect(screen.getByText('Yearly Expense')).toBeInTheDocument();
    expect(screen.getByText('Breakdown by Category')).toBeInTheDocument();
    expect(
      screen.getByText(formatMoney(total, { currency: DEFAULT_CURRENCY })),
    ).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<ExpenseDonutChart data={[]} />);

    expect(screen.getByText('No expenses recorded')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Start by adding a transaction to see your spending patterns here.',
      ),
    ).toBeInTheDocument();
  });
});
