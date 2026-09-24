export interface ExpenseDTO {
  id: string;
  categoryId: string;
  category: { id: string; name: string; color: string | null; isArchived: boolean };
  amount: number;
  description: string | null;
  /** YYYY-MM-DD */
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExpenseListResponse {
  data: ExpenseDTO[];
  meta: PaginationMeta;
}

export interface ExpenseListFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page: number;
  limit: number;
  sortBy: 'expenseDate' | 'amount';
  sortOrder: 'asc' | 'desc';
}
