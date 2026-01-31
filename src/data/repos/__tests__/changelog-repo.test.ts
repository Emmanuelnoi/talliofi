import { describe, it, expect } from 'vitest';
import type { ChangeLogEntry } from '@/domain/plan/types';
import { changelogRepo } from '../changelog-repo';

function makeEntry(
  planId: string,
  overrides: Partial<ChangeLogEntry> = {},
): ChangeLogEntry {
  return {
    id: crypto.randomUUID(),
    planId,
    entityType: 'plan',
    entityId: planId,
    operation: 'create',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('changelogRepo', () => {
  describe('create() and getByPlanId()', () => {
    it('creates and retrieves entries', async () => {
      const planId = crypto.randomUUID();
      const entry = makeEntry(planId);
      await changelogRepo.create(entry);

      const results = await changelogRepo.getByPlanId(planId);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(entry.id);
    });

    it('returns empty array when no entries exist', async () => {
      const results = await changelogRepo.getByPlanId(crypto.randomUUID());
      expect(results).toHaveLength(0);
    });

    it('returns entries sorted by timestamp', async () => {
      const planId = crypto.randomUUID();

      await changelogRepo.create(
        makeEntry(planId, {
          timestamp: '2026-01-03T00:00:00.000Z',
          operation: 'delete',
        }),
      );
      await changelogRepo.create(
        makeEntry(planId, {
          timestamp: '2026-01-01T00:00:00.000Z',
          operation: 'create',
        }),
      );
      await changelogRepo.create(
        makeEntry(planId, {
          timestamp: '2026-01-02T00:00:00.000Z',
          operation: 'update',
        }),
      );

      const results = await changelogRepo.getByPlanId(planId);
      expect(results.map((e) => e.operation)).toEqual([
        'create',
        'update',
        'delete',
      ]);
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all entries for a plan', async () => {
      const planId = crypto.randomUUID();
      await changelogRepo.create(makeEntry(planId));
      await changelogRepo.create(makeEntry(planId));

      await changelogRepo.deleteByPlanId(planId);
      const results = await changelogRepo.getByPlanId(planId);
      expect(results).toHaveLength(0);
    });

    it('does not affect other plans', async () => {
      const planA = crypto.randomUUID();
      const planB = crypto.randomUUID();

      await changelogRepo.create(makeEntry(planA));
      await changelogRepo.create(makeEntry(planB));

      await changelogRepo.deleteByPlanId(planA);

      expect(await changelogRepo.getByPlanId(planA)).toHaveLength(0);
      expect(await changelogRepo.getByPlanId(planB)).toHaveLength(1);
    });
  });
});
