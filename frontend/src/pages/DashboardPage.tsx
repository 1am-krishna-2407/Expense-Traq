import clsx from 'clsx';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { CategorySummaryItem, DashboardSummary, Expense } from '../api/types';
import { CategoryDonut, TrendChart } from '../components/charts/LazyCharts';
import { PageHeader } from '../components/layout/PageHeader';
import { useQuickAdd } from '../components/layout/QuickAdd';
import { CategoryIconTile, StatusPill } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, StatCard } from '../components/ui/Card';
import { EmptyState, ErrorBanner, Skeleton, SkeletonCards } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useAuth } from '../context/AuthContext';
import { usePeriod } from '../context/PeriodContext';
import { useDashboardSummary } from '../features/dashboard/hooks';
import { useExpenses } from '../features/expenses/hooks';
import { budgetStatus, STATUS_BAR } from '../lib/budgetStatus';
import { colorOf } from '../lib/categoryIcons';
import { periodProgress, periodRange } from '../lib/dates';
import { firstName, formatCompactINR, formatDate, formatINR, formatPercent, greeting, monthLabel, shortMonth } from '../lib/format';

function SummaryCards({ s }: { s: DashboardSummary }) {
  const budgeted = s.categorySummary.filter((c) => c.budget !== null).length;
  const txCount = s.categorySummary.reduce((n, c) => n + c.transactionCount, 0);
  const usage = s.totalBudget > 0 ? (s.totalExpenses / s.totalBudget) * 100 : null;
  const over = s.remainingBudget < 0;
  const { remaining: daysLeft } = periodProgress(s.period);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total expenses" icon="trending_down" value={formatINR(s.totalExpenses)} meter={usage ?? 0}>
        <span className="tnum">{txCount} transaction{txCount === 1 ? '' : 's'} this month</span>
      </StatCard>
      <StatCard label="Total budget" icon="savings" accent="neutral" value={formatINR(s.totalBudget)}>
        {budgeted > 0 ? `Monthly limits across ${budgeted} categor${budgeted === 1 ? 'y' : 'ies'}` : 'No budgets set for this month'}
      </StatCard>
      <StatCard
        label="Remaining budget"
        icon={over ? 'lock_open' : 'lock'}
        accent={over ? 'danger' : 'success'}
        value={formatINR(s.remainingBudget)}
        valueClassName={over ? 'text-danger-fg' : undefined}
      >
        {s.totalBudget === 0 ? (
          'Set a budget to track what’s left'
        ) : over ? (
          <span className="font-medium text-danger-fg">Over budget by {formatINR(Math.abs(s.remainingBudget))}</span>
        ) : (
          <span>
            {formatPercent((s.remainingBudget / s.totalBudget) * 100)} left
            {daysLeft > 0 && ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remain`}
          </span>
        )}
      </StatCard>
      <StatCard label="Budget usage" icon="donut_large" accent={usage !== null && usage > 100 ? 'danger' : usage !== null && usage >= 85 ? 'warning' : 'primary'} value={usage === null ? '—' : formatPercent(usage)}>
        {usage === null ? (
          'No limits to measure against'
        ) : (
          <div className="space-y-1.5">
            <ProgressBar percent={usage} label="Overall budget usage" barClassName={STATUS_BAR[budgetStatus(usage)]} />
            <span className="tnum">
              {formatINR(s.totalExpenses)} of {formatINR(s.totalBudget)}
            </span>
          </div>
        )}
      </StatCard>
    </div>
  );
}

function BreakdownLegend({ items, total }: { items: CategorySummaryItem[]; total: number }) {
  return (
    <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {items.map((c) => (
        <li key={c.categoryId} className="flex items-center gap-2 rounded-control border border-line bg-surface-2 px-2.5 py-2 dark:bg-canvas">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(c.categoryColor) }} />
          <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink-2" title={c.categoryName}>
            {c.categoryName}
          </span>
          <span className="tnum text-body-sm font-semibold text-ink">{formatCompactINR(c.spent)}</span>
          <span className="tnum rounded bg-primary/10 px-1 text-[11px] font-semibold text-primary-fg">{total > 0 ? Math.round((c.spent / total) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  );
}

function UtilizationList({ items }: { items: CategorySummaryItem[] }) {
  const budgeted = items.filter((c) => c.budget !== null).sort((a, b) => (b.percentUsed ?? 0) - (a.percentUsed ?? 0));
  if (budgeted.length === 0) {
    return (
      <EmptyState
        icon="account_balance_wallet"
        title="No budgets this month"
        message="Set a monthly limit per category to see spend against it here."
        action={
          <Link to="/budgets">
            <Button size="sm" variant="soft" icon="add">
              Set a budget
            </Button>
          </Link>
        }
        className="py-8"
      />
    );
  }
  return (
    <ul className="mt-4 divide-y divide-line">
      {budgeted.map((c) => {
        const status = budgetStatus(c.percentUsed);
        const pct = c.percentUsed ?? 0;
        return (
          <li key={c.categoryId} className="py-3.5 first:pt-0 last:pb-0">
            <div className="mb-2 flex items-center gap-3">
              <CategoryIconTile name={c.categoryName} color={c.categoryColor} size="sm" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{c.categoryName}</span>
              <span className="tnum hidden text-body-sm sm:inline">
                <span className={clsx('font-semibold', status === 'over' ? 'text-danger-fg' : 'text-ink')}>{formatINR(c.spent)}</span>
                <span className="text-subtle"> / {formatINR(c.budget ?? 0)}</span>
              </span>
              <StatusPill status={status} />
            </div>
            <ProgressBar
              percent={pct}
              label={`${c.categoryName} budget usage`}
              color={status === 'over' ? undefined : colorOf(c.categoryColor)}
              barClassName={status === 'over' ? 'bg-danger' : undefined}
            />
            <div className="tnum mt-1.5 flex justify-between text-body-sm">
              <span className={status === 'over' ? 'font-medium text-danger-fg' : 'text-muted'}>
                {status === 'over' ? `${formatPercent(pct)} used (+${formatPercent(pct - 100)})` : `${formatPercent(pct)} spent`}
              </span>
              <span className={(c.remaining ?? 0) < 0 ? 'font-medium text-danger-fg' : 'text-muted'}>
                {(c.remaining ?? 0) < 0 ? `${formatINR(Math.abs(c.remaining ?? 0))} over` : `${formatINR(c.remaining ?? 0)} remaining`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RecentExpenses({ expenses, loading }: { expenses: Expense[]; loading: boolean }) {
  const { openExpense } = useQuickAdd();
  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (expenses.length === 0) {
    return <EmptyState icon="receipt_long" title="No expenses yet" message="Transactions you add this month will appear here." className="py-8" />;
  }
  return (
    <ul className="mt-3 divide-y divide-line">
      {expenses.map((e) => (
        <li key={e.id}>
          <button type="button" onClick={() => openExpense(e)} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 py-3 text-left transition-colors hover:bg-hover">
            <CategoryIconTile name={e.category.name} color={e.category.color} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{e.description || e.category.name}</p>
              <p className="truncate text-body-sm text-muted">
                {formatDate(e.expenseDate, 'd MMM')} • {e.category.name}
              </p>
            </div>
            <span className="tnum font-semibold text-ink">−{formatINR(e.amount)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { period } = usePeriod();
  const { openExpense } = useQuickAdd();
  const navigate = useNavigate();
  const summary = useDashboardSummary(period.month, period.year);
  const recent = useExpenses({ ...periodRange(period), page: 1, limit: 5, sortBy: 'expenseDate', sortOrder: 'desc' });

  const s = summary.data;
  const spending = useMemo(() => (s ? s.categorySummary.filter((c) => c.spent > 0) : []), [s]);
  const trend = useMemo(() => (s ? s.monthlyTrend.map((m) => ({ label: `${shortMonth(m.month)} ${String(m.year).slice(2)}`, total: m.total })) : []), [s]);
  const isEmpty = !!s && s.totalExpenses === 0 && s.totalBudget === 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user ? firstName(user.name) : ''}`}
        subtitle={`Here’s your financial overview for ${monthLabel(period.month, period.year)}.`}
        actions={
          <>
            <Button variant="soft" icon="account_balance_wallet" onClick={() => navigate('/budgets')}>
              Set Budget
            </Button>
            <Button icon="add" onClick={() => openExpense()}>
              Add Expense
            </Button>
          </>
        }
      />

      {summary.isPending ? (
        <SkeletonCards />
      ) : summary.isError ? (
        <ErrorBanner message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          <SummaryCards s={s!} />

          {isEmpty ? (
            <Card className="p-2">
              <EmptyState
                icon="rocket_launch"
                title={`Nothing recorded for ${monthLabel(period.month, period.year)}`}
                message="Add your first expense or set a monthly budget, and this dashboard fills in automatically."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button icon="add" onClick={() => openExpense()}>
                      Add your first expense
                    </Button>
                    <Button variant="secondary" icon="account_balance_wallet" onClick={() => navigate('/budgets')}>
                      Set a budget
                    </Button>
                  </div>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="flex flex-col p-5 xl:col-span-2">
                  <CardHeader
                    title="Spending Trend"
                    badge={<span className="rounded bg-surface-3 px-2 py-0.5 text-label-md text-ink-2">Last 6 months</span>}
                    subtitle="Total monthly outflow ending in the selected month"
                  />
                  <div className="mt-4 h-64 min-h-64 flex-1 sm:h-72">
                    <TrendChart data={trend} />
                  </div>
                </Card>
                <Card className="p-5">
                  <CardHeader
                    title="Category Breakdown"
                    subtitle="Share of this month’s spend"
                    action={
                      <Link to="/reports" className="text-body-sm font-semibold text-primary-fg hover:underline">
                        Full report
                      </Link>
                    }
                  />
                  <div className="mx-auto mt-4 aspect-square w-full max-w-[220px]">
                    <CategoryDonut
                      data={spending.map((c) => ({ name: c.categoryName, value: c.spent, color: colorOf(c.categoryColor) }))}
                      centerLabel="Spent"
                      centerValue={formatCompactINR(s!.totalExpenses)}
                    />
                  </div>
                  {spending.length > 0 ? (
                    <BreakdownLegend items={spending.slice(0, 6)} total={s!.totalExpenses} />
                  ) : (
                    <p className="mt-4 text-center text-body-sm text-subtle">No spending recorded this month.</p>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="p-5">
                  <CardHeader
                    title="Category Budget Utilization"
                    subtitle="Spend against each monthly limit"
                    action={
                      <Link to="/budgets" className="text-body-sm font-semibold text-primary-fg hover:underline">
                        Adjust limits
                      </Link>
                    }
                  />
                  <UtilizationList items={s!.categorySummary} />
                </Card>
                <Card className="p-5">
                  <CardHeader
                    title="Recent Expenses"
                    subtitle="Latest transactions this month"
                    action={
                      <Link to="/expenses" className="flex items-center gap-1 text-body-sm font-semibold text-primary-fg hover:underline">
                        View all
                        <Icon name="arrow_forward" size={16} />
                      </Link>
                    }
                  />
                  <RecentExpenses expenses={recent.data?.data ?? []} loading={recent.isPending} />
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
