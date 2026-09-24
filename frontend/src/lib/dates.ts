import { endOfMonth, format, getDaysInMonth } from 'date-fns';
import type { Period } from '../api/types';

export const currentPeriod = (now = new Date()): Period => ({ month: now.getMonth() + 1, year: now.getFullYear() });

export const todayIso = (now = new Date()) => format(now, 'yyyy-MM-dd');

export function shiftPeriod({ month, year }: Period, delta: number): Period {
  const d = new Date(year, month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function periodRange({ month, year }: Period) {
  const start = new Date(year, month - 1, 1);
  return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(endOfMonth(start), 'yyyy-MM-dd') };
}

export const isSamePeriod = (a: Period, b: Period) => a.month === b.month && a.year === b.year;

/**
 * Days of the period that have elapsed (full month for past periods, today's date for the
 * current month, 0 for future months) and days still remaining.
 */
export function periodProgress(period: Period, now = new Date()) {
  const total = getDaysInMonth(new Date(period.year, period.month - 1, 1));
  const cur = currentPeriod(now);
  const key = (p: Period) => p.year * 12 + p.month;
  if (key(period) < key(cur)) return { total, elapsed: total, remaining: 0 };
  if (key(period) > key(cur)) return { total, elapsed: 0, remaining: total };
  const day = now.getDate();
  return { total, elapsed: day, remaining: total - day + 1 };
}
