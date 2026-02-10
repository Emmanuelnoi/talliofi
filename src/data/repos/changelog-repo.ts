import { db } from '../db';
import type { ChangeLogEntry } from '@/domain/plan/types';

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
      const filtered = collection.filter((entry) => {
        if (filter.entityType && entry.entityType !== filter.entityType) {
          return false;
        }
        if (filter.startDate && entry.timestamp < filter.startDate) {
          return false;
        }
        if (filter.endDate && entry.timestamp > filter.endDate) {
          return false;
        }
        return true;
      });

      const entries = await filtered.sortBy('timestamp');
      entries.reverse();

      return {
        entries: entries.slice(offset, offset + limit),
        hasMore: offset + limit < entries.length,
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
};
