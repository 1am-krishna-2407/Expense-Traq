import type { Request, Response } from 'express';
import { currentUserId } from '../../middleware/authenticate';
import { dashboardService } from './dashboard.service';
import type { DashboardQuery } from './dashboard.validation';

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const { month, year } = req.query as unknown as DashboardQuery;
    res.json(await dashboardService.summary(currentUserId(req), month, year));
  },
};
