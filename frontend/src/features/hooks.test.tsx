import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../api/client';
import { createTestQueryClient } from '../test/utils';
import { useBudgets } from './budgets/hooks';
import { useDashboardSummary } from './dashboard/hooks';
import { useCreateExpense, useDeleteExpense, useExpenses } from './expenses/hooks';
import { MONTH, YEAR } from '../test/msw/data';

function setup() {
  tokenStore.set('test-token');
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('expense mutations keep dependent caches correct (Plan §13)', () => {
  it('creating an expense invalidates expenses, budgets and dashboard', async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        list: useExpenses({ page: 1, limit: 20, sortBy: 'expenseDate', sortOrder: 'desc' }),
        budgets: useBudgets(MONTH, YEAR),
        dashboard: useDashboardSummary(MONTH, YEAR),
        create: useCreateExpense(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess && result.current.budgets.isSuccess && result.current.dashboard.isSuccess).toBe(true));
    const before = {
      list: result.current.list.dataUpdatedAt,
      budgets: result.current.budgets.dataUpdatedAt,
      dashboard: result.current.dashboard.dataUpdatedAt,
    };

    await act(() => result.current.create.mutateAsync({ categoryId: 'c-food', amount: 99, expenseDate: `${YEAR}-01-05`, description: 'New' }));

    await waitFor(() => {
      expect(result.current.list.dataUpdatedAt).toBeGreaterThan(before.list);
      expect(result.current.budgets.dataUpdatedAt).toBeGreaterThan(before.budgets);
      expect(result.current.dashboard.dataUpdatedAt).toBeGreaterThan(before.dashboard);
    });
    expect(result.current.list.data?.meta.total).toBe(4);
    expect(client.isMutating()).toBe(0);
  });

  it('delete removes the row optimistically before the server answers, then refetches', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({ list: useExpenses({ page: 1, limit: 20, sortBy: 'expenseDate', sortOrder: 'desc' }), del: useDeleteExpense() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data?.data).toHaveLength(3));

    act(() => result.current.del.mutate('e-1'));
    await waitFor(() => expect(result.current.list.data?.data.map((e) => e.id)).not.toContain('e-1'));
    await waitFor(() => expect(result.current.del.isSuccess).toBe(true));
    expect(result.current.list.data?.meta.total).toBe(2);
  });
});
