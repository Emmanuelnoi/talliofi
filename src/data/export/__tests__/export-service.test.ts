import { describe, it, expect } from 'vitest';
import { exportData } from '../export-service';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { cents } from '@/domain/money';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
} from '@/domain/plan/types';

const PLAN_ID = crypto.randomUUID();

function makePlan(overrides?: Partial<Plan>): Plan {
  return {
    id: PLAN_ID,
    name: 'Test Plan',
    grossIncomeCents: cents(500000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0,
    ...overrides,
  };
}

function makeBucket(overrides?: Partial<BucketAllocation>): BucketAllocation {
  return {
    id: crypto.randomUUID(),
    planId: PLAN_ID,
    name: 'Needs',
    color: '#4A90D9',
    mode: 'percentage',
    targetPercentage: 50,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTaxComponent(overrides?: Partial<TaxComponent>): TaxComponent {
  return {
    id: crypto.randomUUID(),
    planId: PLAN_ID,
    name: 'Federal',
    ratePercent: 22,
    sortOrder: 0,
    ...overrides,
  };
}

function makeExpense(
  bucketId: string,
  overrides?: Partial<ExpenseItem>,
): ExpenseItem {
  return {
    id: crypto.randomUUID(),
    planId: PLAN_ID,
    bucketId,
    name: 'Rent',
    amountCents: cents(150000),
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('exportData', () => {
  it('exports correct JSON structure with all entity types', async () => {
    await planRepo.create(makePlan());
    const bucket = makeBucket();
    await bucketRepo.create(bucket);
    await taxComponentRepo.create(makeTaxComponent());
    await expenseRepo.create(makeExpense(bucket.id));

    const json = await exportData(PLAN_ID);
    const result = JSON.parse(json);

    expect(result.version).toBe(1);
    expect(result.exportedAt).toBeDefined();
    expect(result.plan.id).toBe(PLAN_ID);
    expect(result.plan.name).toBe('Test Plan');
    expect(result.buckets).toHaveLength(1);
    expect(result.taxComponents).toHaveLength(1);
    expect(result.expenses).toHaveLength(1);
    expect(result.snapshots).toHaveLength(0);
  });

  it('includes all entity types in the export', async () => {
    await planRepo.create(makePlan());
    const bucket = makeBucket();
    await bucketRepo.create(bucket);
    await taxComponentRepo.create(makeTaxComponent());
    await expenseRepo.create(makeExpense(bucket.id));

    const json = await exportData(PLAN_ID);
    const result = JSON.parse(json);

    expect(result).toHaveProperty('plan');
    expect(result).toHaveProperty('buckets');
    expect(result).toHaveProperty('taxComponents');
    expect(result).toHaveProperty('expenses');
    expect(result).toHaveProperty('snapshots');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('exportedAt');
  });

  it('handles plan with no expenses or buckets', async () => {
    await planRepo.create(makePlan());

    const json = await exportData(PLAN_ID);
    const result = JSON.parse(json);

    expect(result.plan.id).toBe(PLAN_ID);
    expect(result.buckets).toHaveLength(0);
    expect(result.expenses).toHaveLength(0);
    expect(result.taxComponents).toHaveLength(0);
    expect(result.snapshots).toHaveLength(0);
  });

  it('throws when plan does not exist', async () => {
    await expect(exportData('non-existent-id')).rejects.toThrow(
      'Plan not found',
    );
  });
});
