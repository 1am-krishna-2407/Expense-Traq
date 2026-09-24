import type { Request, Response } from 'express';
import { currentUserId } from '../../middleware/authenticate';
import { categoriesService } from './categories.service';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from './categories.validation';

export const categoriesController = {
  async list(req: Request, res: Response) {
    const { includeArchived } = req.query as unknown as ListCategoriesQuery;
    res.json(await categoriesService.list(currentUserId(req), includeArchived));
  },

  async create(req: Request, res: Response) {
    const category = await categoriesService.create(currentUserId(req), req.body as CreateCategoryInput);
    res.status(201).json(category);
  },

  async update(req: Request, res: Response) {
    res.json(
      await categoriesService.update(currentUserId(req), req.params.id, req.body as UpdateCategoryInput),
    );
  },

  async archive(req: Request, res: Response) {
    await categoriesService.archive(currentUserId(req), req.params.id);
    res.status(204).end();
  },
};
