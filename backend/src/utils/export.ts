import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { format as csvFormat } from 'fast-csv';

type Cell = string | number | null;

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  money?: boolean;
}

export interface ExportTable {
  name: string;
  columns: ExportColumn[];
  rows: Record<string, Cell>[];
  totals?: Record<string, Cell>;
}

export const CSV_MIME = 'text/csv; charset=utf-8';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const setDownloadHeaders = (res: Response, mime: string, filename: string) => {
  res.status(200);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
};

/**
 * Streams CSV rows straight to the HTTP response as they are produced — no full string is
 * built in memory (Plan §18). Multiple tables are written as titled sections.
 */
export function streamCsv(res: Response, filename: string, title: string, tables: ExportTable[]) {
  setDownloadHeaders(res, CSV_MIME, filename);
  const stream = csvFormat<Cell[], Cell[]>({ headers: false, writeBOM: true });
  stream.pipe(res);

  stream.write([title]);
  tables.forEach((table, i) => {
    if (i > 0) stream.write([]);
    stream.write([table.name]);
    stream.write(table.columns.map((c) => c.header));
    for (const row of table.rows) stream.write(table.columns.map((c) => row[c.key] ?? ''));
    if (table.totals) stream.write(table.columns.map((c) => table.totals?.[c.key] ?? ''));
  });

  return new Promise<void>((resolve, reject) => {
    res.on('finish', resolve);
    stream.on('error', reject);
    stream.end();
  });
}

/** Streams an .xlsx workbook with one worksheet per table using exceljs's streaming writer. */
export async function streamXlsx(res: Response, filename: string, title: string, tables: ExportTable[]) {
  setDownloadHeaders(res, XLSX_MIME, filename);
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true });
  workbook.creator = 'RupeeFlow';
  workbook.created = new Date();

  for (const table of tables) {
    const sheet = workbook.addWorksheet(table.name);
    sheet.columns = table.columns.map((c) => ({
      key: c.key,
      width: c.width ?? 16,
      style: c.money ? { numFmt: '"₹"#,##0.00' } : {},
    }));

    const titleRow = sheet.addRow([title]);
    titleRow.font = { bold: true, size: 13 };
    titleRow.commit();
    sheet.addRow([]).commit();

    const header = sheet.addRow(table.columns.map((c) => c.header));
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    header.commit();

    for (const row of table.rows) sheet.addRow(table.columns.map((c) => row[c.key] ?? null)).commit();

    if (table.totals) {
      const totals = sheet.addRow(table.columns.map((c) => table.totals?.[c.key] ?? null));
      totals.font = { bold: true };
      totals.commit();
    }
    sheet.commit();
  }
  await workbook.commit();
}
