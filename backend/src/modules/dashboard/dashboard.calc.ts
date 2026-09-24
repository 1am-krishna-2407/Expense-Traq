import { percentOf, toDecimal, toMoney, toMoneyOrNull } from '../../utils/money';
import type { CategoryBreakdownRow, MonthlyTotalRow } from '../expenses/expenses.repository';
import type { CategorySummaryItem, TrendPoint } from './dashboard.types';

/**
 * Shapes already-aggregated SQL rows into the dashboard contract. There is no reduction
 * over raw expenses here — only over the handful of per-category totals Postgres returned.
 *   totalExpenses   = Σ category spend
 *   totalBudget     = Σ category budgets that exist for the month
 *   remainingBudget = totalBudget − totalExpenses   (Plan §17)
 */
export function summarise(rows: CategoryBreakdownRow[]) {
  let totalExpenses = toDecimal(0);
  let totalBudget = toDecimal(0);
  const categorySummary: CategorySummaryItem[] = rows.map((r) => {
    const spent = toDecimal(r.total);
    totalExpenses = totalExpenses.plus(spent);
    if (r.budget !== null) totalBudget = totalBudget.plus(r.budget);
    return {
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categoryColor: r.categoryColor,
      isArchived: r.isArchived,
      spent: toMoney(spent),
      budget: toMoneyOrNull(r.budget),
      remaining: r.budget === null ? null : toMoney(toDecimal(r.budget).minus(spent)),
      percentUsed: percentOf(spent, r.budget),
      transactionCount: Number(r.transactionCount),
    };
  });
  return {
    totalExpenses: toMoney(totalExpenses),
    totalBudget: toMoney(totalBudget),
    remainingBudget: toMoney(totalBudget.minus(totalExpenses)),
    categorySummary,
  };
}

/** Fills months with no spend with 0 so the trend always has exactly `months.length` points. */
export function fillTrend(months: { month: number; year: number }[], rows: MonthlyTotalRow[]): TrendPoint[] {
  const byKey = new Map(rows.map((r) => [`${r.year}-${r.month}`, r.total]));
  return months.map(({ month, year }) => ({
    month,
    year,
    total: toMoney(byKey.get(`${year}-${month}`) ?? 0),
  }));
}
