import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import type { BudgetFilters } from './budgets.types';

export interface BudgetWithSpentRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryArchived: boolean;
  month: number;
  year: number;
  limitAmount: Prisma.Decimal;
  spent: Prisma.Decimal;
}

/**
 * One query per list: each budget row is joined with the SUM of its category's expenses
 * inside the budget's own month. Uses the (user_id, category_id) expenses index and a
 * sargable date range (Plan §16/§17).
 */
function selectWithSpent(userId: string, f: BudgetFilters & { id?: string }) {
  const conditions: Prisma.Sql[] = [Prisma.sql`b.user_id = ${userId}::uuid`];
  if (f.id) conditions.push(Prisma.sql`b.id = ${f.id}::uuid`);
  if (f.month !== undefined) conditions.push(Prisma.sql`b.month = ${f.month}::smallint`);
  if (f.year !== undefined) conditions.push(Prisma.sql`b.year = ${f.year}::smallint`);
  if (f.categoryId) conditions.push(Prisma.sql`b.category_id = ${f.categoryId}::uuid`);

  return prisma.$queryRaw<BudgetWithSpentRow[]>`
    SELECT b.id,
           b.category_id          AS "categoryId",
           c.name                 AS "categoryName",
           c.color                AS "categoryColor",
           c.is_archived          AS "categoryArchived",
           b.month::int           AS month,
           b.year::int            AS year,
           b.limit_amount         AS "limitAmount",
           COALESCE(s.spent, 0)   AS spent
    FROM budgets b
    JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
    LEFT JOIN LATERAL (
      SELECT SUM(e.amount) AS spent
      FROM expenses e
      WHERE e.user_id = b.user_id
        AND e.category_id = b.category_id
        AND e.expense_date >= make_date(b.year, b.month, 1)
        AND e.expense_date <  (make_date(b.year, b.month, 1) + INTERVAL '1 month')::date
    ) s ON TRUE
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY b.year DESC, b.month DESC, c.name ASC`;
}

export const budgetsRepository = {
  list(userId: string, filters: BudgetFilters) {
    return selectWithSpent(userId, filters);
  },

  async findByIdWithSpent(userId: string, id: string) {
    const rows = await selectWithSpent(userId, { id });
    return rows[0] ?? null;
  },

  findById(userId: string, id: string) {
    return prisma.budget.findFirst({ where: { id, userId } });
  },

  /**
   * Transaction (Plan §8): duplicate check + insert as one unit. The composite unique
   * constraint (user_id, category_id, month, year) remains the real guarantee; callers
   * translate its P2002 into 409 if two requests race past the check.
   */
  createIfAbsent(
    userId: string,
    data: { categoryId: string; month: number; year: number; limitAmount: number },
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.budget.findFirst({
        where: { userId, categoryId: data.categoryId, month: data.month, year: data.year },
        select: { id: true },
      });
      if (existing) return null;
      return tx.budget.create({ data: { userId, ...data }, select: { id: true } });
    });
  },

  async updateLimit(userId: string, id: string, limitAmount: number): Promise<boolean> {
    const result = await prisma.budget.updateMany({ where: { id, userId }, data: { limitAmount } });
    return result.count === 1;
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await prisma.budget.deleteMany({ where: { id, userId } });
    return result.count === 1;
  },

  totalsByMonth: (userId: string, year: number) => budgetTotalsByMonth(userId, year),
};

export interface BudgetMonthTotalRow {
  month: number;
  total: Prisma.Decimal;
}

/** Σ budget limits per month of a year — powers the yearly "budget vs actual" view. */
export function budgetTotalsByMonth(userId: string, year: number): Promise<BudgetMonthTotalRow[]> {
  return prisma.$queryRaw<BudgetMonthTotalRow[]>`
    SELECT b.month::int AS month, SUM(b.limit_amount) AS total
    FROM budgets b
    WHERE b.user_id = ${userId}::uuid AND b.year = ${year}::smallint
    GROUP BY b.month
    ORDER BY b.month`;
}
