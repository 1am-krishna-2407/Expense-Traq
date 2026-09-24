import { z } from 'zod';
import { parseIsoDate } from './dates';

export const MAX_MONEY = 9_999_999_999.99; // NUMERIC(12,2)

export const uuid = (label = 'id') => z.string().uuid(`${label} must be a valid UUID`);

export const idParamSchema = z.object({ id: uuid() });

/** Positive money with at most 2 decimal places. Accepts numbers or numeric strings. */
export const moneySchema = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number`, required_error: `${label} is required` })
    .finite(`${label} must be a number`)
    .gt(0, `${label} must be greater than 0`)
    .max(MAX_MONEY, `${label} is too large`)
    .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, {
      message: `${label} can have at most 2 decimal places`,
    });

/** Non-negative money used for filter bounds. */
export const moneyFilterSchema = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .finite()
    .min(0, `${label} cannot be negative`)
    .max(MAX_MONEY);

export const isoDateSchema = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .refine((v) => parseIsoDate(v) !== null, `${label} must be a valid date (YYYY-MM-DD)`);

export const monthSchema = z.coerce
  .number({ invalid_type_error: 'month must be a number' })
  .int('month must be an integer')
  .min(1, 'month must be between 1 and 12')
  .max(12, 'month must be between 1 and 12');

export const yearSchema = z.coerce
  .number({ invalid_type_error: 'year must be a number' })
  .int('year must be an integer')
  .min(2000, 'year must be between 2000 and 2100')
  .max(2100, 'year must be between 2000 and 2100');

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'color must be a hex code like #2563EB')
  .transform((v) => v.toUpperCase());

/** Query-string boolean: "true"/"false"/"1"/"0". */
export const queryBoolean = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');
