/**
 * Calendar-date helpers. `expense_date` is a Postgres DATE (no timezone). We represent
 * it in JS as a Date at UTC midnight and always format with UTC getters, so a server in
 * any timezone never shifts an expense to the previous/next day (Plan §8).
 */

export interface DateRange {
  /** inclusive */
  start: Date;
  /** exclusive */
  end: Date;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses YYYY-MM-DD into a UTC-midnight Date; returns null for invalid calendar dates (e.g. 2026-02-30). */
export function parseIsoDate(value: string): Date | null {
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

export const formatIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** [1st of month, 1st of next month) — handles the Dec → Jan year rollover. */
export const monthRange = (month: number, year: number): DateRange => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});

/** [Jan 1, Jan 1 of next year) */
export const yearRange = (year: number): DateRange => ({
  start: new Date(Date.UTC(year, 0, 1)),
  end: new Date(Date.UTC(year + 1, 0, 1)),
});

/** The `count` months ending at (month, year), oldest first. */
export function trailingMonths(month: number, year: number, count: number) {
  const out: { month: number; year: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    out.push({ month: d.getUTCMonth() + 1, year: d.getUTCFullYear() });
  }
  return out;
}

export const daysInMonth = (month: number, year: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

export function currentPeriod(now = new Date()) {
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
