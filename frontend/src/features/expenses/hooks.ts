import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Expense, ExpenseFilters, ExpenseInput, Paginated } from '../../api/types';
import { queryKeys, SPEND_DEPENDENT_KEYS } from '../queryKeys';

/** Drops empty values so the query string (and the cache key) only carry active filters. */
export function cleanFilters(filters: Partial<ExpenseFilters>): Partial<ExpenseFilters> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  ) as Partial<ExpenseFilters>;
}

export const expensesApi = {
  list: async (filters: Partial<ExpenseFilters>) =>
    (await api.get<Paginated<Expense>>('/expenses', { params: cleanFilters(filters) })).data,
  create: async (input: ExpenseInput) => (await api.post<Expense>('/expenses', input)).data,
  update: async ({ id, ...patch }: Partial<ExpenseInput> & { id: string }) =>
    (await api.patch<Expense>(`/expenses/${id}`, patch)).data,
  remove: async (id: string) => {
    await api.delete(`/expenses/${id}`);
  },
};

/** Changing any filter changes the key → automatic refetch (Plan §15 "Filter"). */
export function useExpenses(filters: Partial<ExpenseFilters>) {
  const clean = cleanFilters(filters);
  return useQuery({
    queryKey: queryKeys.expenses(clean),
    queryFn: () => expensesApi.list(clean),
    placeholderData: keepPreviousData, // keep the table steady while paging
    staleTime: 10_000,
  });
}

function useInvalidateSpend() {
  const qc = useQueryClient();
  return () => Promise.all(SPEND_DEPENDENT_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey: [...queryKey] })));
}

/** Create/update wait for the server (it returns the joined category) — Plan §13. */
export function useCreateExpense() {
  const invalidate = useInvalidateSpend();
  return useMutation({ mutationFn: expensesApi.create, onSuccess: invalidate });
}

export function useUpdateExpense() {
  const invalidate = useInvalidateSpend();
  return useMutation({ mutationFn: expensesApi.update, onSuccess: invalidate });
}

type ListSnapshot = [readonly unknown[], Paginated<Expense> | undefined][];

/**
 * Optimistic delete (the one optimistic mutation, Plan §13): the row disappears from every
 * cached expense list immediately and is restored from the snapshot if the server fails.
 */
export function useDeleteExpense() {
  const qc = useQueryClient();
  const invalidate = useInvalidateSpend();
  return useMutation<void, unknown, string, { snapshot: ListSnapshot }>({
    mutationFn: expensesApi.remove,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['expenses'] });
      const snapshot = qc.getQueriesData<Paginated<Expense>>({ queryKey: ['expenses'] }) as ListSnapshot;
      qc.setQueriesData<Paginated<Expense>>({ queryKey: ['expenses'] }, (old) =>
        old?.data
          ? { data: old.data.filter((e) => e.id !== id), meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) } }
          : old,
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: invalidate,
  });
}
