import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Makes the header a sort toggle. */
  sortKey?: string;
  className?: string;
  /** Where this column lands in the stacked mobile card. */
  mobile?: 'title' | 'subtitle' | 'value' | 'meta' | 'actions' | 'hidden';
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  sort?: { key: string; order: 'asc' | 'desc' };
  onSort?: (key: string) => void;
  busy?: boolean;
}

/**
 * One column config → a sortable table on desktop and stacked cards on mobile
 * (Plan §13 "Table (desktop) / StackedCard (mobile) pair driven by one shared columns config").
 */
export function ResponsiveTable<T>({ columns, rows, rowKey, caption, sort, onSort, busy }: ResponsiveTableProps<T>) {
  const pick = (slot: Column<T>['mobile']) => columns.filter((c) => c.mobile === slot);

  return (
    <div className={clsx('transition-opacity', busy && 'opacity-60')} aria-busy={busy || undefined}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 dark:bg-surface">
              {columns.map((c) => {
                const active = sort && c.sortKey === sort.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={clsx('label-caps h-11 px-4 font-semibold', c.align === 'right' && 'text-right', c.className)}
                  >
                    {c.sortKey && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.sortKey!)}
                        className={clsx('inline-flex items-center gap-1 uppercase hover:text-ink', active && 'text-ink')}
                      >
                        {c.header}
                        <Icon name={active ? (sort.order === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={15} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="group border-b border-line/70 transition-colors last:border-0 hover:bg-hover/60">
                {columns.map((c) => (
                  <td key={c.key} className={clsx('px-4 py-3.5 align-middle', c.align === 'right' && 'text-right', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="flex items-start gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1 space-y-1">
              {pick('title').map((c) => (
                <div key={c.key} className="font-semibold text-ink">
                  {c.render(row)}
                </div>
              ))}
              {pick('subtitle').map((c) => (
                <div key={c.key} className="text-body-sm text-muted">
                  {c.render(row)}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {pick('meta').map((c) => (
                  <div key={c.key}>{c.render(row)}</div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {pick('value').map((c) => (
                <div key={c.key}>{c.render(row)}</div>
              ))}
              {pick('actions').map((c) => (
                <div key={c.key}>{c.render(row)}</div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
