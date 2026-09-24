import { isUniqueViolation } from '../../utils/dbErrors';
import { badRequest, conflict, notFound } from '../../utils/errors';
import { categoriesService } from '../categories/categories.service';
import { computeBudgetMetrics } from './budgets.calc';
import { budgetsRepository, type BudgetWithSpentRow } from './budgets.repository';
import type { BudgetDTO, BudgetFilters } from './budgets.types';
import type { CreateBudgetInput, UpdateBudgetInput } from './budgets.validation';

const duplicateBudget = () =>
  conflict('DUPLICATE_BUDGET', 'A budget for this category already exists this month', 'categoryId');

export const toBudgetDTO = (row: BudgetWithSpentRow): BudgetDTO => ({
  id: row.id,
  categoryId: row.categoryId,
  categoryName: row.categoryName,
  categoryColor: row.categoryColor,
  categoryArchived: row.categoryArchived,
  month: row.month,
  year: row.year,
  ...computeBudgetMetrics(row.limitAmount, row.spent),
});

async function getOrThrow(userId: string, id: string): Promise<BudgetDTO> {
  const row = await budgetsRepository.findByIdWithSpent(userId, id);
  if (!row) throw notFound('Budget');
  return toBudgetDTO(row);
}

export const budgetsService = {
  async list(userId: string, filters: BudgetFilters): Promise<BudgetDTO[]> {
    const rows = await budgetsRepository.list(userId, filters);
    return rows.map(toBudgetDTO);
  },

  get: getOrThrow,

  async create(userId: string, input: CreateBudgetInput): Promise<BudgetDTO> {
    const category = await categoriesService.requireOwned(userId, input.categoryId);
    if (category.isArchived) {
      throw badRequest('Budgets cannot be created for an archived category', [
        { field: 'categoryId', message: 'Category is archived' },
      ]);
    }
    try {
      const created = await budgetsRepository.createIfAbsent(userId, input);
      if (!created) throw duplicateBudget();
      return getOrThrow(userId, created.id);
    } catch (err) {
      // Server-side uniqueness is the source of truth, whatever the client filtered (§16).
      if (isUniqueViolation(err)) throw duplicateBudget();
      throw err;
    }
  },

  async update(userId: string, id: string, input: UpdateBudgetInput): Promise<BudgetDTO> {
    const updated = await budgetsRepository.updateLimit(userId, id, input.limitAmount);
    if (!updated) throw notFound('Budget');
    return getOrThrow(userId, id);
  },

  /** Deleting a budget never touches expenses — they are independent facts (§16). */
  async delete(userId: string, id: string): Promise<void> {
    const deleted = await budgetsRepository.delete(userId, id);
    if (!deleted) throw notFound('Budget');
  },
};
