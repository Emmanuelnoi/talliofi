import { config as configureZod, z } from 'zod';

// Enforce CSP-compatible Zod parsing by disabling JIT code generation.
// This avoids runtime `new Function(...)` probes that trigger CSP eval violations.
configureZod({ jitless: true });

const booleanEnvSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']),
  BASE_URL: z.string(),
  PROD: z.boolean(),
  DEV: z.boolean(),
  SSR: z.boolean(),
  // Supabase — optional; cloud sync features degrade gracefully when absent
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  // Security deployment controls (expected to be set for production cloud auth)
  VITE_SECURITY_AUTH_RATE_LIMITS_CONFIGURED: booleanEnvSchema
    .optional()
    .default(false),
  VITE_SECURITY_EDGE_RATE_LIMITS_CONFIGURED: booleanEnvSchema
    .optional()
    .default(false),
  VITE_SECURITY_BROWSER_HARDENING_ACKNOWLEDGED: booleanEnvSchema
    .optional()
    .default(false),
  VITE_SUPABASE_PERSIST_SESSION: booleanEnvSchema.optional().default(false),
});

const env = envSchema.parse(import.meta.env);

export default env;
