import { db } from '../db';
import type {
  ExchangeRateRecord,
  ExchangeRates,
  CurrencyCode,
} from '@/domain/money';
import { handleDexieWriteError } from './handle-dexie-error';

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
      handleDexieWriteError(error, 'Exchange rate', record.id);
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
