import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { DashboardSummary } from '../../api/types';
import { queryKeys } from '../queryKeys';

/** Server-aggregated numbers only — the browser never sums raw expenses (Plan §17). */
export function useDashboardSummary(month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.dashboard(month, year),
    queryFn: async () =>
      (await api.get<DashboardSummary>('/dashboard/summary', { params: { month, year } })).data,
    staleTime: 30_000,
  });
}
