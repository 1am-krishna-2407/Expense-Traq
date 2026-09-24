import { z } from 'zod';
import { monthSchema, yearSchema } from '../../utils/validators';

export const monthlyReportQuerySchema = z.object({
  month: monthSchema,
  year: yearSchema,
});

export const yearlyReportQuerySchema = z.object({
  year: yearSchema,
});

export const exportQuerySchema = z
  .object({
    format: z.enum(['csv', 'xlsx'], { errorMap: () => ({ message: 'format must be csv or xlsx' }) }),
    period: z.enum(['monthly', 'yearly'], {
      errorMap: () => ({ message: 'period must be monthly or yearly' }),
    }),
    month: monthSchema.optional(),
    year: yearSchema,
  })
  .superRefine((q, ctx) => {
    if (q.period === 'monthly' && q.month === undefined) {
      ctx.addIssue({ code: 'custom', path: ['month'], message: 'month is required for a monthly export' });
    }
  });

export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;
export type YearlyReportQuery = z.infer<typeof yearlyReportQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
