import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParamSchema } from '../../utils/validators';
import { budgetsController } from './budgets.controller';
import { createBudgetSchema, listBudgetsQuerySchema, updateBudgetSchema } from './budgets.validation';

export const budgetsRouter = Router();

budgetsRouter.use(authenticate);
budgetsRouter.get('/', validate({ query: listBudgetsQuerySchema }), asyncHandler(budgetsController.list));
budgetsRouter.post('/', validate({ body: createBudgetSchema }), asyncHandler(budgetsController.create));
budgetsRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(budgetsController.get));
budgetsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateBudgetSchema }),
  asyncHandler(budgetsController.update),
);
budgetsRouter.delete('/:id', validate({ params: idParamSchema }), asyncHandler(budgetsController.remove));
