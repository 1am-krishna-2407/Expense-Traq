import { Prisma } from '@prisma/client';
import type { CategoryBreakdownRow } from '../expenses/expenses.repository';
import { fillTrend, summarise } from './dashboard.calc';

const row = (name: string, total: string, budget: string | null, count = 1): CategoryBreakdownRow => ({
  categoryId: name,
  categoryName: name,
  categoryColor: null,
  isArchived: false,
  total: new Prisma.Decimal(total),
  transactionCount: count,
  budget: budget === null ? null : new Prisma.Decimal(budget),
});

describe('summarise (dashboard remaining-budget math)', () => {
  it('totals spend and budgets and derives remaining = totalBudget − totalExpenses', () => {
    const s = summarise([row('Food', '7500.50', '10000'), row('Travel', '12000', '15000'), row('Misc', '99.50', null)]);
    expect(s.totalExpenses).toBe(19600);
    expect(s.totalBudget).toBe(25000);
    expect(s.remainingBudget).toBe(5400);
  });

  it('never hides unbudgeted spend: budget/remaining/percentUsed are null', () => {
    const [item] = summarise([row('Misc', '500', null)]).categorySummary;
    expect(item).toMatchObject({ spent: 500, budget: null, remaining: null, percentUsed: null });
  });

  it('reports negative remaining when overall spend exceeds budgets', () => {
    const s = summarise([row('Food', '12000', '10000')]);
    expect(s.remainingBudget).toBe(-2000);
    expect(s.categorySummary[0].percentUsed).toBe(120);
  });

  it('handles an empty month', () => {
    expect(summarise([])).toEqual({ totalExpenses: 0, totalBudget: 0, remainingBudget: 0, categorySummary: [] });
  });
});

describe('fillTrend', () => {
  it('zero-fills months without spend', () => {
    const months = [
      { month: 12, year: 2025 },
      { month: 1, year: 2026 },
      { month: 2, year: 2026 },
    ];
    const rows = [{ year: 2026, month: 1, total: new Prisma.Decimal('150.25') }];
    expect(fillTrend(months, rows)).toEqual([
      { month: 12, year: 2025, total: 0 },
      { month: 1, year: 2026, total: 150.25 },
      { month: 2, year: 2026, total: 0 },
    ]);
  });
});
