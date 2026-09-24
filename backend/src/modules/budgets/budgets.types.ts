export interface BudgetDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryArchived: boolean;
  month: number;
  year: number;
  limitAmount: number;
  /** Always computed live from expenses — never stored (Plan §16). */
  spent: number;
  remaining: number;
  /** True percentage; may exceed 100. The UI clamps only the progress bar. */
  percentUsed: number;
}

export interface BudgetFilters {
  month?: number;
  year?: number;
  categoryId?: string;
}
