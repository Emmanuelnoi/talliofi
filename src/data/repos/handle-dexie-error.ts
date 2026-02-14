import Dexie from 'dexie';

/**
 * Shared error handler for Dexie write operations.
 * Converts Dexie-specific errors into user-friendly messages.
 */
export function handleDexieWriteError(
  error: unknown,
  entityName: string,
  id?: string,
): never {
  if (error instanceof Dexie.ConstraintError) {
    throw new Error(`${entityName} with id ${id ?? 'unknown'} already exists`);
  }
  if (error instanceof Dexie.QuotaExceededError) {
    throw new Error(
      'Storage quota exceeded. Please free up space or export your data.',
    );
  }
  throw error;
}
