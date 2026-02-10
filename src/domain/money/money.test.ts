import { describe, it, expect } from 'vitest';
import {
  cents,
  dollarsToCents,
  centsToDollars,
  formatMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  percentOf,
  sumMoney,
} from '@/domain/money';

describe('cents()', () => {
  it('creates a Cents value from a valid integer', () => {
    const result = cents(500);
    expect(result).toBe(500);
  });

  it('accepts zero', () => {
    expect(cents(0)).toBe(0);
  });

  it('accepts negative integers', () => {
    expect(cents(-100)).toBe(-100);
  });

  it('throws on a float', () => {
    expect(() => cents(10.5)).toThrow('Invalid cents value');
  });

  it('throws on NaN', () => {
    expect(() => cents(NaN)).toThrow('Invalid cents value');
  });

  it('throws on Infinity', () => {
    expect(() => cents(Infinity)).toThrow('Invalid cents value');
  });

  it('throws beyond MAX_SAFE_INTEGER', () => {
    expect(() => cents(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      'Invalid cents value',
    );
  });
});

describe('dollarsToCents()', () => {
  it('converts a basic dollar amount', () => {
    expect(dollarsToCents(10)).toBe(1000);
  });

  it('handles rounding for common values like 19.99', () => {
    expect(dollarsToCents(19.99)).toBe(1999);
  });

  it('converts zero', () => {
    expect(dollarsToCents(0)).toBe(0);
  });

  it('converts negative dollar amounts', () => {
    expect(dollarsToCents(-5.5)).toBe(-550);
  });
});

describe('centsToDollars()', () => {
  it('converts cents to dollars', () => {
    expect(centsToDollars(cents(1500))).toBe(15);
  });

  it('converts zero', () => {
    expect(centsToDollars(cents(0))).toBe(0);
  });
});

describe('formatMoney()', () => {
  it('formats with default locale (en-US) when currency is provided', () => {
    const result = formatMoney(cents(150099), { currency: 'USD' });
    expect(result).toBe('$1,500.99');
  });

  it('accepts a custom locale', () => {
    const result = formatMoney(cents(150099), {
      currency: 'USD',
      locale: 'de-DE',
    });
    // German locale uses period for thousands and comma for decimals
    expect(result).toContain('1.500,99');
  });

  it('accepts a custom currency', () => {
    const result = formatMoney(cents(150099), { currency: 'EUR' });
    // Should contain the euro symbol or EUR
    expect(result).toContain('1,500.99');
  });
});

describe('addMoney()', () => {
  it('adds two positive amounts', () => {
    expect(addMoney(cents(300), cents(200))).toBe(500);
  });

  it('adds with negatives', () => {
    expect(addMoney(cents(300), cents(-100))).toBe(200);
  });

  it('adds zero + zero', () => {
    expect(addMoney(cents(0), cents(0))).toBe(0);
  });
});

describe('subtractMoney()', () => {
  it('subtracts two amounts', () => {
    expect(subtractMoney(cents(500), cents(200))).toBe(300);
  });

  it('produces negative result when second is larger', () => {
    expect(subtractMoney(cents(100), cents(500))).toBe(-400);
  });
});

describe('multiplyMoney()', () => {
  it('multiplies by an integer', () => {
    expect(multiplyMoney(cents(300), 3)).toBe(900);
  });

  it('multiplies by a fraction and rounds', () => {
    // 333 * 0.5 = 166.5 => rounds to 167
    expect(multiplyMoney(cents(333), 0.5)).toBe(167);
  });

  it('multiplies by zero', () => {
    expect(multiplyMoney(cents(500), 0)).toBe(0);
  });
});

describe('divideMoney()', () => {
  it('divides evenly', () => {
    expect(divideMoney(cents(900), 3)).toBe(300);
  });

  it('rounds the result', () => {
    // 1000 / 3 = 333.33... => rounds to 333
    expect(divideMoney(cents(1000), 3)).toBe(333);
  });

  it('throws on divide by zero (NaN is not a safe integer)', () => {
    expect(() => divideMoney(cents(100), 0)).toThrow('Invalid cents value');
  });
});

describe('percentOf()', () => {
  it('computes 50% of 10000', () => {
    expect(percentOf(cents(10000), 50)).toBe(5000);
  });

  it('computes 0%', () => {
    expect(percentOf(cents(10000), 0)).toBe(0);
  });

  it('computes 100%', () => {
    expect(percentOf(cents(10000), 100)).toBe(10000);
  });

  it('handles fractional percent', () => {
    // 10000 * (33.33 / 100) = 3333
    expect(percentOf(cents(10000), 33.33)).toBe(3333);
  });
});

describe('sumMoney()', () => {
  it('returns 0 for empty array', () => {
    expect(sumMoney([])).toBe(0);
  });

  it('sums multiple values', () => {
    expect(sumMoney([cents(100), cents(200), cents(300)])).toBe(600);
  });

  it('returns the single value for a one-element array', () => {
    expect(sumMoney([cents(42)])).toBe(42);
  });
});

describe('overflow protection', () => {
  it('addMoney throws when result exceeds MAX_SAFE_INTEGER', () => {
    const large = cents(Number.MAX_SAFE_INTEGER - 1);
    expect(() => addMoney(large, cents(2))).toThrow('Invalid cents value');
  });

  it('multiplyMoney throws when result exceeds safe range', () => {
    const large = cents(Number.MAX_SAFE_INTEGER);
    expect(() => multiplyMoney(large, 2)).toThrow('Invalid cents value');
  });
});
