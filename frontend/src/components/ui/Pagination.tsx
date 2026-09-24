import clsx from 'clsx';
import type { PaginationMeta } from '../../api/types';
import { pageWindow } from '../../lib/pagination';
import { Icon } from './Icon';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limits?: number[];
  itemLabel?: string;
}

export function Pagination({ meta, onPageChange, onLimitChange, limits = [10, 20, 50], itemLabel = 'transactions' }: PaginationProps) {
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const navBtn = 'inline-flex h-9 items-center gap-1 rounded-control px-2.5 text-body-sm font-medium text-ink-2 hover:bg-hover disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-4 text-body-sm text-muted">
        <span>
          Showing <strong className="font-semibold text-ink">{from}–{to}</strong> of{' '}
          <strong className="font-semibold text-ink">{total}</strong> {itemLabel}
        </span>
        {onLimitChange && (
          <label className="flex items-center gap-2">
            <span>Rows:</span>
            <select
              aria-label="Rows per page"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-8 rounded-control border border-line bg-surface px-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-surface-2"
            >
              {limits.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <Icon name="chevron_left" size={18} />
          <span className="hidden sm:inline">Previous</span>
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-subtle">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={clsx(
                'h-9 min-w-9 rounded-control px-2 text-body-sm font-semibold transition-colors',
                p === page ? 'bg-primary text-white' : 'text-ink-2 hover:bg-hover',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={navBtn} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <span className="hidden sm:inline">Next</span>
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </nav>
  );
}
