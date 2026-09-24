import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { formatIsoDate, type DateRange } from '../../utils/dates';
import type { ExpenseListFilters } from './expenses.types';

const expenseInclude = {
  // Joined in the same query — never a per-row follow-up (no N+1, Plan §21).
  category: { select: { id: true, name: true, color: true, isArchived: true } },
} as const;

export type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

export interface CategoryBreakdownRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  isArchived: boolean;
  total: Prisma.Decimal;
  transactionCount: number;
  budget: Prisma.Decimal | null;
}

export interface DailyTotalRow {
  date: string;
  total: Prisma.Decimal;
}

export interface MonthlyTotalRow {
  year: number;
  month: number;
  total: Prisma.Decimal;
}

function buildWhere(userId: string, f: Partial<ExpenseListFilters>): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = { userId };
  if (f.startDate || f.endDate) {
    where.expenseDate = {
      ...(f.startDate ? { gte: f.startDate } : {}),
      ...(f.endDate ? { lte: f.endDate } : {}),
    };
  }
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.minAmount !== undefined || f.maxAmount !== undefined) {
    where.amount = {
      ...(f.minAmount !== undefined ? { gte: f.minAmount } : {}),
      ...(f.maxAmount !== undefined ? { lte: f.maxAmount } : {}),
    };
  }
  if (f.search) where.description = { contains: f.search, mode: 'insensitive' };
  return where;
}

/** Date params are sent as ISO strings and cast to DATE, so the session timezone can't shift them. */
const sqlDate = (d: Date) => Prisma.sql`${formatIsoDate(d)}::date`;

export const expensesRepository = {
  findById(userId: string, id: string) {
    return prisma.expense.findFirst({ where: { id, userId }, include: expenseInclude });
  },

  create(
    userId: string,
    data: { categoryId: string; amount: number; description: string | null; expenseDate: Date },
  ) {
    return prisma.expense.create({ data: { userId, ...data }, include: expenseInclude });
  },

  /** Returns null when not found / not owned. */
  async update(
    userId: string,
    id: string,
    data: { categoryId?: string; amount?: number; description?: string | null; expenseDate?: Date },
  ) {
    const result = await prisma.expense.updateMany({ where: { id, userId }, data });
    if (result.count === 0) return null;
    return prisma.expense.findFirst({ where: { id, userId }, include: expenseInclude });
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await prisma.expense.deleteMany({ where: { id, userId } });
    return result.count === 1;
  },

  /**
   * Filters combine with AND; the leading `user_id` column lets Postgres use the
   * (user_id, expense_date) / (user_id, category_id) indexes (Plan §15/§21).
   */
  async list(userId: string, f: ExpenseListFilters): Promise<{ rows: ExpenseRow[]; total: number }> {
    const where = buildWhere(userId, f);
    const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = [
      { [f.sortBy]: f.sortOrder },
      { createdAt: 'desc' },
      { id: 'asc' }, // stable pagination for ties
    ];
    const [rows, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy,
        skip: (f.page - 1) * f.limit,
        take: f.limit,
      }),
      prisma.expense.count({ where }),
    ]);
    return { rows, total };
  },

  // ───────────────────────── Aggregations (Plan §17/§18) ─────────────────────────
  // SUM/GROUP BY run in PostgreSQL. Dashboard, on-screen reports AND file exports all
  // call these same functions, so the numbers can never disagree.

  /**
   * Spend per category for [range.start, range.end), joined with the budget for
   * `budgetPeriod` when given. Archived categories are included only when they have
   * spend or a budget in the period, so historical totals stay complete.
   */
  categoryBreakdown(
    userId: string,
    range: DateRange,
    budgetPeriod: { month: number; year: number } | null,
  ): Promise<CategoryBreakdownRow[]> {
    const budgetJoin = budgetPeriod
      ? Prisma.sql`LEFT JOIN budgets b
           ON b.user_id = c.user_id AND b.category_id = c.id
          AND b.month = ${budgetPeriod.month}::smallint AND b.year = ${budgetPeriod.year}::smallint`
      : Prisma.sql`LEFT JOIN (SELECT NULL::uuid AS id, NULL::numeric AS limit_amount) b ON FALSE`;

    return prisma.$queryRaw<CategoryBreakdownRow[]>`
      WITH spend AS (
        SELECT e.category_id, SUM(e.amount) AS total, COUNT(*)::int AS tx_count
        FROM expenses e
        WHERE e.user_id = ${userId}::uuid
          AND e.expense_date >= ${sqlDate(range.start)}
          AND e.expense_date <  ${sqlDate(range.end)}
        GROUP BY e.category_id
      )
      SELECT c.id                       AS "categoryId",
             c.name                     AS "categoryName",
             c.color                    AS "categoryColor",
             c.is_archived              AS "isArchived",
             COALESCE(s.total, 0)       AS total,
             COALESCE(s.tx_count, 0)    AS "transactionCount",
             b.limit_amount             AS budget
      FROM categories c
      LEFT JOIN spend s ON s.category_id = c.id
      ${budgetJoin}
      WHERE c.user_id = ${userId}::uuid
        AND (c.is_archived = FALSE OR s.total IS NOT NULL OR b.id IS NOT NULL)
      ORDER BY COALESCE(s.total, 0) DESC, c.name ASC`;
  },

  totalsByDay(userId: string, range: DateRange): Promise<DailyTotalRow[]> {
    return prisma.$queryRaw<DailyTotalRow[]>`
      SELECT to_char(e.expense_date, 'YYYY-MM-DD') AS date, SUM(e.amount) AS total
      FROM expenses e
      WHERE e.user_id = ${userId}::uuid
        AND e.expense_date >= ${sqlDate(range.start)}
        AND e.expense_date <  ${sqlDate(range.end)}
      GROUP BY e.expense_date
      ORDER BY e.expense_date`;
  },

  totalsByMonth(userId: string, range: DateRange): Promise<MonthlyTotalRow[]> {
    return prisma.$queryRaw<MonthlyTotalRow[]>`
      SELECT EXTRACT(YEAR FROM e.expense_date)::int  AS year,
             EXTRACT(MONTH FROM e.expense_date)::int AS month,
             SUM(e.amount)                           AS total
      FROM expenses e
      WHERE e.user_id = ${userId}::uuid
        AND e.expense_date >= ${sqlDate(range.start)}
        AND e.expense_date <  ${sqlDate(range.end)}
      GROUP BY 1, 2
      ORDER BY 1, 2`;
  },
};
