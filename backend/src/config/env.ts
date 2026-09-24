import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const INSECURE_SECRETS = new Set([
  'secret',
  'changeme',
  'replace-with-a-long-random-string-at-least-32-chars',
]);

const booleanString = z
  .enum(['true', 'false'])
  .default('true')
  .transform((v) => v === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z
      .string({ required_error: 'DATABASE_URL is required' })
      .url('DATABASE_URL must be a valid connection URL'),
    JWT_SECRET: z
      .string({ required_error: 'JWT_SECRET is required' })
      .min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(30),
    BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
    FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),
    AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().positive().default(15),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    LOG_REQUESTS: booleanString,
  })
  .superRefine((env, ctx) => {
    // Section 20: secrets must be present *and non-default* outside local dev/test.
    if (env.NODE_ENV === 'production' && INSECURE_SECRETS.has(env.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET is still set to the example value; generate a real secret',
      });
    }
  });

export type Env = z.infer<typeof envSchema> & { corsOrigins: string[] };

/**
 * Parses and validates configuration. Throws a readable error listing every
 * missing/invalid variable so the process fails loudly at boot (Plan §20, ARCH-003).
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined && v !== ''),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return {
    ...result.data,
    corsOrigins: result.data.FRONTEND_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}

export const env: Env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
