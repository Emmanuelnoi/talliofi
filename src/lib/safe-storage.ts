function logStorageWarning(action: string, key: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[storage] Failed to ${action} "${key}"`, error);
  }
}

export function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    logStorageWarning('read', key, error);
    return null;
  }
}

export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    logStorageWarning('write', key, error);
  }
}

export function safeRemoveLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    logStorageWarning('remove', key, error);
  }
}
