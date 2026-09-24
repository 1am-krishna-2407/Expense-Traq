import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

/** Skeleton block for loading states (Plan §14: skeleton cards while loading). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx('animate-pulse rounded-control bg-surface-3', className)} />;
}

export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card space-y-4 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/10 blur-xl" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-fg dark:bg-primary/15">
          <Icon name={icon} size={28} />
        </span>
      </div>
      <h3 className="font-heading text-headline-sm text-ink">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-body-md text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Error banner with retry (Plan §14: "error (retry banner)"). */
export function ErrorBanner({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={clsx('flex flex-col gap-3 rounded-card border border-danger/25 bg-danger/10 p-4 sm:flex-row sm:items-center', className)}>
      <div className="flex flex-1 items-start gap-3">
        <Icon name="error" size={22} className="text-danger-fg" />
        <div>
          <p className="font-semibold text-ink">We couldn’t load this data</p>
          <p className="text-body-sm text-muted">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" icon="refresh" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
