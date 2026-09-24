import { percentOf, toDecimal, toMoney, type Decimalish } from '../../utils/money';

export interface BudgetMetrics {
  limitAmount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

/**
 * Plan §16 formulas, computed on Decimals (never floats):
 *   remaining   = limitAmount − spent        (negative when over budget)
 *   percentUsed = spent / limitAmount × 100  (not clamped)
 */
export function computeBudgetMetrics(limitAmount: Decimalish, spent: Decimalish): BudgetMetrics {
  const limit = toDecimal(limitAmount);
  const used = toDecimal(spent);
  return {
    limitAmount: toMoney(limit),
    spent: toMoney(used),
    remaining: toMoney(limit.minus(used)),
    percentUsed: percentOf(used, limit) ?? 0,
  };
}
