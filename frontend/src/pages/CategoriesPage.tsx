import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { errorMessage } from '../api/client';
import type { Category, CategorySummaryItem } from '../api/types';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge, CategoryIconTile } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Card, Segmented, StatCard } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner, Skeleton, SkeletonCards } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { usePeriod } from '../context/PeriodContext';
import { useToast } from '../context/ToastContext';
import { CategoryFormModal } from '../features/categories/CategoryFormModal';
import { useArchiveCategory, useCategories, useUpdateCategory } from '../features/categories/hooks';
import { useDashboardSummary } from '../features/dashboard/hooks';
import { budgetStatus, STATUS_BAR } from '../lib/budgetStatus';
import { colorOf } from '../lib/categoryIcons';
import { formatINR, formatPercent, monthLabel } from '../lib/format';

type Tab = 'all' | 'active' | 'unbudgeted' | 'archived';

function CategoryCard({
  category,
  stats,
  view,
  onEdit,
  onArchive,
  onRestore,
}: {
  category: Category;
  stats?: CategorySummaryItem;
  view: 'grid' | 'list';
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const spent = stats?.spent ?? 0;
  const status = category.isArchived ? 'archived' : budgetStatus(stats?.percentUsed);
  const over = status === 'over';

  return (
    <article className={clsx('card flex overflow-hidden', view === 'grid' ? 'flex-col' : 'flex-col sm:flex-row sm:items-center', category.isArchived && 'opacity-70')}>
      <div className={clsx('flex-1 p-5', view === 'list' && 'sm:py-4')}>
        <div className="flex items-start gap-3">
          <CategoryIconTile name={category.name} color={category.color} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-heading text-headline-sm text-ink">{category.name}</h3>
              {category.isArchived && <Badge>Archived</Badge>}
            </div>
            <p className="text-body-sm text-muted">
              {stats?.transactionCount ?? 0} transaction{stats?.transactionCount === 1 ? '' : 's'} this month
            </p>
          </div>
          <div className="flex">
            <IconButton icon="edit" label={`Edit ${category.name}`} onClick={onEdit} />
            {category.isArchived ? (
              <IconButton icon="unarchive" label={`Unarchive ${category.name}`} onClick={onRestore} />
            ) : (
              <IconButton icon="archive" label={`Archive ${category.name}`} onClick={onArchive} />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <p className={clsx('tnum font-heading text-headline-md font-bold', over ? 'text-danger-fg' : 'text-ink')}>{formatINR(spent)}</p>
          <p className="tnum text-body-sm text-muted">{stats?.budget != null ? `Budget: ${formatINR(stats.budget)}` : 'No cap assigned'}</p>
        </div>
        {stats?.budget != null ? (
          <>
            <ProgressBar className="mt-2" percent={stats.percentUsed ?? 0} label={`${category.name} budget usage`} barClassName={STATUS_BAR[budgetStatus(stats.percentUsed)]} />
            <div className="tnum mt-1.5 flex justify-between text-body-sm">
              <span className={over ? 'font-medium text-danger-fg' : 'text-success-fg'}>
                {formatPercent(stats.percentUsed)} {over ? 'exceeded' : 'utilized'}
              </span>
              <span className={over ? 'font-medium text-danger-fg' : 'text-muted'}>
                {over ? `${formatINR(Math.abs(stats.remaining ?? 0))} over` : `${formatINR(stats.remaining ?? 0)} remaining`}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-2 h-2 rounded-full bg-track" />
        )}
      </div>
      <div
        className={clsx(
          'flex items-center justify-between gap-2 border-line px-5 py-3 text-body-sm font-medium',
          view === 'grid' ? 'border-t' : 'border-t sm:w-48 sm:flex-col sm:items-start sm:border-l sm:border-t-0',
          over ? 'bg-danger/5 text-danger-fg' : 'bg-surface-2/60 dark:bg-canvas/40',
        )}
      >
        {status === 'archived' ? (
          <span className="flex items-center gap-1.5 text-subtle">
            <Icon name="pause_circle" size={16} /> Archived — history kept
          </span>
        ) : over ? (
          <span className="flex items-center gap-1.5">
            <Icon name="error" size={16} /> Limit breached
          </span>
        ) : status === 'none' ? (
          <span className="flex items-center gap-1.5 text-warning-fg">
            <Icon name="warning" size={16} /> Unbudgeted
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-success-fg">
            <Icon name="check_circle" size={16} /> Budget active
          </span>
        )}
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorOf(category.color) }} title={category.color ?? undefined} />
      </div>
    </article>
  );
}

export function CategoriesPage() {
  const { period } = usePeriod();
  const toast = useToast();
  const categories = useCategories(true);
  const summary = useDashboardSummary(period.month, period.year);
  const archive = useArchiveCategory();
  const update = useUpdateCategory();

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [modal, setModal] = useState<{ open: boolean; category?: Category | null }>({ open: false });
  const [pendingArchive, setPendingArchive] = useState<Category | null>(null);

  const all = useMemo(() => categories.data ?? [], [categories.data]);
  const statsById = useMemo(() => new Map((summary.data?.categorySummary ?? []).map((c) => [c.categoryId, c])), [summary.data]);

  const active = all.filter((c) => !c.isArchived);
  const archived = all.filter((c) => c.isArchived);
  const unbudgeted = active.filter((c) => statsById.get(c.id)?.budget == null);
  const mostActive = [...active].sort((a, b) => (statsById.get(b.id)?.transactionCount ?? 0) - (statsById.get(a.id)?.transactionCount ?? 0))[0];
  const topSpend = [...active].sort((a, b) => (statsById.get(b.id)?.spent ?? 0) - (statsById.get(a.id)?.spent ?? 0))[0];
  const topStats = topSpend ? statsById.get(topSpend.id) : undefined;

  const visible = (tab === 'active' ? active : tab === 'archived' ? archived : tab === 'unbudgeted' ? unbudgeted : all).filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const restore = (c: Category) =>
    update.mutate(
      { id: c.id, isArchived: false },
      {
        onSuccess: () => toast.success('Category restored', `“${c.name}” is available for new expenses again.`),
        onError: (err) => toast.error('Couldn’t restore category', errorMessage(err)),
      },
    );

  const confirmArchive = () => {
    if (!pendingArchive) return;
    const target = pendingArchive;
    archive.mutate(target.id, {
      onSuccess: () => {
        toast.success('Category archived', `“${target.name}” is hidden from new expenses; its history is preserved.`);
        setPendingArchive(null);
      },
      onError: (err) => toast.error('Couldn’t archive category', errorMessage(err)),
    });
  };

  return (
    <>
      <PageHeader
        title="Categories"
        badge={categories.data && <Badge tone="primary">{all.length} total</Badge>}
        subtitle="Organise expenses and budgets into meaningful spending groups with colour markers."
        actions={
          <Button icon="add_circle" onClick={() => setModal({ open: true })}>
            Add Category
          </Button>
        }
      />

      {categories.isPending ? (
        <SkeletonCards />
      ) : categories.isError ? (
        <ErrorBanner message={errorMessage(categories.error)} onRetry={() => categories.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Category footprint" icon="folder_copy" value={all.length}>
            <span className="text-success-fg">{active.length} active</span> · {archived.length} archived
          </StatCard>
          <StatCard label="Most active" icon="bolt" accent="primary" value={<span className="block truncate text-headline-md">{mostActive?.name ?? '—'}</span>}>
            {mostActive ? `${statsById.get(mostActive.id)?.transactionCount ?? 0} transactions in ${monthLabel(period.month, period.year)}` : 'No activity yet'}
          </StatCard>
          <StatCard label="Highest outflow" icon="trending_up" accent="danger" value={formatINR(topStats?.spent ?? 0)}>
            {topSpend && topStats?.spent ? `${topSpend.name}${topStats.percentUsed != null ? ` · ${formatPercent(topStats.percentUsed)} of limit` : ''}` : 'No spending this month'}
          </StatCard>
          <StatCard label="Unbudgeted" icon="warning" accent="warning" value={`${unbudgeted.length} group${unbudgeted.length === 1 ? '' : 's'}`}>
            {unbudgeted.length ? 'Missing monthly caps' : 'Every category is capped'}
          </StatCard>
        </div>
      )}

      <div className="card mt-6 flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<Tab>
          ariaLabel="Filter categories"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'All', count: all.length },
            { value: 'active', label: 'Active', count: active.length },
            { value: 'unbudgeted', label: 'Unbudgeted', count: unbudgeted.length },
            { value: 'archived', label: 'Archived', count: archived.length },
          ]}
        />
        <div className="flex items-center gap-2">
          <Input aria-label="Filter categories by name" icon="search" placeholder="Filter categories…" value={query} onChange={(e) => setQuery(e.target.value)} containerClassName="flex-1 lg:w-64" />
          <div className="flex rounded-control border border-line p-0.5" role="group" aria-label="Layout">
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={`${v} view`}
                onClick={() => setView(v)}
                className={clsx('flex h-8 w-8 items-center justify-center rounded-control', view === v ? 'bg-primary/10 text-primary-fg' : 'text-subtle hover:text-ink')}
              >
                <Icon name={v === 'grid' ? 'grid_view' : 'view_agenda'} size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={clsx('mt-6 grid gap-4', view === 'grid' ? 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1')}>
        {categories.isPending ? (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-52 w-full rounded-card" />)
        ) : categories.isError ? null : all.length === 0 ? (
          <Card className="md:col-span-2 2xl:col-span-3">
            <EmptyState
              icon="category"
              title="No categories yet"
              message="Create your first category to start organising expenses."
              action={
                <Button icon="add" onClick={() => setModal({ open: true })}>
                  Add category
                </Button>
              }
            />
          </Card>
        ) : visible.length === 0 ? (
          <Card className="md:col-span-2 2xl:col-span-3">
            <EmptyState icon="search_off" title="No categories in this view" message="Try another tab or clear the name filter." className="py-8" />
          </Card>
        ) : (
          visible.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              stats={statsById.get(c.id)}
              view={view}
              onEdit={() => setModal({ open: true, category: c })}
              onArchive={() => setPendingArchive(c)}
              onRestore={() => restore(c)}
            />
          ))
        )}
      </div>

      <CategoryFormModal open={modal.open} category={modal.category} onClose={() => setModal({ open: false })} />
      <ConfirmDialog
        open={!!pendingArchive}
        tone="primary"
        icon="archive"
        title="Archive this category?"
        message={
          pendingArchive && (
            <>
              <strong className="text-ink">{pendingArchive.name}</strong> will be hidden from new expenses and budgets. Existing expenses
              and budgets keep it, so your history stays intact — you can unarchive it any time.
            </>
          )
        }
        confirmLabel="Archive category"
        loading={archive.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setPendingArchive(null)}
      />
    </>
  );
}
