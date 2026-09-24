import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { errorMessage, errorStatus, fieldErrors } from '../../api/client';
import type { Budget, Period } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { monthLabel } from '../../lib/format';
import { useCategories } from '../categories/hooks';
import { budgetFormSchema, type BudgetFormValues } from '../schemas';
import { useCreateBudget, useUpdateBudget } from './hooks';

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  period: Period;
  /** Budgets already set for `period` — their categories are excluded from the picker. */
  existing: Budget[];
  budget?: Budget | null;
  presetCategoryId?: string;
}

export function BudgetFormModal({ open, onClose, period, existing, budget, presetCategoryId }: BudgetFormModalProps) {
  const isEdit = !!budget;
  const toast = useToast();
  const { data: categories = [] } = useCategories(false);
  const create = useCreateBudget();
  const update = useUpdateBudget();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({ resolver: zodResolver(budgetFormSchema), defaultValues: { categoryId: '', limitAmount: '' } });

  useEffect(() => {
    if (!open) return;
    reset(
      budget
        ? { categoryId: budget.categoryId, limitAmount: String(budget.limitAmount) }
        : { categoryId: presetCategoryId ?? '', limitAmount: '' },
    );
  }, [open, budget, presetCategoryId, reset]);

  // UX nicety only — the server re-checks uniqueness and answers 409 (Plan §16).
  const available = useMemo(() => {
    const taken = new Set(existing.map((b) => b.categoryId));
    return categories.filter((c) => !taken.has(c.id));
  }, [categories, existing]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && budget) {
        await update.mutateAsync({ id: budget.id, limitAmount: Number(values.limitAmount) });
        toast.success('Budget updated', `${budget.categoryName} limit saved for ${monthLabel(period.month, period.year)}.`);
      } else {
        await create.mutateAsync({ categoryId: values.categoryId, limitAmount: Number(values.limitAmount), ...period });
        toast.success('Budget created', `Tracking starts now for ${monthLabel(period.month, period.year)}.`);
      }
      onClose();
    } catch (err) {
      const fields = fieldErrors(err);
      if (errorStatus(err) === 409) {
        // Map the duplicate-budget conflict onto the category field (Plan §14).
        setError('categoryId', { message: 'A budget for this category already exists this month' });
      } else if (fields.limitAmount || fields.categoryId) {
        if (fields.limitAmount) setError('limitAmount', { message: fields.limitAmount });
        if (fields.categoryId) setError('categoryId', { message: fields.categoryId });
      } else {
        setError('root', { message: errorMessage(err) });
      }
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={isEdit ? 'Edit budget limit' : 'Create budget'}
      description={`Monthly limit for ${monthLabel(period.month, period.year)}`}
      icon={
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-fg dark:bg-primary/15">
          <Icon name="account_balance_wallet" size={20} />
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="budget-form" loading={isSubmitting} icon="check">
            {isEdit ? 'Save limit' : 'Create budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {errors.root && (
          <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-body-sm text-danger-fg">
            {errors.root.message}
          </p>
        )}
        {isEdit && budget ? (
          <div className="rounded-control bg-surface-2 px-3 py-2.5 text-body-sm dark:bg-canvas">
            <span className="text-subtle">Category</span>
            <p className="font-semibold text-ink">{budget.categoryName}</p>
            <p className="mt-1 text-subtle">Category and month can’t be changed — delete and recreate instead.</p>
          </div>
        ) : (
          <Select
            label="Category"
            error={errors.categoryId?.message}
            hint={available.length === 0 ? 'Every active category already has a budget this month.' : undefined}
            {...register('categoryId')}
          >
            <option value="">Select a category</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <Input
          label="Monthly limit"
          prefix="₹"
          inputMode="decimal"
          placeholder="10,000"
          className="tnum text-right font-semibold"
          error={errors.limitAmount?.message}
          {...register('limitAmount')}
        />
      </form>
    </Modal>
  );
}
