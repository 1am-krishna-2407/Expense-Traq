import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import type { Period } from '../../api/types';
import { currentPeriod, shiftPeriod } from '../../lib/dates';
import { MONTHS, monthLabel } from '../../lib/format';
import { Icon } from './Icon';

interface MonthPickerProps {
  value: Period;
  onChange: (p: Period) => void;
  /** 'dropdown' = calendar button (top bar); 'stepper' = ‹ September 2026 › (budgets header). */
  variant?: 'dropdown' | 'stepper';
  mode?: 'month' | 'year';
  className?: string;
}

export function MonthPicker({ value, onChange, variant = 'dropdown', mode = 'month', className }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.year);
  const ref = useRef<HTMLDivElement>(null);
  const now = currentPeriod();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = mode === 'year' ? String(value.year) : monthLabel(value.month, value.year);
  const step = (delta: number) =>
    onChange(mode === 'year' ? { ...value, year: value.year + delta } : shiftPeriod(value, delta));

  const trigger = (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Select ${mode}: ${label}`}
      onClick={() => {
        setViewYear(value.year);
        setOpen((o) => !o);
      }}
      className={clsx(
        'flex h-10 items-center gap-2 rounded-control px-3 font-semibold text-ink transition-colors hover:bg-hover',
        variant === 'dropdown' && 'border border-line bg-surface shadow-card dark:bg-surface-2',
      )}
    >
      <Icon name="calendar_month" size={18} className="text-primary-fg" />
      <span className="whitespace-nowrap">{label}</span>
      <Icon name="arrow_drop_down" size={18} className="text-subtle" />
    </button>
  );

  return (
    <div ref={ref} className={clsx('relative inline-flex items-center', className)}>
      {variant === 'stepper' && (
        <button type="button" onClick={() => step(-1)} aria-label={`Previous ${mode}`} className="flex h-10 w-9 items-center justify-center rounded-control text-muted hover:bg-hover hover:text-ink">
          <Icon name="chevron_left" size={20} />
        </button>
      )}
      {trigger}
      {variant === 'stepper' && (
        <button type="button" onClick={() => step(1)} aria-label={`Next ${mode}`} className="flex h-10 w-9 items-center justify-center rounded-control text-muted hover:bg-hover hover:text-ink">
          <Icon name="chevron_right" size={20} />
        </button>
      )}

      {open && (
        <div role="dialog" aria-label={`Choose ${mode}`} className="card absolute left-0 top-full z-50 mt-2 w-72 animate-fade-in p-3 shadow-float">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous year" onClick={() => setViewYear((y) => y - 1)} className="rounded-control p-1.5 text-muted hover:bg-hover">
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="font-semibold text-ink">{viewYear}</span>
            <button type="button" aria-label="Next year" onClick={() => setViewYear((y) => y + 1)} className="rounded-control p-1.5 text-muted hover:bg-hover">
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
          {mode === 'month' ? (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => {
                const selected = value.month === i + 1 && value.year === viewYear;
                const isNow = now.month === i + 1 && now.year === viewYear;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onChange({ month: i + 1, year: viewYear });
                      setOpen(false);
                    }}
                    className={clsx(
                      'rounded-control py-2 text-body-sm font-medium transition-colors',
                      selected ? 'bg-primary text-white' : 'text-ink-2 hover:bg-hover',
                      !selected && isNow && 'ring-1 ring-primary/50',
                    )}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              className="w-full rounded-control bg-primary py-2 font-semibold text-white"
              onClick={() => {
                onChange({ ...value, year: viewYear });
                setOpen(false);
              }}
            >
              Use {viewYear}
            </button>
          )}
          <button
            type="button"
            className="mt-2 w-full rounded-control py-1.5 text-body-sm font-medium text-primary-fg hover:bg-hover"
            onClick={() => {
              onChange(now);
              setOpen(false);
            }}
          >
            Jump to current {mode}
          </button>
        </div>
      )}
    </div>
  );
}
