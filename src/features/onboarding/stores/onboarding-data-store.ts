import { create } from 'zustand';
import type {
  IncomeFormData,
  TaxFormData,
  BucketFormData,
  ExpenseFormData,
  OnboardingData,
} from '../types';

interface OnboardingDataState {
  income: IncomeFormData;
  tax: TaxFormData;
  buckets: BucketFormData[];
  expenses: ExpenseFormData[];
  setIncome: (data: IncomeFormData) => void;
  setTax: (data: TaxFormData) => void;
  setBuckets: (data: BucketFormData[]) => void;
  setExpenses: (data: ExpenseFormData[]) => void;
  getData: () => OnboardingData;
  reset: () => void;
}

const DEFAULT_BUCKETS: BucketFormData[] = [
  {
    name: 'Essentials',
    color: '#4A90D9',
    mode: 'percentage',
    targetPercentage: 50,
  },
  {
    name: 'Wants',
    color: '#50C878',
    mode: 'percentage',
    targetPercentage: 30,
  },
  {
    name: 'Savings',
    color: '#FFB347',
    mode: 'percentage',
    targetPercentage: 20,
  },
];

const INITIAL_INCOME: IncomeFormData = {
  grossIncomeDollars: 0,
  incomeFrequency: 'monthly',
};

const INITIAL_TAX: TaxFormData = {
  effectiveRate: 25,
};

export const useOnboardingDataStore = create<OnboardingDataState>(
  (set, get) => ({
    income: INITIAL_INCOME,
    tax: INITIAL_TAX,
    buckets: DEFAULT_BUCKETS,
    expenses: [],

    setIncome: (data) => set({ income: data }),
    setTax: (data) => set({ tax: data }),
    setBuckets: (data) => set({ buckets: data }),
    setExpenses: (data) => set({ expenses: data }),

    getData: () => {
      const state = get();
      return {
        income: state.income,
        tax: state.tax,
        buckets: state.buckets,
        expenses: state.expenses,
      };
    },

    reset: () =>
      set({
        income: INITIAL_INCOME,
        tax: INITIAL_TAX,
        buckets: DEFAULT_BUCKETS,
        expenses: [],
      }),
  }),
);
