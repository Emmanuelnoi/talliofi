import { db } from '../db';
import type { ChangeLogEntry } from '@/domain/plan/types';
import type { ReadRepository } from './types';

export interface ChangelogFilter {
  readonly entityType?: ChangeLogEntry['entityType'];
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface PaginatedChangelog {
  readonly entries: ChangeLogEntry[];
  readonly hasMore: boolean;
}

export const changelogRepo = {
  async getByPlanId(planId: string): Promise<ChangeLogEntry[]> {
    return db.changelog.where('planId').equals(planId).sortBy('timestamp');
  },

  /**
   * Fetches changelog entries with optional filtering and cursor-based pagination.
   * Results are ordered by timestamp descending (newest first).
   */
  async getByPlanIdPaginated(
    planId: string,
    limit: number,
    offset: number,
    filter?: ChangelogFilter,
  ): Promise<PaginatedChangelog> {
    const collection = db.changelog.where('planId').equals(planId);

    if (filter?.entityType || filter?.startDate || filter?.endDate) {
      // For filtered queries, cap the number of entries we load to prevent
      // unbounded memory usage. We need offset + limit + 1 matching entries
      // to serve the page and determine hasMore.
      const needed = offset + limit + 1;
      const matches: ChangeLogEntry[] = [];

      // Use each() with early exit to avoid loading the entire table
      await collection.each((entry) => {
        if (matches.length >= needed) return;
        if (filter.entityType && entry.entityType !== filter.entityType) return;
        if (filter.startDate && entry.timestamp < filter.startDate) return;
        if (filter.endDate && entry.timestamp > filter.endDate) return;
        matches.push(entry);
      });

      // Sort newest first
      matches.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return {
        entries: matches.slice(offset, offset + limit),
        hasMore: matches.length > offset + limit,
      };
    }

    const total = await collection.count();
    const entries = await collection
      .reverse()
      .offset(offset)
      .limit(limit)
      .sortBy('timestamp');
    entries.reverse();

    return {
      entries,
      hasMore: offset + limit < total,
    };
  },

  async create(entry: ChangeLogEntry): Promise<void> {
    await db.changelog.add(entry);
  },

  async bulkCreate(entries: ChangeLogEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await db.changelog.bulkAdd(entries);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.changelog.where('planId').equals(planId).delete();
  },

  /**
   * Prunes changelog entries older than the specified retention period.
   * Returns the number of deleted entries.
   */
  async cleanup(planId: string, retentionDays = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffISO = cutoff.toISOString();
    return db.changelog
      .where('planId')
      .equals(planId)
      .and((entry) => entry.timestamp < cutoffISO)
      .delete();
  },
} satisfies ReadRepository<ChangeLogEntry> & {
  getByPlanIdPaginated(
    planId: string,
    limit: number,
    offset: number,
    filter?: ChangelogFilter,
  ): Promise<PaginatedChangelog>;
  create(entry: ChangeLogEntry): Promise<void>;
  bulkCreate(entries: ChangeLogEntry[]): Promise<void>;
  deleteByPlanId(planId: string): Promise<void>;
  cleanup(planId: string, retentionDays?: number): Promise<number>;
};
