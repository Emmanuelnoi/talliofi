import env from '@/env';

export const SECURITY_CONTROL_LABELS = {
  authRateLimits: 'Supabase Auth rate limits configured',
  edgeRateLimits: 'Edge/WAF auth throttling configured',
  browserHardening: 'Dedicated hardened browser profile acknowledged',
} as const;

export function hasRequiredServerAuthControls(): boolean {
  return (
    env.VITE_SECURITY_AUTH_RATE_LIMITS_CONFIGURED &&
    env.VITE_SECURITY_EDGE_RATE_LIMITS_CONFIGURED
  );
}

export function shouldBlockCloudAuthInCurrentBuild(): boolean {
  return env.PROD && !hasRequiredServerAuthControls();
}

export function getMissingServerAuthControls(): readonly string[] {
  const missing: string[] = [];

  if (!env.VITE_SECURITY_AUTH_RATE_LIMITS_CONFIGURED) {
    missing.push(SECURITY_CONTROL_LABELS.authRateLimits);
  }
  if (!env.VITE_SECURITY_EDGE_RATE_LIMITS_CONFIGURED) {
    missing.push(SECURITY_CONTROL_LABELS.edgeRateLimits);
  }

  return missing;
}
