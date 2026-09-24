import { Prisma } from '@prisma/client';
import { computeBudgetMetrics } from './budgets.calc';

describe('computeBudgetMetrics (Plan §16 formulas)', () => {
  it('computes remaining and percentUsed under budget', () => {
    expect(computeBudgetMetrics(10000, 7500)).toEqual({
      limitAmount: 10000,
      spent: 7500,
      remaining: 2500,
      percentUsed: 75,
    });
  });

  it('allows negative remaining and >100% when over budget (no hard cap)', () => {
    expect(computeBudgetMetrics(8000, 9200)).toEqual({
      limitAmount: 8000,
      spent: 9200,
      remaining: -1200,
      percentUsed: 115,
    });
  });

  it('treats no spend as 0%', () => {
    expect(computeBudgetMetrics(5000, null)).toMatchObject({ spent: 0, remaining: 5000, percentUsed: 0 });
  });

  it('uses decimal arithmetic, not floats (0.1 + 0.2 problem)', () => {
    const spent = new Prisma.Decimal('0.1').plus('0.2');
    expect(computeBudgetMetrics('0.30', spent).remaining).toBe(0);
    expect(computeBudgetMetrics('100.10', '33.37').remaining).toBe(66.73);
  });

  it('rounds percentUsed to one decimal place', () => {
    expect(computeBudgetMetrics(3000, 1000).percentUsed).toBe(33.3);
  });
});
