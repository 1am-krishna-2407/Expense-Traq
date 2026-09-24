import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { Expense, ExpenseFilters, SortBy } from '../api/types';
import { PageHeader } from '../components/layout/PageHeader';
import { useQuickAdd } from '../components/layout/QuickAdd';
import { Badge, CategoryChip, CategoryIconTile } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { Pagination } from '../components/ui/Pagination';
import { ResponsiveTable, type Column } from '../components/ui/ResponsiveTable';
import { usePeriod } from '../context/PeriodContext';
import { useToast } from '../context/ToastContext';
import { useCategories } from '../features/categories/hooks';
import { useDashboardSummary } from '../features/dashboard/hooks';
import { ExpenseFilterBar } from '../features/expenses/ExpenseFilterBar';
import { EMPTY_FILTERS, validateFilters, type FilterValues } from '../features/expenses/filters';
import { useDeleteExpense, useExpenses } from '../features/expenses/hooks';
import { useExportReport } from '../features/reports/hooks';
import { colorOf } from '../lib/categoryIcons';
import { periodProgress, periodRange } from '../lib/dates';
import { formatDate, formatINR, formatPercent } from '../lib/format';
import { useDebouncedValue } from '../lib/useDebouncedValue';

export function ExpensesPage() {
  const { period } = usePeriod();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openExpense } = useQuickAdd();
  const toast = useToast();

  // Filter/sort/page state is local to the page (Plan §15 "List").
  const [filters, setFilters] = useState<FilterValues>(() => ({
    ...EMPTY_FILTERS,
    ...periodRange(period),
    search: searchParams.get('search') ?? '',
  }));
  const [sort, setSort] = useState<{ sortBy: SortBy; sortOrder: 'asc' | 'desc' }>({ sortBy: 'expenseDate', sortOrder: 'desc' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  // The top-bar month picker drives the default date window.
  useEffect(() => {
    setFilters((f) => ({ ...f, ...periodRange(period) }));
    setPage(1);
  }, [period]);

  // The top-bar search box navigates here with ?search=
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setFilters((f) => ({ ...f, search: q }));
      setPage(1);
    }
  }, [searchParams]);

  const search = useDebouncedValue(filters.search.trim());
  const filterErrors = validateFilters(filters);
  const valid = Object.keys(filterErrors).length === 0;

  const query: Partial<ExpenseFilters> = useMemo(
    () => ({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      categoryId: filters.categoryId || undefined,
      minAmount: filters.minAmount === '' ? undefined : Number(filters.minAmount),
      maxAmount: filters.maxAmount === '' ? undefined : Number(filters.maxAmount),
      search: search || undefined,
      page,
      limit,
      ...sort,
    }),
    [filters.startDate, filters.endDate, filters.categoryId, filters.minAmount, filters.maxAmount, search, page, limit, sort],
  );

  // While the user is mid-edit on an invalid combination (e.g. min > max) keep showing the
  // last valid result instead of firing a request the API would reject with 400.
  const [appliedQuery, setAppliedQuery] = useState(query);
  useEffect(() => {
    if (valid) setAppliedQuery(query);
  }, [query, valid]);

  const list = useExpenses(appliedQuery);
  const { data: categories = [] } = useCategories(true);
  const summary = useDashboardSummary(period.month, period.year);
  const deleteExpense = useDeleteExpense();
  const exportReport = useExportReport();

  const updateFilters = (next: FilterValues) => {
    setFilters(next);
    setPage(1);
    if (searchParams.has('search') && next.search !== searchParams.get('search')) {
      searchParams.delete('search');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const toggleSort = (key: string) => {
    const k = key as SortBy;
    setSort((s) => ({ sortBy: k, sortOrder: s.sortBy === k && s.sortOrder === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    deleteExpense.mutate(target.id, {
      onSuccess: () => toast.success('Expense deleted', 'Totals and budgets have been recalculated.'),
      onError: (err) => toast.error('Couldn’t delete expense', errorMessage(err)),
    });
  };

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'Date',
      sortKey: 'expenseDate',
      mobile: 'subtitle',
      className: 'whitespace-nowrap',
      render: (e) => (
        <span className="tnum text-ink-2">
          <span className="md:hidden">{formatDate(e.expenseDate, 'd MMM yyyy')}</span>
          <span className="hidden md:inline">
            <span className="block font-semibold text-ink">{formatDate(e.expenseDate)}</span>
            <span className="text-body-sm text-subtle">{formatDate(e.expenseDate, 'EEEE')}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      mobile: 'meta',
      render: (e) => <CategoryChip name={e.category.name} color={e.category.color} archived={e.category.isArchived} />,
    },
    {
      key: 'description',
      header: 'Description',
      mobile: 'title',
      className: 'w-full max-w-0',
      render: (e) => (
        <span className="flex min-w-0 items-center gap-3">
          <span className="hidden md:block">
            <CategoryIconTile name={e.category.name} color={e.category.color} size="sm" />
          </span>
          <span className="truncate font-semibold text-ink" title={e.description ?? undefined}>
            {e.description || <span className="font-normal italic text-subtle">No description</span>}
          </span>
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (INR)',
      sortKey: 'amount',
      align: 'right',
      mobile: 'value',
      className: 'whitespace-nowrap',
      render: (e) => <span className="tnum font-semibold text-ink">{formatINR(e.amount, { decimals: 'always' })}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      mobile: 'actions',
      className: 'whitespace-nowrap',
      render: (e) => (
        <span className="inline-flex gap-0.5">
          <IconButton icon="edit" label={`Edit ${e.description || 'expense'}`} onClick={() => openExpense(e)} />
          <IconButton icon="delete" tone="danger" label={`Delete ${e.description || 'expense'}`} onClick={() => setPendingDelete(e)} />
        </span>
      ),
    },
  ];

  const s = summary.data;
  const txCount = s?.categorySummary.reduce((n, c) => n + c.transactionCount, 0) ?? 0;
  const { elapsed } = periodProgress(period);
  const topCategories = (s?.categorySummary ?? []).filter((c) => c.spent > 0).slice(0, 4);
  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;

  return (
    <>
      <PageHeader
        title="Expenses"
        badge={meta && <Badge tone="primary">{meta.total} matching</Badge>}
        subtitle="Track, filter and audit your personal transactions."
        actions={
          <>
            <Button
              variant="secondary"
              icon="download"
              loading={exportReport.isPending}
              onClick={() =>
                exportReport.mutate(
                  { format: 'csv', period: 'monthly', month: period.month, year: period.year },
                  {
                    onSuccess: (name) => toast.success('Report ready', `${name} downloaded.`),
                    onError: (err) => toast.error('Export failed', errorMessage(err)),
                  },
                )
              }
            >
              Export CSV
            </Button>
            <Button icon="add" onClick={() => openExpense()}>
              Add Expense
            </Button>
          </>
        }
      />

      {/* Month context — server-aggregated, never summed from this page's rows */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-soft text-primary-fg dark:bg-primary/15">
            <Icon name="calendar_month" size={20} />
          </span>
          <div className="min-w-0">
            <p className="label-caps truncate">Total this month</p>
            {s ? (
              <p className="tnum truncate font-heading text-headline-sm font-bold text-ink">
                {formatINR(s.totalExpenses)}{' '}
                <span className="hidden text-body-sm font-medium text-subtle sm:inline">({txCount} txns)</span>
              </p>
            ) : (
              <Skeleton className="mt-1 h-5 w-24" />
            )}
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-success/10 text-success-fg">
            <Icon name="trending_up" size={20} />
          </span>
          <div className="min-w-0">
            <p className="label-caps truncate">Avg daily pace</p>
            {s ? (
              <p className="tnum truncate font-heading text-headline-sm font-bold text-ink">{formatINR(elapsed ? Math.round(s.totalExpenses / elapsed) : 0)}</p>
            ) : (
              <Skeleton className="mt-1 h-5 w-20" />
            )}
          </div>
        </div>
        {topCategories.slice(0, 2).map((c) => (
          <div key={c.categoryId} className="card hidden items-center gap-3 p-4 lg:flex">
            <CategoryIconTile name={c.categoryName} color={c.categoryColor} />
            <div className="min-w-0">
              <p className="label-caps truncate">{c.categoryName}</p>
              <p className="tnum truncate font-heading text-headline-sm font-bold text-ink">
                {formatINR(c.spent)}{' '}
                <span className="text-body-sm font-medium" style={{ color: colorOf(c.categoryColor) }}>
                  {formatPercent(s && s.totalExpenses ? (c.spent / s.totalExpenses) * 100 : 0, 0)}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <ExpenseFilterBar value={filters} onChange={updateFilters} categories={categories} />

      <div className="card mt-6 overflow-hidden">
        {list.isPending ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading expenses">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorBanner className="m-4" message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="search_off"
            title={JSON.stringify(filters) === JSON.stringify(EMPTY_FILTERS) ? 'No expenses yet' : 'No expenses match these filters'}
            message="Try widening the date range or clearing a filter — or record a new expense."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" icon="filter_alt_off" onClick={() => updateFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
                <Button icon="add" onClick={() => openExpense()}>
                  Add expense
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <ResponsiveTable
              caption="Expenses"
              columns={columns}
              rows={rows}
              rowKey={(e) => e.id}
              sort={{ key: sort.sortBy, order: sort.sortOrder }}
              onSort={toggleSort}
              busy={list.isFetching && !list.isPending}
            />
            {meta && (
              <div className="border-t border-line">
                <Pagination
                  meta={meta}
                  onPageChange={setPage}
                  onLimitChange={(l) => {
                    setLimit(l);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this expense?"
        message={
          pendingDelete && (
            <>
              <strong className="text-ink">{pendingDelete.description || pendingDelete.category.name}</strong> ·{' '}
              {formatINR(pendingDelete.amount)} on {formatDate(pendingDelete.expenseDate)} will be permanently removed and your
              totals recalculated.
            </>
          )
        }
        confirmLabel="Delete expense"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
