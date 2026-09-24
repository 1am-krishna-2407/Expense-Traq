import type { Budget, Category, DashboardSummary, Expense, MonthlyReport, YearlyReport } from '../../api/types';

export const now = new Date();
export const MONTH = now.getMonth() + 1;
export const YEAR = now.getFullYear();
const iso = (day: number) => `${YEAR}-${String(MONTH).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const user = { id: 'u-1', name: 'Asha Verma', email: 'asha@example.com' };

export const categories: Category[] = [
  { id: 'c-food', name: 'Food', color: '#2563EB', isArchived: false },
  { id: 'c-transport', name: 'Transport', color: '#64748B', isArchived: false },
  { id: 'c-health', name: 'Health', color: '#8B5CF6', isArchived: false },
  { id: 'c-old', name: 'Old Stuff', color: '#94A3B8', isArchived: true },
];

const cat = (id: string) => categories.find((c) => c.id === id)!;

export const makeExpense = (id: string, categoryId: string, amount: number, day: number, description: string): Expense => ({
  id,
  categoryId,
  category: cat(categoryId),
  amount,
  description,
  expenseDate: iso(day),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const expenses: Expense[] = [
  makeExpense('e-1', 'c-food', 850, 3, 'Dinner with friends'),
  makeExpense('e-2', 'c-transport', 420, 2, 'Uber to office'),
  makeExpense('e-3', 'c-food', 2350, 1, 'Groceries'),
];

export const budgets: Budget[] = [
  {
    id: 'b-food',
    categoryId: 'c-food',
    categoryName: 'Food',
    categoryColor: '#2563EB',
    categoryArchived: false,
    month: MONTH,
    year: YEAR,
    limitAmount: 3000,
    spent: 3200,
    remaining: -200,
    percentUsed: 106.7,
  },
  {
    id: 'b-transport',
    categoryId: 'c-transport',
    categoryName: 'Transport',
    categoryColor: '#64748B',
    categoryArchived: false,
    month: MONTH,
    year: YEAR,
    limitAmount: 1000,
    spent: 420,
    remaining: 580,
    percentUsed: 42,
  },
];

export const summary: DashboardSummary = {
  period: { month: MONTH, year: YEAR },
  totalExpenses: 3620,
  totalBudget: 4000,
  remainingBudget: 380,
  categorySummary: [
    { categoryId: 'c-food', categoryName: 'Food', categoryColor: '#2563EB', isArchived: false, spent: 3200, budget: 3000, remaining: -200, percentUsed: 106.7, transactionCount: 2 },
    { categoryId: 'c-transport', categoryName: 'Transport', categoryColor: '#64748B', isArchived: false, spent: 420, budget: 1000, remaining: 580, percentUsed: 42, transactionCount: 1 },
    { categoryId: 'c-health', categoryName: 'Health', categoryColor: '#8B5CF6', isArchived: false, spent: 0, budget: null, remaining: null, percentUsed: null, transactionCount: 0 },
  ],
  monthlyTrend: [1, 2, 3, 4, 5, 6].map((i) => ({ month: ((MONTH - 7 + i + 12) % 12) + 1, year: YEAR, total: i * 500 })),
};

export const emptySummary: DashboardSummary = {
  ...summary,
  totalExpenses: 0,
  totalBudget: 0,
  remainingBudget: 0,
  categorySummary: summary.categorySummary.map((c) => ({ ...c, spent: 0, budget: null, remaining: null, percentUsed: null, transactionCount: 0 })),
  monthlyTrend: summary.monthlyTrend.map((m) => ({ ...m, total: 0 })),
};

export const monthlyReport: MonthlyReport = {
  period: { month: MONTH, year: YEAR },
  totalExpenses: 3620,
  totalBudget: 4000,
  remainingBudget: 380,
  byCategory: [
    { categoryId: 'c-food', categoryName: 'Food', categoryColor: '#2563EB', total: 3200, budget: 3000, remaining: -200, percentUsed: 106.7, transactionCount: 2 },
    { categoryId: 'c-transport', categoryName: 'Transport', categoryColor: '#64748B', total: 420, budget: 1000, remaining: 580, percentUsed: 42, transactionCount: 1 },
  ],
  byDay: Array.from({ length: 30 }, (_, i) => ({ date: iso(i + 1), total: i === 0 ? 2350 : i === 1 ? 420 : i === 2 ? 850 : 0 })),
};

export const yearlyReport: YearlyReport = {
  period: { year: YEAR },
  totalExpenses: 3620,
  totalBudget: 4000,
  byCategory: [{ categoryId: 'c-food', categoryName: 'Food', categoryColor: '#2563EB', total: 3620, transactionCount: 3 }],
  byMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: i + 1 === MONTH ? 3620 : 0, budget: i + 1 === MONTH ? 4000 : 0 })),
};
