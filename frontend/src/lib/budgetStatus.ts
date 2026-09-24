export type BudgetStatus = 'on-track' | 'near-limit' | 'over' | 'none';

/** Thresholds from the design systems: amber at 85%+ utilisation, red above 100%. */
export const NEAR_LIMIT_PCT = 85;

export function budgetStatus(percentUsed: number | null | undefined): BudgetStatus {
  if (percentUsed === null || percentUsed === undefined) return 'none';
  if (percentUsed > 100) return 'over';
  if (percentUsed >= NEAR_LIMIT_PCT) return 'near-limit';
  return 'on-track';
}

export const STATUS_LABEL: Record<BudgetStatus, string> = {
  'on-track': 'On Track',
  'near-limit': 'Near Limit',
  over: 'Over Budget',
  none: 'No Budget',
};

/** Progress fill colour class for a status. */
export const STATUS_BAR: Record<BudgetStatus, string> = {
  'on-track': 'bg-success',
  'near-limit': 'bg-warning',
  over: 'bg-danger',
  none: 'bg-subtle',
};

export const STATUS_TEXT: Record<BudgetStatus, string> = {
  'on-track': 'text-success-fg',
  'near-limit': 'text-warning-fg',
  over: 'text-danger-fg',
  none: 'text-subtle',
};
