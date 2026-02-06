import { describe, it, expect } from 'vitest';
import { parseAndValidateImport, importData } from '../import-service';
import { db } from '@/data/db';
import { cents } from '@/domain/money';
import type { ExportPayload } from '../import-service';

function makeValidPayload(overrides?: Partial<ExportPayload>): ExportPayload {
  const planId = crypto.randomUUID();
  const bucketId = crypto.randomUUID();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    plan: {
      id: planId,
      name: 'Imported Plan',
      grossIncomeCents: cents(600000),
      incomeFrequency: 'monthly',
      taxMode: 'simple',
      taxEffectiveRate: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
    },
    buckets: [
      {
        id: bucketId,
        planId,
        name: 'Needs',
        color: '#4A90D9',
        mode: 'percentage',
        targetPercentage: 50,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    taxComponents: [
      {
        id: crypto.randomUUID(),
        planId,
        name: 'Federal',
        ratePercent: 22,
        sortOrder: 0,
      },
    ],
    expenses: [
      {
        id: crypto.randomUUID(),
        planId,
        bucketId,
        name: 'Rent',
        amountCents: cents(150000),
        frequency: 'monthly',
        category: 'housing',
        isFixed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    snapshots: [],
    ...overrides,
  } as ExportPayload;
}

describe('parseAndValidateImport', () => {
  it('validates correct import data', () => {
    const payload = makeValidPayload();
    const json = JSON.stringify(payload);
    const result = parseAndValidateImport(json);

    expect(result.plan.name).toBe('Imported Plan');
    expect(result.buckets).toHaveLength(1);
    expect(result.expenses).toHaveLength(1);
    expect(result.taxComponents).toHaveLength(1);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseAndValidateImport('not json {')).toThrow('Invalid JSON');
  });

  it('rejects data failing schema validation', () => {
    const invalid = { version: 'not-a-number', plan: {} };
    expect(() => parseAndValidateImport(JSON.stringify(invalid))).toThrow(
      'Validation failed',
    );
  });

  it('rejects empty object', () => {
    expect(() => parseAndValidateImport('{}')).toThrow('Validation failed');
  });

  it('rejects payload with missing required fields', () => {
    const incomplete = {
      version: 1,
      exportedAt: new Date().toISOString(),
      // missing plan, buckets, etc.
    };
    expect(() => parseAndValidateImport(JSON.stringify(incomplete))).toThrow(
      'Validation failed',
    );
  });
});

describe('importData', () => {
  it('imports all entities to Dexie', async () => {
    const payload = makeValidPayload();
    await importData(payload);

    const plans = await db.plans.toArray();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Imported Plan');

    const buckets = await db.buckets.toArray();
    expect(buckets).toHaveLength(1);

    const taxes = await db.taxComponents.toArray();
    expect(taxes).toHaveLength(1);

    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(1);
  });

  it('clears existing data before import', async () => {
    // Pre-populate with some data
    const firstPayload = makeValidPayload();
    await importData(firstPayload);

    // Import different data
    const secondPayload = makeValidPayload({
      plan: {
        ...firstPayload.plan,
        id: crypto.randomUUID(),
        name: 'Second Plan',
      },
      buckets: [],
      taxComponents: [],
      expenses: [],
      snapshots: [],
    } as Partial<ExportPayload>);
    await importData(secondPayload);

    const plans = await db.plans.toArray();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Second Plan');

    const buckets = await db.buckets.toArray();
    expect(buckets).toHaveLength(0);
  });

  it('handles payload with empty arrays', async () => {
    const payload = makeValidPayload({
      buckets: [],
      taxComponents: [],
      expenses: [],
      snapshots: [],
    } as Partial<ExportPayload>);
    await importData(payload);

    const plans = await db.plans.toArray();
    expect(plans).toHaveLength(1);

    const buckets = await db.buckets.toArray();
    expect(buckets).toHaveLength(0);

    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(0);
  });
});
