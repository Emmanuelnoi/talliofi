import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import { normalizeToMonthly, denormalizeFromMonthly } from './normalize';
import type { Frequency } from './normalize';

describe('normalizeToMonthly()', () => {
  it('converts weekly to monthly (x 52/12)', () => {
    // 100000 * (52/12) = 433333.33... => rounds to 433333
    const result = normalizeToMonthly(cents(100000), 'weekly');
    expect(result).toBe(433333);
  });

  it('converts biweekly to monthly (x 26/12)', () => {
    // 200000 * (26/12) = 433333.33... => rounds to 433333
    const result = normalizeToMonthly(cents(200000), 'biweekly');
    expect(result).toBe(433333);
  });

  it('converts semimonthly to monthly (x 2)', () => {
    const result = normalizeToMonthly(cents(250000), 'semimonthly');
    expect(result).toBe(500000);
  });

  it('keeps monthly unchanged (x 1)', () => {
    const result = normalizeToMonthly(cents(500000), 'monthly');
    expect(result).toBe(500000);
  });

  it('converts quarterly to monthly (x 1/3)', () => {
    // 300000 * (1/3) = 100000
    const result = normalizeToMonthly(cents(300000), 'quarterly');
    expect(result).toBe(100000);
  });

  it('converts annual to monthly (x 1/12)', () => {
    // 1200000 * (1/12) = 100000
    const result = normalizeToMonthly(cents(1200000), 'annual');
    expect(result).toBe(100000);
  });
});

describe('denormalizeFromMonthly()', () => {
  it('converts monthly to weekly (/ 52/12)', () => {
    // 433333 * (12/52) = 99999.92... => rounds to 100000
    const result = denormalizeFromMonthly(cents(433333), 'weekly');
    expect(result).toBe(100000);
  });

  it('converts monthly to biweekly (/ 26/12)', () => {
    // 433333 * (12/26) = 199999.84... => rounds to 200000
    const result = denormalizeFromMonthly(cents(433333), 'biweekly');
    expect(result).toBe(200000);
  });

  it('converts monthly to semimonthly (/ 2)', () => {
    const result = denormalizeFromMonthly(cents(500000), 'semimonthly');
    expect(result).toBe(250000);
  });

  it('keeps monthly unchanged', () => {
    const result = denormalizeFromMonthly(cents(500000), 'monthly');
    expect(result).toBe(500000);
  });

  it('converts monthly to quarterly (* 3)', () => {
    const result = denormalizeFromMonthly(cents(100000), 'quarterly');
    expect(result).toBe(300000);
  });

  it('converts monthly to annual (* 12)', () => {
    const result = denormalizeFromMonthly(cents(100000), 'annual');
    expect(result).toBe(1200000);
  });
});

describe('round-trip normalizeToMonthly -> denormalizeFromMonthly', () => {
  const frequencies: Frequency[] = [
    'weekly',
    'biweekly',
    'semimonthly',
    'monthly',
    'quarterly',
    'annual',
  ];

  for (const freq of frequencies) {
    it(`round-trips ${freq} within 1 cent`, () => {
      const original = cents(123456);
      const monthly = normalizeToMonthly(original, freq);
      const roundTripped = denormalizeFromMonthly(monthly, freq);
      // Allow up to 1 cent rounding tolerance
      expect(Math.abs(roundTripped - original)).toBeLessThanOrEqual(1);
    });
  }
});

describe('zero amount', () => {
  const frequencies: Frequency[] = [
    'weekly',
    'biweekly',
    'semimonthly',
    'monthly',
    'quarterly',
    'annual',
  ];

  for (const freq of frequencies) {
    it(`zero stays zero for ${freq}`, () => {
      expect(normalizeToMonthly(cents(0), freq)).toBe(0);
      expect(denormalizeFromMonthly(cents(0), freq)).toBe(0);
    });
  }
});
