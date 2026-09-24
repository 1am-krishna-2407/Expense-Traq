export interface CategorySummaryItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  isArchived: boolean;
  spent: number;
  /** null = no budget set for this category/month; spend is still shown (§16). */
  budget: number | null;
  remaining: number | null;
  percentUsed: number | null;
  transactionCount: number;
}

export interface TrendPoint {
  month: number;
  year: number;
  total: number;
}

export interface DashboardSummary {
  period: { month: number; year: number };
  totalExpenses: number;
  totalBudget: number;
  remainingBudget: number;
  categorySummary: CategorySummaryItem[];
  /** Last 6 months ending at the selected month (supports the optional chart, F9). */
  monthlyTrend: TrendPoint[];
}
