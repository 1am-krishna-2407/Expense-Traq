import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Budget, BudgetInput } from '../../api/types';
import { queryKeys } from '../queryKeys';

export const budgetsApi = {
  list: async (month: number, year: number) => (await api.get<Budget[]>('/budgets', { params: { month, year } })).data,
  create: async (input: BudgetInput) => (await api.post<Budget>('/budgets', input)).data,
  /** Only the limit is editable (Plan §11). */
  update: async ({ id, limitAmount }: { id: string; limitAmount: number }) =>
    (await api.patch<Budget>(`/budgets/${id}`, { limitAmount })).data,
  remove: async (id: string) => {
    await api.delete(`/budgets/${id}`);
  },
};

export function useBudgets(month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.budgets(month, year),
    queryFn: () => budgetsApi.list(month, year),
    staleTime: 15_000,
  });
}

/** Budget changes move dashboard/report totals too. */
function useInvalidateBudgetViews() {
  const qc = useQueryClient();
  return () => Promise.all([['budgets'], ['dashboard'], ['reports']].map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useCreateBudget() {
  const invalidate = useInvalidateBudgetViews();
  return useMutation({ mutationFn: budgetsApi.create, onSuccess: invalidate });
}

export function useUpdateBudget() {
  const invalidate = useInvalidateBudgetViews();
  return useMutation({ mutationFn: budgetsApi.update, onSuccess: invalidate });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgetViews();
  return useMutation({ mutationFn: budgetsApi.remove, onSuccess: invalidate });
}
