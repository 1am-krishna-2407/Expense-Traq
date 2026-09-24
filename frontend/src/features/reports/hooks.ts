import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { MonthlyReport, YearlyReport } from '../../api/types';
import { queryKeys } from '../queryKeys';

export type ExportFormat = 'csv' | 'xlsx';

export interface ExportParams {
  format: ExportFormat;
  period: 'monthly' | 'yearly';
  year: number;
  month?: number;
}

export function useMonthlyReport(month: number, year: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.monthlyReport(month, year),
    queryFn: async () => (await api.get<MonthlyReport>('/reports/monthly', { params: { month, year } })).data,
    enabled,
    staleTime: 30_000,
  });
}

export function useYearlyReport(year: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.yearlyReport(year),
    queryFn: async () => (await api.get<YearlyReport>('/reports/yearly', { params: { year } })).data,
    enabled,
    staleTime: 30_000,
  });
}

const filenameFrom = (disposition: string | undefined, fallback: string) =>
  /filename="?([^";]+)"?/i.exec(disposition ?? '')?.[1] ?? fallback;

/**
 * Downloads the streamed export. It goes through the Axios instance (the access token is in
 * memory, so a bare <a href> couldn't authenticate), then hands the blob to the browser's
 * native download.
 */
export async function downloadReport(params: ExportParams): Promise<string> {
  const res = await api.get<Blob>('/reports/export', { params, responseType: 'blob' });
  const filename = filenameFrom(
    res.headers['content-disposition'] as string | undefined,
    `rupeeflow-report.${params.format}`,
  );
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export function useExportReport() {
  return useMutation({ mutationFn: downloadReport });
}
