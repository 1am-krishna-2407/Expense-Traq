import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/** Page title block ("Expenses  [38 total]" + description + action buttons). */
export function PageHeader({ title, eyebrow, badge, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-label-sm uppercase tracking-wider text-success-fg">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-headline-md text-ink sm:text-headline-lg">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 max-w-2xl text-body-md text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
