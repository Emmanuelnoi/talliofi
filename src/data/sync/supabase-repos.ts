import { supabase } from '@/lib/supabase';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  MonthlySnapshot,
} from '@/domain/plan/types';

/**
 * Column-name mapping helpers: camelCase (client) <-> snake_case (Postgres).
 * We apply these transformations at the boundary so the rest of the app
 * remains camelCase-only.
 */

// --- Generic helpers ---

function toSnake(obj: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

function toCamel<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, ch: string) =>
      ch.toUpperCase(),
    );
    result[camelKey] = value;
  }
  return result as T;
}

function assertClient(): NonNullable<typeof supabase> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

// --- Plan ---

export const supabasePlanRepo = {
  async getActive(): Promise<Plan | undefined> {
    const client = assertClient();
    const { data, error } = await client
      .from('plans')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    if (error || !data) return undefined;
    return toCamel<Plan>(data);
  },

  async getById(id: string): Promise<Plan | undefined> {
    const client = assertClient();
    const { data, error } = await client
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return toCamel<Plan>(data);
  },

  async create(plan: Plan): Promise<Plan> {
    const client = assertClient();
    const { error } = await client.from('plans').insert(toSnake(plan));
    if (error) throw new Error(`Failed to create plan: ${error.message}`);
    return plan;
  },

  async update(plan: Plan): Promise<Plan> {
    const client = assertClient();
    const { error } = await client
      .from('plans')
      .update(toSnake(plan))
      .eq('id', plan.id);
    if (error) throw new Error(`Failed to update plan: ${error.message}`);
    return plan;
  },

  async delete(id: string): Promise<void> {
    const client = assertClient();
    const { error } = await client.from('plans').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete plan: ${error.message}`);
  },

  setActivePlanId(planId: string): void {
    void planId;
    // No-op for Supabase — active plan is determined server-side
  },

  async getAll(): Promise<Plan[]> {
    const client = assertClient();
    const { data, error } = await client
      .from('plans')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Failed to fetch plans: ${error.message}`);
    return (data ?? []).map((row) => toCamel<Plan>(row));
  },

  async duplicate(planId: string, newName: string): Promise<Plan> {
    const plan = await supabasePlanRepo.getById(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    const now = new Date().toISOString();
    const newPlan: Plan = {
      ...plan,
      id: crypto.randomUUID(),
      name: newName,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };

    await supabasePlanRepo.create(newPlan);
    return newPlan;
  },
};

// --- Bucket ---

