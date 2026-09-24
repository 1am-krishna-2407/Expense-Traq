import type { Request, Response } from 'express';
import { currentUserId } from '../../middleware/authenticate';
import { streamCsv, streamXlsx } from '../../utils/export';
import { reportsService } from './reports.service';
import type { ExportQuery, MonthlyReportQuery, YearlyReportQuery } from './reports.validation';

export const reportsController = {
  async monthly(req: Request, res: Response) {
    const { month, year } = req.query as unknown as MonthlyReportQuery;
    res.json(await reportsService.monthly(currentUserId(req), month, year));
  },

  async yearly(req: Request, res: Response) {
    const { year } = req.query as unknown as YearlyReportQuery;
    res.json(await reportsService.yearly(currentUserId(req), year));
  },

  /** Synchronous, streamed export (Plan §18 — no job queue at personal-finance data volumes). */
  async export(req: Request, res: Response) {
    const q = req.query as unknown as ExportQuery;
    const { title, fileBase, tables } = await reportsService.exportTables(
      currentUserId(req),
      q.period,
      q.year,
      q.month,
    );
    if (q.format === 'csv') await streamCsv(res, `${fileBase}.csv`, title, tables);
    else await streamXlsx(res, `${fileBase}.xlsx`, title, tables);
  },
};
