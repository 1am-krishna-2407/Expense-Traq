import { formatIsoDate, parseIsoDate } from '../../utils/dates';
import { badRequest, notFound } from '../../utils/errors';
import type { ExportTable } from '../../utils/export';
import { toMoney } from '../../utils/money';
import { categoriesService } from '../categories/categories.service';
import type { ExpenseRow } from './expenses.repository';
import { expensesRepository } from './expenses.repository';
import type { ExpenseDTO, ExpenseFilters, ExpenseListFilters, ExpenseListResponse } from './expenses.types';
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

  /** The transactions behind the Expenses page, with the page's filters applied. */
  async exportTable(
    userId: string,
    filters: ExpenseFilters,
  ): Promise<{ title: string; fileBase: string; tables: ExportTable[] }> {
    const rows = (await expensesRepository.listAll(userId, filters)).map(toExpenseDTO);
    const from = filters.startDate ? formatIsoDate(filters.startDate) : null;
    const to = filters.endDate ? formatIsoDate(filters.endDate) : null;
    const range = from || to ? `${from ?? 'start'} to ${to ?? 'today'}` : 'all dates';
    return {
      title: `RupeeFlow — Expenses (${range})`,
      fileBase: from || to ? `rupeeflow-expenses-${from ?? 'start'}_to_${to ?? 'today'}` : 'rupeeflow-expenses',
      tables: [
        {
          name: 'Expenses',
          columns: [
            { header: 'Date', key: 'date', width: 14 },
            { header: 'Category', key: 'category', width: 24 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Amount (INR)', key: 'amount', width: 16, money: true },
          ],
          rows: rows.map((e) => ({
            date: e.expenseDate,
            category: e.category.name,
            description: e.description,
            amount: e.amount,
          })),
          totals: {
            date: 'TOTAL',
            category: `${rows.length} transaction${rows.length === 1 ? '' : 's'}`,
            description: null,
            // Sum in paise so float rounding can't drift the total.
            amount: rows.reduce((paise, e) => paise + Math.round(e.amount * 100), 0) / 100,
          },
        },
      ],
    };
  },
};
