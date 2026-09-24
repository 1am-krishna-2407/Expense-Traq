import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { Category } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { EMPTY_FILTERS, validateFilters, type FilterValues } from './filters';

const QUICK_BOUNDS = [
  { label: 'Under ₹1,000', min: '', max: '1000' },
  { label: '₹1,000 – ₹5,000', min: '1000', max: '5000' },
  { label: 'Above ₹5,000', min: '5000', max: '' },
];

interface FilterFieldsProps {
  value: FilterValues;
  onChange: (patch: Partial<FilterValues>) => void;
  categories: Category[];
  errors: Partial<Record<keyof FilterValues, string>>;
  layout: 'bar' | 'sheet';
}

function FilterFields({ value, onChange, categories, errors, layout }: FilterFieldsProps) {
  const active = (b: (typeof QUICK_BOUNDS)[number]) => value.minAmount === b.min && value.maxAmount === b.max;
  return (
    <div className={clsx('grid gap-3', layout === 'bar' ? 'grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]' : 'grid-cols-1')}>
      {layout === 'bar' && (
        <Input
          aria-label="Search descriptions"
          icon="search"
          placeholder="Search by description…"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          containerClassName="col-span-2 xl:col-span-1"
        />
      )}
      <Select aria-label="Category" label={layout === 'sheet' ? 'Category' : undefined} value={value.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.isArchived ? ' (archived)' : ''}
          </option>
        ))}
      </Select>
      <Input
        type="date"
        aria-label="From date"
        label={layout === 'sheet' ? 'From' : undefined}
        value={value.startDate}
        max={value.endDate || undefined}
        onChange={(e) => onChange({ startDate: e.target.value })}
        error={errors.startDate}
      />
      <Input
        type="date"
        aria-label="To date"
        label={layout === 'sheet' ? 'To' : undefined}
        value={value.endDate}
        min={value.startDate || undefined}
        onChange={(e) => onChange({ endDate: e.target.value })}
        error={errors.endDate}
      />
      <div className={clsx('flex flex-col gap-2', layout === 'bar' ? 'col-span-2 xl:col-span-4 xl:flex-row xl:items-center' : '')}>
        <span className="text-body-sm font-medium text-muted">Amount:</span>
        <div className="flex items-start gap-2">
          <Input
            aria-label="Minimum amount"
            prefix="₹"
            inputMode="decimal"
            placeholder="Min"
            value={value.minAmount}
            onChange={(e) => onChange({ minAmount: e.target.value })}
            error={errors.minAmount}
            containerClassName="w-full xl:w-32"
            className="tnum"
          />
          <span className="pt-2.5 text-subtle">—</span>
          <Input
            aria-label="Maximum amount"
            prefix="₹"
            inputMode="decimal"
            placeholder="Max"
            value={value.maxAmount}
            onChange={(e) => onChange({ maxAmount: e.target.value })}
            error={errors.maxAmount}
            containerClassName="w-full xl:w-32"
            className="tnum"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_BOUNDS.map((b) => (
            <button
              key={b.label}
              type="button"
              aria-pressed={active(b)}
              onClick={() => onChange(active(b) ? { minAmount: '', maxAmount: '' } : { minAmount: b.min, maxAmount: b.max })}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors',
                active(b) ? 'border-primary bg-primary/10 text-primary-fg' : 'border-line bg-surface-2 text-ink-2 hover:bg-hover dark:bg-canvas',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ExpenseFilterBarProps {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  categories: Category[];
}

export function ExpenseFilterBar({ value, onChange, categories }: ExpenseFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const errors = validateFilters(value);
  const draftErrors = validateFilters(draft);
  const activeCount = (Object.keys(EMPTY_FILTERS) as (keyof FilterValues)[]).filter((k) => k !== 'search' && value[k] !== '').length;
  const isDirty = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="card p-4">
      {/* Desktop: inline bar */}
      <div className="hidden md:block">
        <FilterFields value={value} onChange={(p) => onChange({ ...value, ...p })} categories={categories} errors={errors} layout="bar" />
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-body-sm">
          <span className="text-muted">Filters combine — every condition must match.</span>
          <button type="button" disabled={!isDirty} onClick={() => onChange(EMPTY_FILTERS)} className="font-semibold text-primary-fg hover:underline disabled:opacity-40 disabled:no-underline">
            Reset
          </button>
        </div>
      </div>

      {/* Mobile: search + "Filters" button opening a bottom sheet (Plan §14) */}
      <div className="flex gap-2 md:hidden">
        <Input
          aria-label="Search descriptions"
          icon="search"
          placeholder="Search…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          containerClassName="flex-1"
        />
        <Button variant="secondary" icon="tune" onClick={() => setSheetOpen(true)} aria-label={`Filters${activeCount ? ` (${activeCount} active)` : ''}`}>
          Filters
          {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-white">{activeCount}</span>}
        </Button>
      </div>
      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter expenses"
        icon={<Icon name="tune" size={22} className="mt-0.5 text-primary-fg" />}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft({ ...EMPTY_FILTERS, search: value.search });
              }}
            >
              Clear
            </Button>
            <Button
              disabled={Object.keys(draftErrors).length > 0}
              onClick={() => {
                onChange(draft);
                setSheetOpen(false);
              }}
            >
              Apply filters
            </Button>
          </>
        }
      >
        <FilterFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} categories={categories} errors={draftErrors} layout="sheet" />
      </Modal>
    </div>
  );
}
