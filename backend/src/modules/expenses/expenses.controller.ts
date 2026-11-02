import type { Request, Response } from 'express';
import { currentUserId } from '../../middleware/authenticate';
import { streamCsv, streamXlsx } from '../../utils/export';
import { expensesService } from './expenses.service';
import type {
  CreateExpenseInput,
  ExportExpensesQuery,
  ListExpensesQuery,
  UpdateExpenseInput,
} from './expenses.validation';

export const expensesController = {
  async list(req: Request, res: Response) {
    res.json(await expensesService.list(currentUserId(req), req.query as unknown as ListExpensesQuery));
  },

  async export(req: Request, res: Response) {
    const { format, ...filters } = req.query as unknown as ExportExpensesQuery;
    const { title, fileBase, tables } = await expensesService.exportTable(currentUserId(req), filters);
    if (format === 'csv') await streamCsv(res, `${fileBase}.csv`, title, tables);
    else await streamXlsx(res, `${fileBase}.xlsx`, title, tables);
  },

  async get(req: Request, res: Response) {
    res.json(await expensesService.get(currentUserId(req), req.params.id));
  },

  async create(req: Request, res: Response) {
    const expense = await expensesService.create(currentUserId(req), req.body as CreateExpenseInput);
    res.status(201).json(expense);
  },

  async update(req: Request, res: Response) {
    res.json(await expensesService.update(currentUserId(req), req.params.id, req.body as UpdateExpenseInput));
  },

  async remove(req: Request, res: Response) {
    await expensesService.delete(currentUserId(req), req.params.id);
    res.status(204).end();
  },
};
