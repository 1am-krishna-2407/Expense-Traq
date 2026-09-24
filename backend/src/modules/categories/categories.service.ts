import { isUniqueViolation } from '../../utils/dbErrors';
import { conflict, notFound } from '../../utils/errors';
import { categoriesRepository } from './categories.repository';
import type { CategoryDTO } from './categories.types';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.validation';

const duplicate = () => conflict('DUPLICATE_CATEGORY', 'A category with this name already exists', 'name');

export const categoriesService = {
  list(userId: string, includeArchived: boolean): Promise<CategoryDTO[]> {
    return categoriesRepository.findAll(userId, includeArchived);
  },

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryDTO> {
    if (await categoriesRepository.findByName(userId, input.name)) throw duplicate();
    try {
      return await categoriesRepository.create(userId, input);
    } catch (err) {
      if (isUniqueViolation(err)) throw duplicate();
      throw err;
    }
  },

  async update(userId: string, id: string, input: UpdateCategoryInput): Promise<CategoryDTO> {
    if (input.name !== undefined) {
      const clash = await categoriesRepository.findByName(userId, input.name);
      if (clash && clash.id !== id) throw duplicate();
    }
    try {
      const updated = await categoriesRepository.update(userId, id, input);
      if (!updated) throw notFound('Category');
      return updated;
    } catch (err) {
      if (isUniqueViolation(err)) throw duplicate();
      throw err;
    }
  },

  /**
   * DELETE = archive (Plan §7/§11). Never a hard delete, so historical expenses and budgets
   * always keep a valid category reference.
   */
  async archive(userId: string, id: string): Promise<void> {
    const updated = await categoriesRepository.update(userId, id, { isArchived: true });
    if (!updated) throw notFound('Category');
  },

  /** Used by expenses/budgets: the category must exist, be owned, and (optionally) be active. */
  async requireOwned(userId: string, id: string): Promise<CategoryDTO> {
    const category = await categoriesRepository.findById(userId, id);
    if (!category) throw notFound('Category');
    return category;
  },
};
