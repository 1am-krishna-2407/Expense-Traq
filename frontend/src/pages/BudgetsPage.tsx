import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { errorMessage } from '../api/client';
import type { Budget } from '../api/types';
import { CategoryDonut } from '../components/charts/LazyCharts';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge, CategoryIconTile, StatusPill } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, Segmented, StatCard } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner, Skeleton, SkeletonCards } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { MonthPicker } from '../components/ui/MonthPicker';
import { ProgressBar } from '../components/ui/ProgressBar';
import { usePeriod } from '../context/PeriodContext';
import { useToast } from '../context/ToastContext';
import { BudgetFormModal } from '../features/budgets/BudgetFormModal';
import { useBudgets, useDeleteBudget } from '../features/budgets/hooks';
import { useCategories } from '../features/categories/hooks';
import { budgetStatus, STATUS_BAR, STATUS_TEXT } from '../lib/budgetStatus';
import { colorOf } from '../lib/categoryIcons';
import { periodProgress } from '../lib/dates';
import { formatCompactINR, formatINR, formatPercent, monthLabel, shortMonth } from '../lib/format';

type Filter = 'all' | 'on-track' | 'attention';

function BudgetCard({ b, daysLeft, onEdit, onDelete }: { b: Budget; daysLeft: number; onEdit: () => void; onDelete: () => void }) {
  const status = budgetStatus(b.percentUsed);
  const over = b.remaining < 0;
  const perDay = daysLeft > 0 && !over ? b.remaining / daysLeft : null;
  return (
    <article className="card p-5">
      <div className="flex items-start gap-3">
        <CategoryIconTile name={b.categoryName} color={b.categoryColor} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-headline-sm text-ink">{b.categoryName}</h3>
          <p className="text-body-sm text-muted">
            {monthLabel(b.month, b.year)}
            {b.categoryArchived && ' · archived category'}
          </p>
        </div>
        <StatusPill status={status} />
        <div className="flex">
          <IconButton icon="edit" label={`Edit ${b.categoryName} budget`} onClick={onEdit} />
          <IconButton icon="delete" tone="danger" label={`Delete ${b.categoryName} budget`} onClick={onDelete} />
        </div>
      </div>

      <dl className="tnum mt-4 grid grid-cols-3 gap-2 rounded-control bg-surface-2 px-3 py-2.5 dark:bg-canvas">
        <div>
          <dt className="text-body-sm text-subtle">Budget</dt>
          <dd className="font-semibold text-ink">{formatINR(b.limitAmount)}</dd>
        </div>
        <div>
          <dt className="text-body-sm text-subtle">Spent</dt>
          <dd className={clsx('font-semibold', over ? 'text-danger-fg' : 'text-ink')}>{formatINR(b.spent)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-body-sm text-subtle">Remaining</dt>
          <dd className={clsx('font-semibold', over ? 'text-danger-fg' : 'text-success-fg')}>{formatINR(b.remaining)}</dd>
        </div>
      </dl>

      <ProgressBar className="mt-4" percent={b.percentUsed} label={`${b.categoryName} utilisation`} barClassName={STATUS_BAR[status]} />
      <div className="tnum mt-2 flex flex-wrap justify-between gap-2 text-body-sm">
        <span className={clsx('font-medium', STATUS_TEXT[status])}>{formatPercent(b.percentUsed)} utilized</span>
        {over ? (
          <span className="flex items-center gap-1 text-danger-fg">
            <Icon name="notifications_active" size={14} />
            {formatINR(Math.abs(b.remaining))} over the limit
          </span>
        ) : status === 'near-limit' ? (
          <span className="flex items-center gap-1 text-warning-fg">
            <Icon name="info" size={14} />
            Approaching the limit
          </span>
        ) : perDay !== null ? (
          <span className="text-muted">{formatINR(Math.floor(perDay))} / day safe to spend</span>
        ) : (
          <span className="text-muted">{daysLeft === 0 ? 'Period closed' : 'Within limit'}</span>
        )}
      </div>
    </article>
  );
}

export function BudgetsPage() {
  const { period, setPeriod } = usePeriod();
  const toast = useToast();
  const budgets = useBudgets(period.month, period.year);
  const { data: categories = [] } = useCategories(false);
  const deleteBudget = useDeleteBudget();

  const [filter, setFilter] = useState<Filter>('all');
  const [modal, setModal] = useState<{ open: boolean; budget?: Budget | null; presetCategoryId?: string }>({ open: false });
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);

  const list = useMemo(() => budgets.data ?? [], [budgets.data]);
  const { remaining: daysLeft, total: daysTotal } = periodProgress(period);

  // Totals over the handful of budget rows the API already aggregated.
  const totals = useMemo(() => {
    const limit = list.reduce((a, b) => a + b.limitAmount, 0);
    const spent = list.reduce((a, b) => a + b.spent, 0);
    return { limit, spent, remaining: limit - spent };
  }, [list]);

  const counts = useMemo(() => {
    const by = { 'on-track': 0, 'near-limit': 0, over: 0 };
    list.forEach((b) => {
      const s = budgetStatus(b.percentUsed);
      if (s !== 'none') by[s] += 1;
    });
    return by;
  }, [list]);

  const visible = list.filter((b) => {
    const s = budgetStatus(b.percentUsed);
    if (filter === 'on-track') return s === 'on-track';
    if (filter === 'attention') return s === 'near-limit' || s === 'over';
    return true;
  });

  const unbudgeted = categories.filter((c) => !list.some((b) => b.categoryId === c.id));
  const usage = totals.limit > 0 ? (totals.spent / totals.limit) * 100 : 0;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteBudget.mutate(target.id, {
      onSuccess: () => {
        toast.success('Budget deleted', `${target.categoryName} is now unbudgeted for ${monthLabel(target.month, target.year)}. Expenses are unchanged.`);
        setPendingDelete(null);
      },
      onError: (err) => toast.error('Couldn’t delete budget', errorMessage(err)),
    });
  };

  return (
    <>
      <PageHeader
        title="Budgets"
        badge={budgets.data && <Badge tone="success">{list.length} active envelope{list.length === 1 ? '' : 's'}</Badge>}
        subtitle="Set monthly spending limits per category and watch each envelope deplete in real time."
        actions={
          <Button icon="add_circle" onClick={() => setModal({ open: true })}>
            Create Budget
          </Button>
        }
      />

      {budgets.isPending ? (
        <SkeletonCards />
      ) : budgets.isError ? (
        <ErrorBanner message={errorMessage(budgets.error)} onRetry={() => budgets.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total allocated" icon="account_balance_wallet" value={formatINR(totals.limit)} meter={100}>
            Across {list.length} budgeted categor{list.length === 1 ? 'y' : 'ies'}
          </StatCard>
          <StatCard label="Total spent" icon="trending_up" accent="neutral" value={formatINR(totals.spent)} meter={usage}>
            <span className="font-medium text-primary-fg">{formatPercent(usage)}</span> of allocation used
          </StatCard>
          <StatCard
            label="Total remaining"
            icon="savings"
            accent={totals.remaining < 0 ? 'danger' : 'success'}
            value={formatINR(totals.remaining)}
            valueClassName={totals.remaining < 0 ? 'text-danger-fg' : 'text-success-fg'}
            meter={totals.limit > 0 ? Math.max(0, (totals.remaining / totals.limit) * 100) : 0}
          >
            {daysLeft > 0 ? `${daysLeft} of ${daysTotal} days left in ${shortMonth(period.month)}` : 'Period closed'}
          </StatCard>
          <StatCard label="Health status" icon="health_and_safety" accent={counts.over ? 'danger' : counts['near-limit'] ? 'warning' : 'success'} value={`${counts['on-track']}/${list.length || 0}`}>
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-success-fg">{counts['on-track']} on track</span>
              <span className="text-warning-fg">{counts['near-limit']} near limit</span>
              <span className="text-danger-fg">{counts.over} over</span>
            </span>
          </StatCard>
        </div>
      )}

      <div className="card mt-6 flex flex-col items-start justify-between gap-3 p-3 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker variant="stepper" value={period} onChange={setPeriod} />
          <span className="text-body-sm text-muted">
            Financial period: 1 – {daysTotal} {shortMonth(period.month)} {period.year}
          </span>
        </div>
        <Segmented<Filter>
          ariaLabel="Filter budgets"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: list.length },
            { value: 'on-track', label: 'On Track', count: counts['on-track'] },
            { value: 'attention', label: 'Warning / Over', count: counts['near-limit'] + counts.over },
          ]}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          {budgets.isPending ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 w-full rounded-card" />)
          ) : budgets.isError ? null : list.length === 0 ? (
            <Card>
              <EmptyState
                icon="account_balance_wallet"
                title={`No budgets for ${monthLabel(period.month, period.year)}`}
                message="Create a monthly limit for a category to start tracking spend against it."
                action={
                  <Button icon="add" onClick={() => setModal({ open: true })}>
                    Create your first budget
                  </Button>
                }
              />
            </Card>
          ) : visible.length === 0 ? (
            <Card>
              <EmptyState icon="filter_alt_off" title="Nothing in this view" message="No budgets match this status filter." className="py-8" />
            </Card>
          ) : (
            visible.map((b) => (
              <BudgetCard
                key={b.id}
                b={b}
                daysLeft={daysLeft}
                onEdit={() => setModal({ open: true, budget: b })}
                onDelete={() => setPendingDelete(b)}
              />
            ))
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <CardHeader title="Allocation Split" action={<span className="text-body-sm text-muted">{monthLabel(period.month, period.year)}</span>} />
            <div className="mx-auto mt-4 aspect-square w-full max-w-[200px]">
              <CategoryDonut
                data={list.map((b) => ({ name: b.categoryName, value: b.limitAmount, color: colorOf(b.categoryColor) }))}
                centerLabel="Allocated"
                centerValue={formatCompactINR(totals.limit)}
              />
            </div>
            <ul className="tnum mt-4 space-y-2">
              {[...list]
                .sort((a, b) => b.limitAmount - a.limitAmount)
                .map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-body-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(b.categoryColor) }} />
                    <span className="flex-1 truncate text-ink-2">{b.categoryName}</span>
                    <span className="font-semibold text-ink">{formatINR(b.limitAmount)}</span>
                    <span className="w-12 text-right text-subtle">{totals.limit ? formatPercent((b.limitAmount / totals.limit) * 100) : '—'}</span>
                  </li>
                ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-white">
                <Icon name="playlist_add" size={20} />
              </span>
              <div>
                <h2 className="font-heading text-headline-sm text-ink">Unbudgeted categories</h2>
                <p className="text-body-sm text-muted">Spend here isn’t capped this month — it still counts toward your totals.</p>
              </div>
            </div>
            {unbudgeted.length === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-body-sm font-medium text-success-fg">
                <Icon name="check_circle" size={18} />
                Every active category has a budget.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {unbudgeted.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-control border border-line px-3 py-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(c.color) }} />
                    <span className="flex-1 truncate font-medium text-ink">{c.name}</span>
                    <Button size="sm" variant="soft" onClick={() => setModal({ open: true, presetCategoryId: c.id })}>
                      Set limit
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <BudgetFormModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        period={period}
        existing={list}
        budget={modal.budget}
        presetCategoryId={modal.presetCategoryId}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this budget?"
        message={
          pendingDelete && (
            <>
              The <strong className="text-ink">{pendingDelete.categoryName}</strong> limit of {formatINR(pendingDelete.limitAmount)} for{' '}
              {monthLabel(pendingDelete.month, pendingDelete.year)} will be removed. Your expenses stay exactly as they are.
            </>
          )
        }
        confirmLabel="Delete budget"
        loading={deleteBudget.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
