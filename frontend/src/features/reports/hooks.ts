import { useMutation, useQuery } from '@tanstack/react-query';
import { api, downloadFile } from '../../api/client';
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

export const downloadReport = (params: ExportParams): Promise<string> =>
  downloadFile('/reports/export', params, `rupeeflow-report.${params.format}`);

export function useExportReport() {
  return useMutation({ mutationFn: downloadReport });
}
