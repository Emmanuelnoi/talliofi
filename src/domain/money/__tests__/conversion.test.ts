import { describe, it, expect } from 'vitest';
import { convertCents } from '../conversion';
import { cents } from '../money';
import type { ExchangeRates } from '../currency';

const rates: ExchangeRates = {
  baseCurrency: 'USD',
  rates: { EUR: 0.92, GBP: 0.79, JPY: 150.5 },
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('convertCents', () => {
  it('returns same amount when from === to', () => {
    expect(convertCents(cents(1000), 'USD', 'USD', rates)).toBe(1000);
  });

  it('converts from base currency to target', () => {
    // 1000 cents USD * 0.92 = 920 cents EUR
    expect(convertCents(cents(1000), 'USD', 'EUR', rates)).toBe(920);
  });

  it('converts from target currency to base', () => {
    // 920 cents EUR / 0.92 = 1000 cents USD
    expect(convertCents(cents(920), 'EUR', 'USD', rates)).toBe(1000);
  });

  it('converts cross-rate (non-base to non-base)', () => {
    // EUR -> USD -> GBP: 1000 EUR / 0.92 * 0.79 ≈ 859 GBP
    const result = convertCents(cents(1000), 'EUR', 'GBP', rates);
    expect(result).toBeGreaterThan(850);
    expect(result).toBeLessThan(870);
  });

  it('returns original amount when rate is not found', () => {
    expect(convertCents(cents(1000), 'USD', 'CAD', rates)).toBe(1000);
  });

  it('returns original amount when rates are undefined', () => {
    expect(convertCents(cents(1000), 'USD', 'EUR')).toBe(1000);
  });
});
