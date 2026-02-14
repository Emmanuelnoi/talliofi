import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { handleDexieWriteError } from '../handle-dexie-error';

describe('handleDexieWriteError', () => {
  it('converts ConstraintError to a user-friendly message with id', () => {
    const error = new Dexie.ConstraintError();

    expect(() => handleDexieWriteError(error, 'Budget', 'abc-123')).toThrow(
      'Budget with id abc-123 already exists',
    );
  });

  it('uses "unknown" when no id is provided for ConstraintError', () => {
    const error = new Dexie.ConstraintError();

    expect(() => handleDexieWriteError(error, 'Plan')).toThrow(
      'Plan with id unknown already exists',
    );
  });

  it('converts QuotaExceededError to a storage quota message', () => {
    const error = new Dexie.QuotaExceededError();

    expect(() => handleDexieWriteError(error, 'Expense')).toThrow(
      'Storage quota exceeded. Please free up space or export your data.',
    );
  });

  it('re-throws unknown errors as-is', () => {
    const original = new Error('something unexpected');

    expect(() => handleDexieWriteError(original, 'Item')).toThrow(original);
  });
});
