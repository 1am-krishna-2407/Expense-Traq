import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParamSchema } from '../../utils/validators';
import { expensesController } from './expenses.controller';
import {
  createExpenseSchema,
  exportExpensesQuerySchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from './expenses.validation';

export const expensesRouter = Router();

expensesRouter.use(authenticate);
expensesRouter.get('/', validate({ query: listExpensesQuerySchema }), asyncHandler(expensesController.list));
// Must be registered before '/:id', or "export" would be validated as an expense id.
expensesRouter.get('/export', validate({ query: exportExpensesQuerySchema }), asyncHandler(expensesController.export));
expensesRouter.post('/', validate({ body: createExpenseSchema }), asyncHandler(expensesController.create));
expensesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(expensesController.get));
expensesRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateExpenseSchema }),
  asyncHandler(expensesController.update),
);
expensesRouter.delete('/:id', validate({ params: idParamSchema }), asyncHandler(expensesController.remove));
