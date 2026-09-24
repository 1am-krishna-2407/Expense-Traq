import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { errorMessage, fieldErrors } from '../../api/client';
import type { Expense } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { todayIso } from '../../lib/dates';
import { useCategories } from '../categories/hooks';
import { expenseFormSchema, toExpenseInput, type ExpenseFormValues } from '../schemas';
import { useCreateExpense, useUpdateExpense } from './hooks';

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present → edit mode */
  expense?: Expense | null;
}

const empty = (): ExpenseFormValues => ({ amount: '', categoryId: '', expenseDate: todayIso(), description: '' });

export function ExpenseFormModal({ open, onClose, expense }: ExpenseFormModalProps) {
  const isEdit = !!expense;
  const toast = useToast();
  const { data: categories = [], isLoading: loadingCategories } = useCategories(false);
  const create = useCreateExpense();
  const update = useUpdateExpense();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({ resolver: zodResolver(expenseFormSchema), defaultValues: empty() });

  useEffect(() => {
    if (!open) return;
    reset(
      expense
        ? {
            amount: String(expense.amount),
            categoryId: expense.categoryId,
            expenseDate: expense.expenseDate,
            description: expense.description ?? '',
          }
        : empty(),
    );
  }, [open, expense, reset]);

  // An expense may sit in a since-archived category: keep it selectable while editing it.
  const options = useMemo(() => {
    if (expense?.category.isArchived && !categories.some((c) => c.id === expense.categoryId)) {
      return [...categories, expense.category];
    }
    return categories;
  }, [categories, expense]);

  const date = watch('expenseDate');
  const isFuture = !!date && date > todayIso();

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && expense) {
        await update.mutateAsync({ id: expense.id, ...toExpenseInput(values) });
        toast.success('Expense updated', 'Your ledger and budgets have been recalculated.');
      } else {
        await create.mutateAsync(toExpenseInput(values));
        toast.success('Expense added', 'Your ledger and budgets have been updated.');
      }
      onClose();
    } catch (err) {
      const fields = fieldErrors(err);
      const known = (['amount', 'categoryId', 'expenseDate', 'description'] as const).filter((f) => fields[f]);
      known.forEach((f) => setError(f, { message: fields[f] }));
      if (known.length === 0) setError('root', { message: errorMessage(err) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit expense' : 'Add expense'}
      description={isEdit ? 'Update the details of this transaction.' : 'Record a new transaction in your ledger.'}
      icon={
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-fg dark:bg-primary/15">
          <Icon name={isEdit ? 'edit_note' : 'receipt_long'} size={20} />
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" loading={isSubmitting} icon={isEdit ? 'check' : 'add'}>
            {isEdit ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {errors.root && (
          <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-body-sm text-danger-fg sm:col-span-2">
            {errors.root.message}
          </p>
        )}
        <Input
          label="Amount"
          prefix="₹"
          inputMode="decimal"
          placeholder="0.00"
          className="tnum text-right font-semibold"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Input
          label="Date"
          type="date"
          error={errors.expenseDate?.message}
          hint={isFuture ? <span className="text-warning-fg">Heads up: this date is in the future.</span> : undefined}
          {...register('expenseDate')}
        />
        <Select
          label="Category"
          containerClassName="sm:col-span-2"
          error={errors.categoryId?.message}
          disabled={loadingCategories}
          {...register('categoryId')}
        >
          <option value="">{loadingCategories ? 'Loading categories…' : 'Select a category'}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isArchived ? ' (archived)' : ''}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            placeholder="e.g. Dinner with friends"
            maxLength={255}
            rows={2}
            error={errors.description?.message}
            hint="Optional · up to 255 characters"
            {...register('description')}
          />
        </div>
      </form>
    </Modal>
  );
}
