import { daysInMonth, formatIsoDate, monthRange, yearRange } from '../../utils/dates';
import type { ExportTable } from '../../utils/export';
import { toDecimal, toMoney } from '../../utils/money';
import { budgetsRepository } from '../budgets/budgets.repository';
import { summarise } from '../dashboard/dashboard.calc';
import { expensesRepository } from '../expenses/expenses.repository';
import type { MonthlyReport, YearlyReport } from './reports.types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const monthName = (m: number) => MONTH_NAMES[m - 1];

export const reportsService = {
  /** Same category aggregation as the dashboard, plus a zero-filled per-day series (Plan §18). */
  async monthly(userId: string, month: number, year: number): Promise<MonthlyReport> {
    const range = monthRange(month, year);
    const [breakdown, dayRows] = await Promise.all([
      expensesRepository.categoryBreakdown(userId, range, { month, year }),
      expensesRepository.totalsByDay(userId, range),
    ]);
    const summary = summarise(breakdown);
    const byDate = new Map(dayRows.map((r) => [r.date, r.total]));
    const byDay = Array.from({ length: daysInMonth(month, year) }, (_, i) => {
      const date = formatIsoDate(new Date(Date.UTC(year, month - 1, i + 1)));
      return { date, total: toMoney(byDate.get(date) ?? 0) };
    });

    return {
      period: { month, year },
      totalExpenses: summary.totalExpenses,
      totalBudget: summary.totalBudget,
      remainingBudget: summary.remainingBudget,
      byCategory: summary.categorySummary
        .filter((c) => c.spent > 0 || c.budget !== null)
        .map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          categoryColor: c.categoryColor,
          total: c.spent,
          budget: c.budget,
          remaining: c.remaining,
          percentUsed: c.percentUsed,
          transactionCount: c.transactionCount,
        })),
      byDay,
    };
  },

  async yearly(userId: string, year: number): Promise<YearlyReport> {
    const range = yearRange(year);
    const [breakdown, monthRows, budgetRows] = await Promise.all([
      expensesRepository.categoryBreakdown(userId, range, null),
      expensesRepository.totalsByMonth(userId, range),
      budgetsRepository.totalsByMonth(userId, year),
    ]);
    const summary = summarise(breakdown);
    const spendByMonth = new Map(monthRows.map((r) => [r.month, r.total]));
    const budgetByMonth = new Map(budgetRows.map((r) => [r.month, r.total]));
    const byMonth = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: toMoney(spendByMonth.get(i + 1) ?? 0),
      budget: toMoney(budgetByMonth.get(i + 1) ?? 0),
    }));

    return {
      period: { year },
      totalExpenses: summary.totalExpenses,
      totalBudget: toMoney(budgetRows.reduce((acc, r) => acc.plus(r.total), toDecimal(0))),
      byCategory: summary.categorySummary
        .filter((c) => c.spent > 0)
        .map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          categoryColor: c.categoryColor,
          total: c.spent,
          transactionCount: c.transactionCount,
        })),
      byMonth,
    };
  },

  /**
   * Builds export tables from the exact objects the on-screen report returns — the file
   * a user downloads always matches what they saw (single source of truth, Plan §18).
   */
  async exportTables(
    userId: string,
    period: 'monthly' | 'yearly',
    year: number,
    month?: number,
  ): Promise<{ title: string; fileBase: string; tables: ExportTable[] }> {
    if (period === 'monthly' && month !== undefined) {
      const r = await this.monthly(userId, month, year);
      const mm = String(month).padStart(2, '0');
      return {
        title: `RupeeFlow — ${monthName(month)} ${year} Report`,
        fileBase: `rupeeflow-report-${year}-${mm}`,
        tables: [
          {
            name: 'By Category',
            columns: [
              { header: 'Category', key: 'category', width: 28 },
              { header: 'Transactions', key: 'count', width: 14 },
              { header: 'Spent (INR)', key: 'total', width: 16, money: true },
              { header: 'Budget (INR)', key: 'budget', width: 16, money: true },
              { header: 'Remaining (INR)', key: 'remaining', width: 18, money: true },
              { header: 'Used (%)', key: 'pct', width: 12 },
            ],
            rows: r.byCategory.map((c) => ({
              category: c.categoryName,
              count: c.transactionCount,
              total: c.total,
              budget: c.budget,
              remaining: c.remaining,
              pct: c.percentUsed,
            })),
            totals: {
              category: 'TOTAL',
              count: r.byCategory.reduce((a, c) => a + c.transactionCount, 0),
              total: r.totalExpenses,
              budget: r.totalBudget,
              remaining: r.remainingBudget,
              pct: null,
            },
          },
          {
            name: 'By Day',
            columns: [
              { header: 'Date', key: 'date', width: 14 },
              { header: 'Spent (INR)', key: 'total', width: 16, money: true },
            ],
            rows: r.byDay.map((d) => ({ date: d.date, total: d.total })),
            totals: { date: 'TOTAL', total: r.totalExpenses },
          },
        ],
      };
    }

    const r = await this.yearly(userId, year);
    return {
      title: `RupeeFlow — ${year} Annual Report`,
      fileBase: `rupeeflow-report-${year}`,
      tables: [
        {
          name: 'By Category',
          columns: [
            { header: 'Category', key: 'category', width: 28 },
            { header: 'Transactions', key: 'count', width: 14 },
            { header: 'Spent (INR)', key: 'total', width: 16, money: true },
          ],
          rows: r.byCategory.map((c) => ({ category: c.categoryName, count: c.transactionCount, total: c.total })),
          totals: {
            category: 'TOTAL',
            count: r.byCategory.reduce((a, c) => a + c.transactionCount, 0),
            total: r.totalExpenses,
          },
        },
        {
          name: 'By Month',
          columns: [
            { header: 'Month', key: 'month', width: 14 },
            { header: 'Spent (INR)', key: 'total', width: 16, money: true },
            { header: 'Budget (INR)', key: 'budget', width: 16, money: true },
          ],
          rows: r.byMonth.map((m) => ({ month: monthName(m.month), total: m.total, budget: m.budget })),
          totals: { month: 'TOTAL', total: r.totalExpenses, budget: r.totalBudget },
        },
      ],
    };
  },
};
