import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingDataStore } from '../onboarding-data-store';

describe('useOnboardingDataStore', () => {
  beforeEach(() => {
    useOnboardingDataStore.getState().reset();
  });

  it('initializes with default buckets', () => {
    const { buckets } = useOnboardingDataStore.getState();
    expect(buckets).toHaveLength(3);
    expect(buckets[0].name).toBe('Essentials');
    expect(buckets[1].name).toBe('Wants');
    expect(buckets[2].name).toBe('Savings');
  });

  it('initializes with default income values', () => {
    const { income } = useOnboardingDataStore.getState();
    expect(income.grossIncomeDollars).toBe(0);
    expect(income.incomeFrequency).toBe('monthly');
  });

  it('initializes with default tax rate', () => {
    const { tax } = useOnboardingDataStore.getState();
    expect(tax.effectiveRate).toBe(25);
  });

  it('initializes with empty expenses', () => {
    const { expenses } = useOnboardingDataStore.getState();
    expect(expenses).toHaveLength(0);
  });

  it('stores and retrieves income data', () => {
    useOnboardingDataStore.getState().setIncome({
      grossIncomeDollars: 5000,
      incomeFrequency: 'biweekly',
    });

    const { income } = useOnboardingDataStore.getState();
    expect(income.grossIncomeDollars).toBe(5000);
    expect(income.incomeFrequency).toBe('biweekly');
  });

  it('stores and retrieves tax data', () => {
    useOnboardingDataStore.getState().setTax({ effectiveRate: 30 });

    const { tax } = useOnboardingDataStore.getState();
    expect(tax.effectiveRate).toBe(30);
  });

  it('stores and retrieves buckets data', () => {
    const customBuckets = [
      {
        name: 'Housing',
        color: '#FF0000',
        mode: 'fixed' as const,
        targetAmountDollars: 1500,
      },
    ];
    useOnboardingDataStore.getState().setBuckets(customBuckets);

    const { buckets } = useOnboardingDataStore.getState();
    expect(buckets).toHaveLength(1);
    expect(buckets[0].name).toBe('Housing');
  });

  it('stores and retrieves expenses data', () => {
    const expenses = [
      {
        name: 'Rent',
        amountDollars: 1200,
        frequency: 'monthly' as const,
        category: 'housing' as const,
        bucketId: 'Essentials',
        isFixed: true,
      },
    ];
    useOnboardingDataStore.getState().setExpenses(expenses);

    const state = useOnboardingDataStore.getState();
    expect(state.expenses).toHaveLength(1);
    expect(state.expenses[0].name).toBe('Rent');
  });

  it('getData returns all current state', () => {
    useOnboardingDataStore.getState().setIncome({
      grossIncomeDollars: 6000,
      incomeFrequency: 'monthly',
    });
    useOnboardingDataStore.getState().setTax({ effectiveRate: 22 });

    const data = useOnboardingDataStore.getState().getData();
    expect(data.income.grossIncomeDollars).toBe(6000);
    expect(data.tax.effectiveRate).toBe(22);
    expect(data.buckets).toHaveLength(3);
    expect(data.expenses).toHaveLength(0);
  });

  it('reset restores all defaults', () => {
    useOnboardingDataStore.getState().setIncome({
      grossIncomeDollars: 10000,
      incomeFrequency: 'annual',
    });
    useOnboardingDataStore.getState().setTax({ effectiveRate: 40 });
    useOnboardingDataStore.getState().setBuckets([]);
    useOnboardingDataStore.getState().setExpenses([
      {
        name: 'Test',
        amountDollars: 100,
        frequency: 'monthly',
        category: 'other',
        bucketId: '',
        isFixed: false,
      },
    ]);

    useOnboardingDataStore.getState().reset();

    const state = useOnboardingDataStore.getState();
    expect(state.income.grossIncomeDollars).toBe(0);
    expect(state.income.incomeFrequency).toBe('monthly');
    expect(state.tax.effectiveRate).toBe(25);
    expect(state.buckets).toHaveLength(3);
    expect(state.expenses).toHaveLength(0);
  });
});
