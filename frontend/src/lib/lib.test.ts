import { describe, expect, it } from 'vitest';
import { validateFilters, EMPTY_FILTERS } from '../features/expenses/filters';
import { expenseFormSchema, registerSchema } from '../features/schemas';
import { budgetStatus } from './budgetStatus';
import { periodProgress, periodRange, shiftPeriod } from './dates';
import { formatINR, formatPercent, initials } from './format';

describe('format', () => {
  it('uses Indian digit grouping and shows paise only when present', () => {
    expect(formatINR(425800)).toBe('₹4,25,800');
    expect(formatINR(1234.5)).toBe('₹1,234.50');
    expect(formatINR(850, { decimals: 'always' })).toBe('₹850.00');
    expect(formatINR(-1200)).toBe('-₹1,200');
  });
  it('formats percentages', () => {
    expect(formatPercent(75)).toBe('75%');
    expect(formatPercent(106.66)).toBe('106.7%');
    expect(formatPercent(null)).toBe('—');
  });
  it('derives initials', () => expect(initials('Krishna  Sharma')).toBe('KS'));
});

describe('budgetStatus thresholds', () => {
  it.each([
    [null, 'none'],
    [50, 'on-track'],
    [84.9, 'on-track'],
    [85, 'near-limit'],
    [100, 'near-limit'],
    [100.1, 'over'],
  ])('%s → %s', (pct, status) => expect(budgetStatus(pct)).toBe(status));
});

describe('dates', () => {
  it('rolls the period over year boundaries', () => {
    expect(shiftPeriod({ month: 12, year: 2026 }, 1)).toEqual({ month: 1, year: 2027 });
    expect(shiftPeriod({ month: 1, year: 2026 }, -1)).toEqual({ month: 12, year: 2025 });
  });
  it('gives the inclusive calendar range of a month', () => {
    expect(periodRange({ month: 2, year: 2028 })).toEqual({ startDate: '2028-02-01', endDate: '2028-02-29' });
  });
  it('computes elapsed/remaining days for past, current and future months', () => {
    const now = new Date(2026, 8, 24);
    expect(periodProgress({ month: 9, year: 2026 }, now)).toEqual({ total: 30, elapsed: 24, remaining: 7 });
    expect(periodProgress({ month: 8, year: 2026 }, now)).toEqual({ total: 31, elapsed: 31, remaining: 0 });
    expect(periodProgress({ month: 10, year: 2026 }, now)).toEqual({ total: 31, elapsed: 0, remaining: 31 });
  });
});

describe('client-side validation mirrors the API', () => {
  it('rejects min > max and start > end filter combinations', () => {
    expect(validateFilters({ ...EMPTY_FILTERS, minAmount: '500', maxAmount: '100' })).toHaveProperty('maxAmount');
    expect(validateFilters({ ...EMPTY_FILTERS, startDate: '2026-10-01', endDate: '2026-09-01' })).toHaveProperty('endDate');
    expect(validateFilters({ ...EMPTY_FILTERS, minAmount: '100', maxAmount: '500' })).toEqual({});
  });

  it('expense amounts must be > 0 with at most 2 decimals', () => {
    const base = { categoryId: 'c', expenseDate: '2026-09-01', description: '' };
    expect(expenseFormSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...base, amount: '-5' }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...base, amount: '1.999' }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...base, amount: '12.50' }).success).toBe(true);
    expect(expenseFormSchema.safeParse({ ...base, amount: '1', expenseDate: '2026-02-30' }).success).toBe(false);
  });

  it('passwords need 8+ chars, a letter and a number', () => {
    const base = { name: 'A', email: 'a@b.co' };
    expect(registerSchema.safeParse({ ...base, password: 'short1', confirmPassword: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'abcdefgh', confirmPassword: 'abcdefgh' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'abcdefg1', confirmPassword: 'abcdefg1' }).success).toBe(true);
  });
});
