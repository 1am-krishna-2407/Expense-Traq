import { z } from 'zod';
import { currentPeriod } from '../../utils/dates';
import { monthSchema, yearSchema } from '../../utils/validators';

/** month/year default to the current month (Plan §11). */
export const dashboardQuerySchema = z
  .object({ month: monthSchema.optional(), year: yearSchema.optional() })
  .transform((q) => {
    const now = currentPeriod();
    return { month: q.month ?? now.month, year: q.year ?? now.year };
  });

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
