import Dexie from 'dexie';
import { db } from '../db';
import type {
  ExchangeRateRecord,
  ExchangeRates,
  CurrencyCode,
} from '@/domain/money';

const DEFAULT_ID = 'default';

export const exchangeRateRepo = {
  async getByPlanId(planId: string): Promise<ExchangeRateRecord | null> {
    const record = await db.exchangeRates
      .where('planId')
      .equals(planId)
      .first();
    return record ?? null;
  },

  async upsert(record: ExchangeRateRecord): Promise<ExchangeRateRecord> {
    try {
      await db.exchangeRates.put(record);
    } catch (error) {
      if (error instanceof Dexie.QuotaExceededError) {
        throw new Error(
          'Storage quota exceeded. Please free up space or export your data.',
        );
      }
      throw error;
    }
    return record;
  },

  async upsertForPlan(
    planId: string,
    baseCurrency: CurrencyCode,
    rates: ExchangeRates['rates'],
  ): Promise<ExchangeRateRecord> {
    const record: ExchangeRateRecord = {
      id: `${DEFAULT_ID}-${planId}`,
      planId,
      baseCurrency,
      rates,
      updatedAt: new Date().toISOString(),
    };
    return this.upsert(record);
  },
};
