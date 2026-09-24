import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Card({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={clsx('card', className)}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, badge, action, className }: { title: string; subtitle?: ReactNode; badge?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-headline-sm text-ink">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="mt-0.5 text-body-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Accent = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const ACCENT_TILE: Record<Accent, string> = {
  primary: 'bg-primary-soft text-primary-fg dark:bg-primary/15 dark:border dark:border-primary/25',
  success: 'bg-success/10 text-success-fg dark:border dark:border-success/25',
  warning: 'bg-warning/10 text-warning-fg dark:border dark:border-warning/25',
  danger: 'bg-danger/10 text-danger-fg dark:border dark:border-danger/25',
  neutral: 'bg-surface-3 text-ink-2 dark:border dark:border-line-strong',
};

const ACCENT_BAR: Record<Accent, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-subtle',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: string;
  accent?: Accent;
  valueClassName?: string;
  children?: ReactNode;
  /** 0–100 accent strip along the bottom edge, as in the design's metric cards. */
  meter?: number;
}

/** Metric card: caps label + icon tile + big tabular figure + context (both designs). */
export function StatCard({ label, value, icon, accent = 'primary', valueClassName, children, meter }: StatCardProps) {
  return (
    <div className="card relative flex flex-col overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-caps pt-1.5">{label}</p>
        <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-control', ACCENT_TILE[accent])}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <p className={clsx('tnum mt-3 font-heading text-[1.75rem] font-bold leading-9 tracking-tight text-ink sm:text-currency-stat', valueClassName)}>{value}</p>
      {children && <div className="mt-2 text-body-sm text-muted">{children}</div>}
      {meter !== undefined && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-track/60">
          <div className={clsx('h-full', ACCENT_BAR[accent])} style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </div>
      )}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  ariaLabel: string;
  className?: string;
}

/** Tab-style segmented control ("All (12) | Active (8) | …", "Monthly | Yearly"). */
export function Segmented<T extends string>({ value, onChange, options, ariaLabel, className }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx('inline-flex flex-wrap gap-1 rounded-control bg-surface-2 p-1 dark:bg-canvas', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-body-sm font-semibold transition-colors',
              active ? 'bg-primary text-white shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={clsx('rounded-full px-1.5 text-[11px]', active ? 'bg-white/20' : 'bg-surface-3 text-ink-2')}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
