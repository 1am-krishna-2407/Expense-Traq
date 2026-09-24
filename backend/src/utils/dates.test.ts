import { daysInMonth, formatIsoDate, monthRange, parseIsoDate, trailingMonths, yearRange } from './dates';

describe('date helpers (report boundary math, Plan §22)', () => {
  it('parses valid calendar dates at UTC midnight', () => {
    expect(parseIsoDate('2026-01-31')?.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '26-01-01', '2026-1-1', 'nope', '2025-02-29'])(
    'rejects invalid date %s',
    (value) => expect(parseIsoDate(value)).toBeNull(),
  );

  it('accepts Feb 29 in a leap year', () => {
    expect(parseIsoDate('2028-02-29')).not.toBeNull();
  });

  it('monthRange is [1st, 1st of next month)', () => {
    const r = monthRange(1, 2026);
    expect(formatIsoDate(r.start)).toBe('2026-01-01');
    expect(formatIsoDate(r.end)).toBe('2026-02-01');
  });

  it('monthRange rolls December over into the next year', () => {
    const r = monthRange(12, 2026);
    expect(formatIsoDate(r.start)).toBe('2026-12-01');
    expect(formatIsoDate(r.end)).toBe('2027-01-01');
  });

  it('yearRange spans Jan 1 → Jan 1 of the next year', () => {
    const r = yearRange(2026);
    expect(formatIsoDate(r.start)).toBe('2026-01-01');
    expect(formatIsoDate(r.end)).toBe('2027-01-01');
  });

  it('trailingMonths crosses the year boundary, oldest first', () => {
    expect(trailingMonths(2, 2026, 4)).toEqual([
      { month: 11, year: 2025 },
      { month: 12, year: 2025 },
      { month: 1, year: 2026 },
      { month: 2, year: 2026 },
    ]);
  });

  it('daysInMonth handles leap years', () => {
    expect(daysInMonth(2, 2028)).toBe(29);
    expect(daysInMonth(2, 2026)).toBe(28);
    expect(daysInMonth(12, 2026)).toBe(31);
  });
});
