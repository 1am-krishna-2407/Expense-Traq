import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParamSchema } from '../../utils/validators';
import { expensesController } from './expenses.controller';
import { createExpenseSchema, listExpensesQuerySchema, updateExpenseSchema } from './expenses.validation';

export const expensesRouter = Router();

expensesRouter.use(authenticate);
expensesRouter.get('/', validate({ query: listExpensesQuerySchema }), asyncHandler(expensesController.list));
expensesRouter.post('/', validate({ body: createExpenseSchema }), asyncHandler(expensesController.create));
expensesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(expensesController.get));
expensesRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateExpenseSchema }),
  asyncHandler(expensesController.update),
);
expensesRouter.delete('/:id', validate({ params: idParamSchema }), asyncHandler(expensesController.remove));
