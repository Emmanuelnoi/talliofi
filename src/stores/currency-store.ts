import { create } from 'zustand';
import { type CurrencyCode, DEFAULT_CURRENCY } from '@/domain/money';

interface CurrencyState {
  currencyCode: CurrencyCode;
  setCurrencyCode: (currencyCode: CurrencyCode) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currencyCode: DEFAULT_CURRENCY,
  setCurrencyCode: (currencyCode) => {
    set({ currencyCode });
  },
}));
