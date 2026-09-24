/**
 * API contract types — mirror the backend DTOs (backend/src/modules/*\/*.types.ts)
 * field-for-field (Plan §13: intentionally mirrored to avoid drift).
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  isArchived: boolean;
}

export interface Expense {
  id: string;
  categoryId: string;
  category: Category;
  amount: number;
  description: string | null;
  /** YYYY-MM-DD */
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type SortBy = 'expenseDate' | 'amount';
export type SortOrder = 'asc' | 'desc';

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page: number;
  limit: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

export interface ExpenseInput {
  categoryId: string;
  amount: number;
  description?: string | null;
  expenseDate: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryArchived: boolean;
  month: number;
  year: number;
  limitAmount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

export interface BudgetInput {
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
}

export interface CategorySummaryItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  isArchived: boolean;
  spent: number;
  budget: number | null;
  remaining: number | null;
  percentUsed: number | null;
  transactionCount: number;
}

export interface DashboardSummary {
  period: { month: number; year: number };
  totalExpenses: number;
  totalBudget: number;
  remainingBudget: number;
  categorySummary: CategorySummaryItem[];
  monthlyTrend: { month: number; year: number; total: number }[];
}

export interface MonthlyReport {
  period: { month: number; year: number };
  totalExpenses: number;
  totalBudget: number;
  remainingBudget: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    categoryColor: string | null;
    total: number;
    budget: number | null;
    remaining: number | null;
    percentUsed: number | null;
    transactionCount: number;
  }[];
  byDay: { date: string; total: number }[];
}

export interface YearlyReport {
  period: { year: number };
  totalExpenses: number;
  totalBudget: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    categoryColor: string | null;
    total: number;
    transactionCount: number;
  }[];
  byMonth: { month: number; total: number; budget: number }[];
}

/** Standard error body (Plan §19). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export interface Period {
  month: number;
  year: number;
}
