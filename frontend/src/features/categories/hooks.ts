import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Category } from '../../api/types';
import { queryKeys } from '../queryKeys';

export interface CategoryInput {
  name: string;
  color?: string | null;
}

export const categoriesApi = {
  list: async (includeArchived: boolean) =>
    (await api.get<Category[]>('/categories', { params: { includeArchived } })).data,
  create: async (input: CategoryInput) => (await api.post<Category>('/categories', input)).data,
  update: async ({ id, ...patch }: Partial<Category> & { id: string }) =>
    (await api.patch<Category>(`/categories/${id}`, patch)).data,
  archive: async (id: string) => {
    await api.delete(`/categories/${id}`);
  },
};

export function useCategories(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.categories(includeArchived),
    queryFn: () => categoriesApi.list(includeArchived),
    staleTime: 60_000,
  });
}

/** Category changes rename/recolour rows everywhere, so every dependent view refetches. */
function useInvalidateCategoryViews() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [['categories'], ['expenses'], ['budgets'], ['dashboard'], ['reports']].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategoryViews();
  return useMutation({ mutationFn: categoriesApi.create, onSuccess: invalidate });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategoryViews();
  return useMutation({ mutationFn: categoriesApi.update, onSuccess: invalidate });
}

export function useArchiveCategory() {
  const invalidate = useInvalidateCategoryViews();
  return useMutation({ mutationFn: categoriesApi.archive, onSuccess: invalidate });
}
