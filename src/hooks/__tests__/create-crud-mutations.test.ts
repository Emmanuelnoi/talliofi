import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordChange, recordBulkChange } from '../create-crud-mutations';

vi.mock('@/data/repos/changelog-repo', () => ({
  changelogRepo: {
    create: vi.fn().mockResolvedValue(undefined),
    bulkCreate: vi.fn().mockResolvedValue(undefined),
  },
}));

const { changelogRepo } = await import('@/data/repos/changelog-repo');

describe('recordChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a changelog entry with correct fields', () => {
    recordChange('plan-1', 'expense', 'exp-1', 'create', 'Groceries');

    expect(changelogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 'plan-1',
        entityType: 'expense',
        entityId: 'exp-1',
        operation: 'create',
        payload: JSON.stringify({ name: 'Groceries' }),
      }),
    );
  });

  it('omits payload when entityName is not provided', () => {
    recordChange('plan-1', 'bucket', 'b-1', 'delete');

    expect(changelogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'bucket',
        operation: 'delete',
        payload: undefined,
      }),
    );
  });

  it('generates a UUID id and ISO timestamp', () => {
    recordChange('plan-1', 'goal', 'g-1', 'update');

    const entry = vi.mocked(changelogRepo.create).mock.calls[0][0];
    expect(entry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(() => new Date(entry.timestamp).toISOString()).not.toThrow();
  });

  it('does not throw when changelog create rejects', () => {
    vi.mocked(changelogRepo.create).mockRejectedValueOnce(
      new Error('DB error'),
    );
    expect(() =>
      recordChange('plan-1', 'expense', 'e-1', 'create'),
    ).not.toThrow();
  });
});

describe('recordBulkChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates multiple entries for bulk items', () => {
    recordBulkChange(
      'plan-1',
      'expense',
      [
        { id: 'e-1', name: 'Rent' },
        { id: 'e-2', name: 'Food' },
      ],
      'update',
    );

    expect(changelogRepo.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'e-1',
          payload: JSON.stringify({ name: 'Rent' }),
        }),
        expect.objectContaining({
          entityId: 'e-2',
          payload: JSON.stringify({ name: 'Food' }),
        }),
      ]),
    );
  });

  it('omits payload for items without name', () => {
    recordBulkChange('plan-1', 'expense', [{ id: 'e-1' }], 'delete');

    const entries = vi.mocked(changelogRepo.bulkCreate).mock.calls[0][0];
    expect(entries[0].payload).toBeUndefined();
  });

  it('does not throw when bulkCreate rejects', () => {
    vi.mocked(changelogRepo.bulkCreate).mockRejectedValueOnce(
      new Error('DB error'),
    );
    expect(() =>
      recordBulkChange('plan-1', 'expense', [{ id: 'e-1' }], 'delete'),
    ).not.toThrow();
  });
});
