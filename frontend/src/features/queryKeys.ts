import type { ExpenseFilters } from '../api/types';

/** One key namespace per resource (Plan §13). Prefix invalidation hits every variant. */
export const queryKeys = {
  categories: (includeArchived: boolean) => ['categories', { includeArchived }] as const,
  expenses: (filters: Partial<ExpenseFilters>) => ['expenses', filters] as const,
  expense: (id: string) => ['expenses', 'detail', id] as const,
  budgets: (month: number, year: number) => ['budgets', month, year] as const,
  dashboard: (month: number, year: number) => ['dashboard', month, year] as const,
  monthlyReport: (month: number, year: number) => ['reports', 'monthly', month, year] as const,
  yearlyReport: (year: number) => ['reports', 'yearly', year] as const,
};

/**
 * Anything that changes an expense can change budget "spent", dashboard totals and reports,
 * so all of them are invalidated together — the dashboard stays correct after any edit
 * without per-page refetch wiring (Plan §13/§15).
 */
export const SPEND_DEPENDENT_KEYS = [['expenses'], ['budgets'], ['dashboard'], ['reports']] as const;
