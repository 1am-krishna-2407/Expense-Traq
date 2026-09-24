import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParamSchema } from '../../utils/validators';
import { categoriesController } from './categories.controller';
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './categories.validation';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);
categoriesRouter.get('/', validate({ query: listCategoriesQuerySchema }), asyncHandler(categoriesController.list));
categoriesRouter.post('/', validate({ body: createCategorySchema }), asyncHandler(categoriesController.create));
categoriesRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCategorySchema }),
  asyncHandler(categoriesController.update),
);
categoriesRouter.delete('/:id', validate({ params: idParamSchema }), asyncHandler(categoriesController.archive));
