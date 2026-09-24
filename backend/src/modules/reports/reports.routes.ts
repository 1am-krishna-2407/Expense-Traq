import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { reportsController } from './reports.controller';
import { exportQuerySchema, monthlyReportQuerySchema, yearlyReportQuerySchema } from './reports.validation';

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.get('/monthly', validate({ query: monthlyReportQuerySchema }), asyncHandler(reportsController.monthly));
reportsRouter.get('/yearly', validate({ query: yearlyReportQuerySchema }), asyncHandler(reportsController.yearly));
reportsRouter.get('/export', validate({ query: exportQuerySchema }), asyncHandler(reportsController.export));
