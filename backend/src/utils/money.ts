import { Prisma } from '@prisma/client';

export type Decimalish = Prisma.Decimal | number | string | bigint | null | undefined;

/** Converts a NUMERIC/Decimal value from Postgres to a Decimal (null → 0). */
export const toDecimal = (value: Decimalish): Prisma.Decimal =>
  new Prisma.Decimal(value === null || value === undefined ? 0 : value.toString());

/**
 * Serialises money for JSON. All arithmetic happens on Decimal (or in SQL); only the
 * final value is converted, rounded half-up to 2 dp.
 */
export const toMoney = (value: Decimalish): number =>
  toDecimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber();

export const toMoneyOrNull = (value: Decimalish): number | null =>
  value === null || value === undefined ? null : toMoney(value);

/** spent / limit × 100, one decimal place. Returns null when there is no limit. */
export function percentOf(spent: Decimalish, limit: Decimalish): number | null {
  if (limit === null || limit === undefined) return null;
  const l = toDecimal(limit);
  if (l.isZero()) return null;
  return toDecimal(spent).div(l).times(100).toDecimalPlaces(1, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}
