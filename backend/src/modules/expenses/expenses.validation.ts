import { z } from 'zod';
import { parseIsoDate } from '../../utils/dates';
import { isoDateSchema, moneyFilterSchema, moneySchema, uuid } from '../../utils/validators';

const description = z
  .string()
  .trim()
  .max(255, 'Description must be at most 255 characters')
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional();

export const createExpenseSchema = z.object({
  categoryId: uuid('categoryId'),
  amount: moneySchema('amount'),
  description,
  expenseDate: isoDateSchema('expenseDate'),
});

export const updateExpenseSchema = z
  .object({
    categoryId: uuid('categoryId').optional(),
    amount: moneySchema('amount').optional(),
    description,
    expenseDate: isoDateSchema('expenseDate').optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

export const listExpensesQuerySchema = z
  .object({
    startDate: isoDateSchema('startDate').optional(),
    endDate: isoDateSchema('endDate').optional(),
    categoryId: uuid('categoryId').optional(),
    minAmount: moneyFilterSchema('minAmount').optional(),
    maxAmount: moneyFilterSchema('maxAmount').optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1, 'page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'limit must be at least 1')
      .max(100, 'limit must be at most 100')
      .default(20),
    sortBy: z.enum(['expenseDate', 'amount']).default('expenseDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .superRefine((q, ctx) => {
    if (q.minAmount !== undefined && q.maxAmount !== undefined && q.minAmount > q.maxAmount) {
      ctx.addIssue({ code: 'custom', path: ['minAmount'], message: 'minAmount must be ≤ maxAmount' });
    }
    if (q.startDate && q.endDate && q.startDate > q.endDate) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'startDate must be on or before endDate' });
    }
  })
  .transform((q) => ({
    ...q,
    startDate: q.startDate ? (parseIsoDate(q.startDate) as Date) : undefined,
    endDate: q.endDate ? (parseIsoDate(q.endDate) as Date) : undefined,
    search: q.search || undefined,
  }));

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
