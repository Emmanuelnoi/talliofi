/**
 * Formal repository interface contracts.
 *
 * These interfaces capture the structural contracts that every Dexie and
 * Supabase repo must satisfy. The concrete repo objects use `satisfies`
 * so TypeScript verifies conformance at the definition site without
 * widening the inferred type (which would hide extra methods from
 * call-sites and repo-router).
 */

// ---------------------------------------------------------------------------
// Base interfaces
// ---------------------------------------------------------------------------

/** Minimal read-side contract: fetch all entities belonging to a plan. */
export interface ReadRepository<T> {
  getByPlanId(planId: string): Promise<T[]>;
}

/** Standard CRUD operations on a plan-scoped entity. */
export interface CrudRepository<T> extends ReadRepository<T> {
  create(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

/** Optional bulk / plan-level deletion helpers. */
export interface BulkRepository<T> {
  bulkUpdate?(entities: T[]): Promise<T[]>;
  bulkDelete?(ids: string[]): Promise<void>;
  deleteByPlanId?(planId: string): Promise<void>;
}
