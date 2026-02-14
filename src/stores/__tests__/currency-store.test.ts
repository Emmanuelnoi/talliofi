import { describe, it, expect, beforeEach } from 'vitest';
import { useCurrencyStore } from '../currency-store';

describe('useCurrencyStore', () => {
  beforeEach(() => {
    useCurrencyStore.setState({ currencyCode: 'USD' });
  });

  it('defaults to USD', () => {
    expect(useCurrencyStore.getState().currencyCode).toBe('USD');
  });

  it('sets currency code', () => {
    useCurrencyStore.getState().setCurrencyCode('EUR');
    expect(useCurrencyStore.getState().currencyCode).toBe('EUR');

    useCurrencyStore.getState().setCurrencyCode('GBP');
    expect(useCurrencyStore.getState().currencyCode).toBe('GBP');
  });

  it('can switch back to USD', () => {
    useCurrencyStore.getState().setCurrencyCode('JPY');
    expect(useCurrencyStore.getState().currencyCode).toBe('JPY');

    useCurrencyStore.getState().setCurrencyCode('USD');
    expect(useCurrencyStore.getState().currencyCode).toBe('USD');
  });
});
