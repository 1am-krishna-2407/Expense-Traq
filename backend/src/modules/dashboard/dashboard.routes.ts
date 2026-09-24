import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { dashboardController } from './dashboard.controller';
import { dashboardQuerySchema } from './dashboard.validation';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/summary', validate({ query: dashboardQuerySchema }), asyncHandler(dashboardController.summary));
