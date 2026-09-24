import clsx from 'clsx';
import type { ReactNode } from 'react';
import { STATUS_LABEL, type BudgetStatus } from '../../lib/budgetStatus';
import { categoryIcon, colorOf } from '../../lib/categoryIcons';
import { Icon } from './Icon';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-ink-2 border-line',
  primary: 'bg-primary/10 text-primary-fg border-primary/20',
  success: 'bg-success/10 text-success-fg border-success/25',
  warning: 'bg-warning/10 text-warning-fg border-warning/25',
  danger: 'bg-danger/10 text-danger-fg border-danger/25',
};

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-label-md font-medium',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<BudgetStatus, Tone> = {
  'on-track': 'success',
  'near-limit': 'warning',
  over: 'danger',
  none: 'neutral',
};

const STATUS_ICON: Record<BudgetStatus, string | null> = {
  'on-track': null,
  'near-limit': 'warning',
  over: 'error',
  none: null,
};

export function StatusPill({ status, className }: { status: BudgetStatus; className?: string }) {
  const icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]} dot={!icon} className={className}>
      {icon && <Icon name={icon} size={13} />}
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** Category chip with its colour and icon (expense ledger "CATEGORY" column). */
export function CategoryChip({ name, color, archived }: { name: string; color: string | null; archived?: boolean }) {
  const c = colorOf(color);
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-label-md font-medium"
      style={{ color: c, backgroundColor: `${c}1A`, borderColor: `${c}33` }}
      title={archived ? `${name} (archived)` : name}
    >
      <Icon name={categoryIcon(name)} size={14} />
      <span className="truncate text-ink-2 dark:text-ink">{name}</span>
      {archived && <Icon name="inventory_2" size={12} className="text-subtle" />}
    </span>
  );
}

/** Rounded-square icon tile tinted with the category colour. */
export function CategoryIconTile({ name, color, size = 'md' }: { name: string; color: string | null; size?: 'sm' | 'md' }) {
  const c = colorOf(color);
  return (
    <span
      className={clsx('flex shrink-0 items-center justify-center rounded-control', size === 'md' ? 'h-10 w-10' : 'h-8 w-8')}
      style={{ color: c, backgroundColor: `${c}1F` }}
    >
      <Icon name={categoryIcon(name)} size={size === 'md' ? 20 : 17} />
    </span>
  );
}
