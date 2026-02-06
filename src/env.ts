import { z } from 'zod';

const envSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']),
  BASE_URL: z.string(),
  PROD: z.boolean(),
  DEV: z.boolean(),
  SSR: z.boolean(),
  // Supabase — optional; cloud sync features degrade gracefully when absent
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const env = envSchema.parse(import.meta.env);

export default env;
