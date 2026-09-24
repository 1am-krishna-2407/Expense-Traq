import { formatIsoDate, parseIsoDate } from '../../utils/dates';
import { badRequest, notFound } from '../../utils/errors';
import { toMoney } from '../../utils/money';
import { categoriesService } from '../categories/categories.service';
import type { ExpenseRow } from './expenses.repository';
import { expensesRepository } from './expenses.repository';
import type { ExpenseDTO, ExpenseListFilters, ExpenseListResponse } from './expenses.types';
import type { CreateExpenseInput, UpdateExpenseInput } from './expenses.validation';

export const toExpenseDTO = (row: ExpenseRow): ExpenseDTO => ({
  id: row.id,
  categoryId: row.categoryId,
  category: row.category,
  amount: toMoney(row.amount),
  description: row.description,
  expenseDate: formatIsoDate(row.expenseDate),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** The category must belong to the caller (else 404) and be active (else 400). */
async function requireActiveCategory(userId: string, categoryId: string) {
  const category = await categoriesService.requireOwned(userId, categoryId);
  if (category.isArchived) {
    throw badRequest('This category is archived. Choose an active category.', [
      { field: 'categoryId', message: 'Category is archived' },
    ]);
  }
}

export const expensesService = {
  async create(userId: string, input: CreateExpenseInput): Promise<ExpenseDTO> {
    await requireActiveCategory(userId, input.categoryId);
    const row = await expensesRepository.create(userId, {
      categoryId: input.categoryId,
      amount: input.amount,
      description: input.description ?? null,
      expenseDate: parseIsoDate(input.expenseDate) as Date,
    });
    return toExpenseDTO(row);
  },

  async get(userId: string, id: string): Promise<ExpenseDTO> {
    const row = await expensesRepository.findById(userId, id);
    if (!row) throw notFound('Expense');
    return toExpenseDTO(row);
  },

  async update(userId: string, id: string, input: UpdateExpenseInput): Promise<ExpenseDTO> {
    const existing = await expensesRepository.findById(userId, id);
    if (!existing) throw notFound('Expense');
    // Only a *change* of category needs the active check; editing the amount of an expense
    // that already sits in a now-archived category is still allowed.
    if (input.categoryId !== undefined && input.categoryId !== existing.categoryId) {
      await requireActiveCategory(userId, input.categoryId);
    }
    const row = await expensesRepository.update(userId, id, {
      categoryId: input.categoryId,
      amount: input.amount,
      description: input.description,
      expenseDate: input.expenseDate ? (parseIsoDate(input.expenseDate) as Date) : undefined,
    });
    if (!row) throw notFound('Expense');
    return toExpenseDTO(row);
  },

  async delete(userId: string, id: string): Promise<void> {
    const deleted = await expensesRepository.delete(userId, id);
    if (!deleted) throw notFound('Expense');
  },

  async list(userId: string, filters: ExpenseListFilters): Promise<ExpenseListResponse> {
    const { rows, total } = await expensesRepository.list(userId, filters);
    return {
      data: rows.map(toExpenseDTO),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  },
};
