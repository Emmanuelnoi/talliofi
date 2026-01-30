import { z } from 'zod';

const envSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']),
  BASE_URL: z.string(),
  PROD: z.boolean(),
  DEV: z.boolean(),
  SSR: z.boolean(),
  // Add app-specific env vars below, prefixed with VITE_
  // VITE_API_URL: z.string().url(),
});

const env = envSchema.parse(import.meta.env);

export default env;
