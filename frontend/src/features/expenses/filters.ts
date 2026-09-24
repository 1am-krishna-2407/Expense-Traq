export interface FilterValues {
  search: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

export const EMPTY_FILTERS: FilterValues = { search: '', categoryId: '', startDate: '', endDate: '', minAmount: '', maxAmount: '' };

/** Client-side mirror of the API's filter rules (Plan §11: min ≤ max, start ≤ end). */
export function validateFilters(f: FilterValues): Partial<Record<keyof FilterValues, string>> {
  const errors: Partial<Record<keyof FilterValues, string>> = {};
  const num = (v: string) => (v === '' ? undefined : Number(v));
  const min = num(f.minAmount);
  const max = num(f.maxAmount);
  if (min !== undefined && (Number.isNaN(min) || min < 0)) errors.minAmount = 'Enter a positive amount';
  if (max !== undefined && (Number.isNaN(max) || max < 0)) errors.maxAmount = 'Enter a positive amount';
  if (min !== undefined && max !== undefined && min > max) errors.maxAmount = 'Max must be ≥ min';
  if (f.startDate && f.endDate && f.startDate > f.endDate) errors.endDate = 'End date must be after start';
  return errors;
}
