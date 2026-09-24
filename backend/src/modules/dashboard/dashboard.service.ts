import { monthRange, trailingMonths } from '../../utils/dates';
import { expensesRepository } from '../expenses/expenses.repository';
import { fillTrend, summarise } from './dashboard.calc';
import type { DashboardSummary } from './dashboard.types';

const TREND_MONTHS = 6;

/**
 * Read-only composition module: it owns no tables, it calls the expense repository's
 * aggregation queries (Plan §12 — "dashboard aggregation lives in dashboard.service").
 */
export const dashboardService = {
  async summary(userId: string, month: number, year: number): Promise<DashboardSummary> {
    const months = trailingMonths(month, year, TREND_MONTHS);
    const trendRange = {
      start: monthRange(months[0].month, months[0].year).start,
      end: monthRange(month, year).end,
    };

    const [breakdown, trendRows] = await Promise.all([
      expensesRepository.categoryBreakdown(userId, monthRange(month, year), { month, year }),
      expensesRepository.totalsByMonth(userId, trendRange),
    ]);

    return {
      period: { month, year },
      ...summarise(breakdown),
      monthlyTrend: fillTrend(months, trendRows),
    };
  },
};