export const supabaseBucketRepo = {
  async getByPlanId(planId: string): Promise<BucketAllocation[]> {
    const client = assertClient();
    const { data, error } = await client
      .from('buckets')
      .select('*')
      .eq('plan_id', planId)
      .order('sort_order', { ascending: true });
    if (error) throw new Error(`Failed to fetch buckets: ${error.message}`);
    return (data ?? []).map((row) => toCamel<BucketAllocation>(row));
  },

  async create(bucket: BucketAllocation): Promise<BucketAllocation> {
    const client = assertClient();
    const { error } = await client.from('buckets').insert(toSnake(bucket));
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    return bucket;
  },

  async update(bucket: BucketAllocation): Promise<BucketAllocation> {
    const client = assertClient();
    const { error } = await client
      .from('buckets')
      .update(toSnake(bucket))
      .eq('id', bucket.id);
    if (error) throw new Error(`Failed to update bucket: ${error.message}`);
    return bucket;
  },

  async delete(id: string): Promise<void> {
    const client = assertClient();
    const { error } = await client.from('buckets').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete bucket: ${error.message}`);
  },
};

// --- Tax Component ---

export const supabaseTaxComponentRepo = {
  async getByPlanId(planId: string): Promise<TaxComponent[]> {
    const client = assertClient();
    const { data, error } = await client
      .from('tax_components')
      .select('*')
      .eq('plan_id', planId)
      .order('sort_order', { ascending: true });
    if (error)
      throw new Error(`Failed to fetch tax components: ${error.message}`);
    return (data ?? []).map((row) => toCamel<TaxComponent>(row));
  },

  async create(component: TaxComponent): Promise<TaxComponent> {
    const client = assertClient();
    const { error } = await client
      .from('tax_components')
      .insert(toSnake(component));
    if (error)
      throw new Error(`Failed to create tax component: ${error.message}`);
    return component;
  },

  async update(component: TaxComponent): Promise<TaxComponent> {
    const client = assertClient();
    const { error } = await client
      .from('tax_components')
      .update(toSnake(component))
      .eq('id', component.id);
    if (error)
      throw new Error(`Failed to update tax component: ${error.message}`);
    return component;
  },

  async delete(id: string): Promise<void> {
    const client = assertClient();
    const { error } = await client.from('tax_components').delete().eq('id', id);
    if (error)
      throw new Error(`Failed to delete tax component: ${error.message}`);
  },
};

// --- Expense ---

export const supabaseExpenseRepo = {
  async getByPlanId(planId: string): Promise<ExpenseItem[]> {
    const client = assertClient();
    const { data, error } = await client
      .from('expenses')
      .select('*')
      .eq('plan_id', planId);
    if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);
    return (data ?? []).map((row) => toCamel<ExpenseItem>(row));
  },

  async getByBucketId(bucketId: string): Promise<ExpenseItem[]> {
    const client = assertClient();
    const { data, error } = await client
      .from('expenses')
      .select('*')
      .eq('bucket_id', bucketId);
    if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);
    return (data ?? []).map((row) => toCamel<ExpenseItem>(row));
  },

  async create(expense: ExpenseItem): Promise<ExpenseItem> {
    const client = assertClient();
    const { error } = await client.from('expenses').insert(toSnake(expense));
    if (error) throw new Error(`Failed to create expense: ${error.message}`);
    return expense;
  },

  async update(expense: ExpenseItem): Promise<ExpenseItem> {
    const client = assertClient();
    const { error } = await client
      .from('expenses')
      .update(toSnake(expense))
      .eq('id', expense.id);
    if (error) throw new Error(`Failed to update expense: ${error.message}`);
    return expense;
  },

  async bulkUpdate(expenses: ExpenseItem[]): Promise<ExpenseItem[]> {
    if (expenses.length === 0) return [];
    const client = assertClient();
    const now = new Date().toISOString();
    const updates = expenses.map((expense) => ({
      ...expense,
      updatedAt: now,
    }));
    const { error } = await client.from('expenses').upsert(
      updates.map((expense) => toSnake(expense)),
      {
        onConflict: 'id',
      },
    );
    if (error)
      throw new Error(`Failed to bulk update expenses: ${error.message}`);
    return updates;
  },

  async delete(id: string): Promise<void> {
    const client = assertClient();
    const { error } = await client.from('expenses').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete expense: ${error.message}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const client = assertClient();
    const { error } = await client.from('expenses').delete().in('id', ids);
    if (error) throw new Error(`Failed to delete expenses: ${error.message}`);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    const client = assertClient();
    const { error } = await client
      .from('expenses')
      .delete()
      .eq('plan_id', planId);
    if (error) throw new Error(`Failed to delete expenses: ${error.message}`);
  },
};

// --- Snapshot ---

export const supabaseSnapshotRepo = {
  async getByPlanId(planId: string): Promise<MonthlySnapshot[]> {
    const client = assertClient();
    const { data, error } = await client
      .from('snapshots')
      .select('*')
      .eq('plan_id', planId)
      .order('year_month', { ascending: true });
    if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`);
    return (data ?? []).map((row) => {
      const snapshot = toCamel<MonthlySnapshot>(row);
      // bucket_summaries is stored as JSONB, already camelCase within
      return snapshot;
    });
  },

  async getByPlanAndMonth(
    planId: string,
    yearMonth: string,
  ): Promise<MonthlySnapshot | undefined> {
    const client = assertClient();
    const { data, error } = await client
      .from('snapshots')
      .select('*')
      .eq('plan_id', planId)
      .eq('year_month', yearMonth)
      .single();
    if (error || !data) return undefined;
    return toCamel<MonthlySnapshot>(data);
  },

  async upsert(snapshot: MonthlySnapshot): Promise<void> {
    const client = assertClient();
    const { error } = await client.from('snapshots').upsert(toSnake(snapshot), {
      onConflict: 'plan_id,year_month',
    });
    if (error) throw new Error(`Failed to upsert snapshot: ${error.message}`);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    const client = assertClient();
    const { error } = await client
      .from('snapshots')
      .delete()
      .eq('plan_id', planId);
    if (error) throw new Error(`Failed to delete snapshots: ${error.message}`);
  },
};
