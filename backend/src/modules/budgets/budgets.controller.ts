import type { Request, Response } from 'express';
import { currentUserId } from '../../middleware/authenticate';
import { budgetsService } from './budgets.service';
import type { CreateBudgetInput, ListBudgetsQuery, UpdateBudgetInput } from './budgets.validation';

export const budgetsController = {
  async list(req: Request, res: Response) {
    res.json(await budgetsService.list(currentUserId(req), req.query as unknown as ListBudgetsQuery));
  },

  async get(req: Request, res: Response) {
    res.json(await budgetsService.get(currentUserId(req), req.params.id));
  },

  async create(req: Request, res: Response) {
    const budget = await budgetsService.create(currentUserId(req), req.body as CreateBudgetInput);
    res.status(201).json(budget);
  },

  async update(req: Request, res: Response) {
    res.json(await budgetsService.update(currentUserId(req), req.params.id, req.body as UpdateBudgetInput));
  },

  async remove(req: Request, res: Response) {
    await budgetsService.delete(currentUserId(req), req.params.id);
    res.status(204).end();
  },
};
