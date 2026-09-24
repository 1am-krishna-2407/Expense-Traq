export interface MonthlyReportCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  total: number;
  budget: number | null;
  remaining: number | null;
  percentUsed: number | null;
  transactionCount: number;
}

export interface MonthlyReport {
  period: { month: number; year: number };
  totalExpenses: number;
  totalBudget: number;
  remainingBudget: number;
  byCategory: MonthlyReportCategory[];
  /** Every day of the month, zero-filled. */
  byDay: { date: string; total: number }[];
}

export interface YearlyReportCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  total: number;
  transactionCount: number;
}

export interface YearlyReport {
  period: { year: number };
  totalExpenses: number;
  totalBudget: number;
  byCategory: YearlyReportCategory[];
  /** All 12 months, zero-filled; `budget` = Σ budget limits set for that month. */
  byMonth: { month: number; total: number; budget: number }[];
}

export type ExportFormat = 'csv' | 'xlsx';
export type ReportPeriod = 'monthly' | 'yearly';
