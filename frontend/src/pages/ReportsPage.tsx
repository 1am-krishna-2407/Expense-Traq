import clsx from 'clsx';
import { useState } from 'react';
import { errorMessage } from '../api/client';
import type { MonthlyReport, Period, YearlyReport } from '../api/types';
import { BudgetVsActualChart, DailyBarChart } from '../components/charts/LazyCharts';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge, CategoryIconTile, StatusPill } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, Segmented, StatCard } from '../components/ui/Card';
import { EmptyState, ErrorBanner, Skeleton, SkeletonCards } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { MonthPicker } from '../components/ui/MonthPicker';
import { ProgressBar } from '../components/ui/ProgressBar';
import { usePeriod } from '../context/PeriodContext';
import { useToast } from '../context/ToastContext';
import { useExportReport, useMonthlyReport, useYearlyReport, type ExportFormat } from '../features/reports/hooks';
import { budgetStatus, STATUS_BAR } from '../lib/budgetStatus';
import { periodProgress } from '../lib/dates';
import { formatDate, formatINR, formatPercent, monthLabel, MONTHS, shortMonth } from '../lib/format';

type Mode = 'monthly' | 'yearly';

function UtilizationRing({ percent }: { percent: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const shown = Math.min(100, Math.max(0, percent));
  const status = budgetStatus(percent);
  const stroke = status === 'over' ? 'stroke-danger' : status === 'near-limit' ? 'stroke-warning' : 'stroke-primary';
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
      <circle cx="40" cy="40" r={r} className="fill-none stroke-track" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} className={clsx('fill-none transition-all duration-700', stroke)} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} />
    </svg>
  );
}

