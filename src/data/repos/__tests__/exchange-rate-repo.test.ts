import { describe, it, expect } from 'vitest';
import type { ExchangeRateRecord, CurrencyCode } from '@/domain/money';
import { exchangeRateRepo } from '../exchange-rate-repo';

function makeValidRecord(
  overrides: Partial<ExchangeRateRecord> = {},
): ExchangeRateRecord {
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    baseCurrency: 'USD' as CurrencyCode,
    rates: { EUR: 0.85, GBP: 0.73 },
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('exchangeRateRepo', () => {
  describe('upsert()', () => {
    it('inserts and returns a record', async () => {
      const record = makeValidRecord();
      const result = await exchangeRateRepo.upsert(record);

      expect(result.id).toBe(record.id);
      expect(result.baseCurrency).toBe('USD');
    });

    it('updates an existing record when called with the same id', async () => {
      const record = makeValidRecord();
      await exchangeRateRepo.upsert(record);

      const updated = { ...record, rates: { EUR: 0.9 } };
      await exchangeRateRepo.upsert(updated);

      const result = await exchangeRateRepo.getByPlanId(record.planId);
      expect(result).not.toBeNull();
      expect(result!.rates).toEqual({ EUR: 0.9 });
    });
  });

  describe('getByPlanId()', () => {
    it('returns the record for a plan', async () => {
      const planId = crypto.randomUUID();
      const record = makeValidRecord({ planId });
      await exchangeRateRepo.upsert(record);

      const result = await exchangeRateRepo.getByPlanId(planId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(record.id);
      expect(result!.planId).toBe(planId);
    });

    it('returns null when no record exists', async () => {
      const result = await exchangeRateRepo.getByPlanId(crypto.randomUUID());
      expect(result).toBeNull();
    });
  });

  describe('upsertForPlan()', () => {
    it('creates a record with a deterministic id', async () => {
      const planId = crypto.randomUUID();
      const rates = { EUR: 0.85, GBP: 0.73 } as Partial<
        Record<CurrencyCode, number>
      >;

      const result = await exchangeRateRepo.upsertForPlan(
        planId,
        'USD' as CurrencyCode,
        rates,
      );

      expect(result.id).toBe(`default-${planId}`);
      expect(result.planId).toBe(planId);
      expect(result.baseCurrency).toBe('USD');
      expect(result.rates).toEqual(rates);
      expect(result.updatedAt).toBeDefined();
    });

    it('overwrites previous record on subsequent calls', async () => {
      const planId = crypto.randomUUID();
      const ratesA = { EUR: 0.85 } as Partial<Record<CurrencyCode, number>>;
      const ratesB = { EUR: 0.92 } as Partial<Record<CurrencyCode, number>>;

      await exchangeRateRepo.upsertForPlan(
        planId,
        'USD' as CurrencyCode,
        ratesA,
      );
      await exchangeRateRepo.upsertForPlan(
        planId,
        'EUR' as CurrencyCode,
        ratesB,
      );

      const result = await exchangeRateRepo.getByPlanId(planId);
      expect(result).not.toBeNull();
      expect(result!.baseCurrency).toBe('EUR');
      expect(result!.rates).toEqual(ratesB);
    });
  });
});
