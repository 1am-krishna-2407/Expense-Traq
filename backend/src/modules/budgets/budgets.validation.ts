import { z } from 'zod';
import { monthSchema, moneySchema, uuid, yearSchema } from '../../utils/validators';

export const createBudgetSchema = z.object({
  categoryId: uuid('categoryId'),
  month: monthSchema,
  year: yearSchema,
  limitAmount: moneySchema('limitAmount'),
});

/**
 * Only the limit is editable. Category/month/year are immutable — delete and recreate
 * instead — so a budget never ambiguously "moves" (Plan §11/§16). `.strict()` rejects them.
 */
export const updateBudgetSchema = z
  .object({ limitAmount: moneySchema('limitAmount') })
  .strict('Only limitAmount can be changed; delete and recreate to change category or period');

export const listBudgetsQuerySchema = z.object({
  month: monthSchema.optional(),
  year: yearSchema.optional(),
  categoryId: uuid('categoryId').optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ListBudgetsQuery = z.infer<typeof listBudgetsQuerySchema>;