function MonthlyView({ r }: { r: MonthlyReport }) {
  const { elapsed } = periodProgress(r.period);
  const burn = elapsed ? r.totalExpenses / elapsed : 0;
  const peak = r.byDay.reduce((best, d) => (d.total > best.total ? d : best), r.byDay[0]);
  const usage = r.totalBudget > 0 ? (r.totalExpenses / r.totalBudget) * 100 : null;
  const overs = r.byCategory.filter((c) => (c.percentUsed ?? 0) > 100);
  const unbudgeted = r.byCategory.filter((c) => c.budget === null && c.total > 0);

  if (r.totalExpenses === 0 && r.totalBudget === 0) {
    return (
      <Card>
        <EmptyState icon="query_stats" title={`No data for ${monthLabel(r.period.month, r.period.year)}`} message="Pick another month, or add expenses and budgets for this one." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net outflow" icon="payments" value={formatINR(r.totalExpenses)}>
          {r.byCategory.reduce((n, c) => n + c.transactionCount, 0)} transactions
        </StatCard>
        <StatCard
          label={r.remainingBudget >= 0 ? 'Budget left' : 'Over budget'}
          icon="savings"
          accent={r.remainingBudget >= 0 ? 'success' : 'danger'}
          value={formatINR(Math.abs(r.remainingBudget))}
          valueClassName={r.remainingBudget >= 0 ? 'text-success-fg' : 'text-danger-fg'}
        >
          {r.totalBudget > 0 ? `of ${formatINR(r.totalBudget)} monthly budget` : 'No budgets set this month'}
        </StatCard>
        <StatCard label="Daily burn rate" icon="speed" accent="neutral" value={<>{formatINR(Math.round(burn))}<span className="text-body-md font-medium text-subtle">/day</span></>}>
          Across {elapsed} day{elapsed === 1 ? '' : 's'} of the month
        </StatCard>
        <StatCard label="Busiest day" icon="event" accent="warning" value={peak && peak.total > 0 ? formatDate(peak.date, 'EEE, d MMM') : '—'}>
          {peak && peak.total > 0 ? `${formatINR(peak.total)} spent` : 'No spending yet'}
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <CardHeader title="Daily spending" subtitle={`Every day of ${monthLabel(r.period.month, r.period.year)} — the tallest bar is highlighted`} />
          <div className="mt-4 h-64 sm:h-72">
            <DailyBarChart data={r.byDay.map((d) => ({ label: formatDate(d.date, 'd'), total: d.total }))} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="label-caps">Budget health</p>
          <h2 className="mt-1 font-heading text-headline-sm text-ink">Audit summary</h2>
          <div className="mt-4 flex items-center gap-4 rounded-card bg-surface-2 p-4 dark:bg-canvas">
            <div className="relative">
              <UtilizationRing percent={usage ?? 0} />
              <span className="tnum absolute inset-0 flex items-center justify-center text-body-md font-bold text-ink">{usage === null ? '—' : `${Math.round(usage)}%`}</span>
            </div>
            <div className="tnum text-body-sm">
              <p className="font-semibold text-ink">Budget utilization</p>
              <p className="text-muted">
                {formatINR(r.totalExpenses)} of {formatINR(r.totalBudget)}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5 text-body-sm">
            {overs.length === 0 && r.totalBudget > 0 && (
              <li className="flex gap-2 text-muted">
                <Icon name="check_circle" size={18} className="text-success-fg" />
                Every budgeted category stayed within its limit.
              </li>
            )}
            {overs.map((c) => (
              <li key={c.categoryId} className="flex gap-2 text-muted">
                <Icon name="error" size={18} className="shrink-0 text-danger-fg" />
                <span>
                  <strong className="text-ink">{c.categoryName}</strong> exceeded its limit by {formatINR(Math.abs(c.remaining ?? 0))} ({formatPercent(c.percentUsed)}).
                </span>
              </li>
            ))}
            {unbudgeted.length > 0 && (
              <li className="flex gap-2 text-muted">
                <Icon name="info" size={18} className="shrink-0 text-warning-fg" />
                <span>
                  {formatINR(unbudgeted.reduce((a, c) => a + c.total, 0))} spent in {unbudgeted.length} unbudgeted categor{unbudgeted.length === 1 ? 'y' : 'ies'}.
                </span>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 pb-3">
          <CardHeader title="Category variance & budget audit" subtitle="Spend against each monthly limit" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <caption className="sr-only">Category variance</caption>
            <thead>
              <tr className="border-y border-line bg-surface-2 dark:bg-surface">
                {['Category', 'Budget', 'Actual', 'Variance', 'Depletion', 'Status'].map((h, i) => (
                  <th key={h} scope="col" className={clsx('label-caps h-11 px-5', i > 0 && i < 4 && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum">
              {r.byCategory.map((c) => {
                const status = budgetStatus(c.percentUsed);
                return (
                  <tr key={c.categoryId} className={clsx('border-b border-line/70', status === 'over' && 'bg-danger/5')}>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <CategoryIconTile name={c.categoryName} color={c.categoryColor} size="sm" />
                        <span>
                          <span className="block font-semibold text-ink">{c.categoryName}</span>
                          <span className="text-body-sm text-subtle">{c.transactionCount} txns</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-ink-2">{c.budget === null ? '—' : formatINR(c.budget)}</td>
                    <td className={clsx('px-5 py-3 text-right font-semibold', status === 'over' ? 'text-danger-fg' : 'text-ink')}>{formatINR(c.total)}</td>
                    <td className="px-5 py-3 text-right">
                      {c.remaining === null ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        <span className={c.remaining < 0 ? 'text-danger-fg' : 'text-success-fg'}>
                          {c.remaining < 0 ? '−' : '+'}
                          {formatINR(Math.abs(c.remaining))}
                          <span className="block text-body-sm opacity-80">{c.remaining < 0 ? 'Overrun' : 'Saved'}</span>
                        </span>
                      )}
                    </td>
                    <td className="w-48 px-5 py-3">
                      {c.percentUsed === null ? (
                        <span className="text-body-sm text-subtle">No limit</span>
                      ) : (
                        <>
                          <span className="text-body-sm text-muted">{formatPercent(c.percentUsed)}</span>
                          <ProgressBar size="sm" percent={c.percentUsed} barClassName={STATUS_BAR[status]} label={`${c.categoryName} depletion`} />
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="tnum">
              <tr className="bg-surface-2 font-semibold dark:bg-surface">
                <td className="px-5 py-3.5 text-ink">Aggregated totals</td>
                <td className="px-5 py-3.5 text-right text-ink">{formatINR(r.totalBudget)}</td>
                <td className="px-5 py-3.5 text-right text-primary-fg">{formatINR(r.totalExpenses)}</td>
                <td className={clsx('px-5 py-3.5 text-right', r.remainingBudget < 0 ? 'text-danger-fg' : 'text-success-fg')}>
                  {r.remainingBudget < 0 ? '−' : '+'}
                  {formatINR(Math.abs(r.remainingBudget))}
                </td>
                <td className="px-5 py-3.5 text-body-sm text-muted">{usage === null ? '—' : `${formatPercent(usage)} overall`}</td>
                <td className="px-5 py-3.5 text-body-sm text-muted">{r.byCategory.length} categories</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

function YearlyView({ r }: { r: YearlyReport }) {
  const activeMonths = r.byMonth.filter((m) => m.total > 0);
  const avg = activeMonths.length ? r.totalExpenses / activeMonths.length : 0;
  const peak = r.byMonth.reduce((best, m) => (m.total > best.total ? m : best), r.byMonth[0]);

  if (r.totalExpenses === 0 && r.totalBudget === 0) {
    return (
      <Card>
        <EmptyState icon="query_stats" title={`No data for ${r.period.year}`} message="Pick another year, or start logging expenses." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Annual outflow" icon="payments" value={formatINR(r.totalExpenses)}>
          {r.byCategory.reduce((n, c) => n + c.transactionCount, 0)} transactions in {r.period.year}
        </StatCard>
        <StatCard label="Total budgeted" icon="account_balance_wallet" accent="neutral" value={formatINR(r.totalBudget)}>
          Sum of monthly limits set this year
        </StatCard>
        <StatCard label="Avg per active month" icon="calendar_view_month" accent="success" value={formatINR(Math.round(avg))}>
          Over {activeMonths.length} month{activeMonths.length === 1 ? '' : 's'} with spend
        </StatCard>
        <StatCard label="Peak month" icon="trending_up" accent="warning" value={peak && peak.total > 0 ? MONTHS[peak.month - 1] : '—'}>
          {peak && peak.total > 0 ? `${formatINR(peak.total)} spent` : 'No spending yet'}
        </StatCard>
      </div>

      <Card className="p-5">
        <CardHeader title={`Budget vs actual — ${r.period.year}`} subtitle="Monthly spend against the sum of that month’s limits (red = over)" />
        <div className="mt-4 h-72">
          <BudgetVsActualChart data={r.byMonth.map((m) => ({ label: shortMonth(m.month), total: m.total, budget: m.budget }))} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <CardHeader title="By category" subtitle="Share of the year’s spend" />
          <ul className="tnum mt-4 space-y-3.5">
            {r.byCategory.map((c) => {
              const share = r.totalExpenses ? (c.total / r.totalExpenses) * 100 : 0;
              return (
                <li key={c.categoryId}>
                  <div className="mb-1.5 flex items-center gap-3">
                    <CategoryIconTile name={c.categoryName} color={c.categoryColor} size="sm" />
                    <span className="flex-1 truncate font-semibold text-ink">{c.categoryName}</span>
                    <span className="font-semibold text-ink">{formatINR(c.total)}</span>
                    <span className="w-12 text-right text-body-sm text-subtle">{formatPercent(share)}</span>
                  </div>
                  <ProgressBar size="sm" percent={share} color={c.categoryColor ?? undefined} barClassName={c.categoryColor ? undefined : 'bg-primary'} label={`${c.categoryName} share`} />
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="overflow-hidden">
          <div className="p-5 pb-3">
            <CardHeader title="By month" subtitle="Spend vs budget" />
          </div>
          <table className="tnum w-full text-left">
            <caption className="sr-only">Spend by month</caption>
            <thead>
              <tr className="border-y border-line bg-surface-2 dark:bg-surface">
                <th scope="col" className="label-caps h-10 px-5">Month</th>
                <th scope="col" className="label-caps h-10 px-5 text-right">Spent</th>
                <th scope="col" className="label-caps h-10 px-5 text-right">Budget</th>
              </tr>
            </thead>
            <tbody>
              {r.byMonth.map((m) => (
                <tr key={m.month} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-2 text-ink-2">{MONTHS[m.month - 1]}</td>
                  <td className={clsx('px-5 py-2 text-right font-semibold', m.budget > 0 && m.total > m.budget ? 'text-danger-fg' : 'text-ink')}>{formatINR(m.total)}</td>
                  <td className="px-5 py-2 text-right text-muted">{m.budget ? formatINR(m.budget) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { period: globalPeriod } = usePeriod();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('monthly');
  const [period, setPeriod] = useState<Period>(globalPeriod);
  const monthly = useMonthlyReport(period.month, period.year, mode === 'monthly');
  const yearly = useYearlyReport(period.year, mode === 'yearly');
  const exporter = useExportReport();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const active = mode === 'monthly' ? monthly : yearly;
  const label = mode === 'monthly' ? monthLabel(period.month, period.year) : String(period.year);

  const doExport = (format: ExportFormat) => {
    setExporting(format);
    exporter.mutate(
      { format, period: mode, year: period.year, ...(mode === 'monthly' ? { month: period.month } : {}) },
      {
        onSuccess: (name) => toast.success('Report ready', `${name} has been downloaded.`),
        onError: (err) => toast.error('Export failed', errorMessage(err)),
        onSettled: () => setExporting(null),
      },
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Audit & insights"
        title="Reports"
        badge={<Badge tone="primary">{label}</Badge>}
        subtitle="Monthly and yearly spending analysis. Exports contain exactly the figures shown here."
        actions={
          <>
            <Button variant="secondary" icon="table_view" loading={exporting === 'csv'} disabled={!!exporting} onClick={() => doExport('csv')}>
              Export CSV
            </Button>
            <Button icon="description" loading={exporting === 'xlsx'} disabled={!!exporting} onClick={() => doExport('xlsx')}>
              Export Excel
            </Button>
          </>
        }
      />

      <div className="card mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <Segmented<Mode>
          ariaLabel="Report period"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
        />
        <MonthPicker variant="stepper" mode={mode === 'monthly' ? 'month' : 'year'} value={period} onChange={setPeriod} />
      </div>

      {active.isPending ? (
        <div className="space-y-6">
          <SkeletonCards />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      ) : active.isError ? (
        <ErrorBanner message={errorMessage(active.error)} onRetry={() => active.refetch()} />
      ) : mode === 'monthly' && monthly.data ? (
        <MonthlyView r={monthly.data} />
      ) : yearly.data ? (
        <YearlyView r={yearly.data} />
      ) : null}
    </>
  );
}
