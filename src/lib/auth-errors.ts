function getRawAuthMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const message = (error as { message: string }).message.trim();
    if (message.length > 0) return message;
  }
  return '';
}

export function mapSupabaseAuthError(
  error: unknown,
  fallbackMessage: string,
): string {
  const raw = getRawAuthMessage(error);
  const normalized = raw.toLowerCase();

  if (import.meta.env.DEV && raw) {
    console.warn('[auth] provider error:', raw);
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('failed to fetch')
  ) {
    return 'Network error. Check your connection and try again.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  return fallbackMessage;
}
