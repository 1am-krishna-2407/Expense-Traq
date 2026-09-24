import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { errorMessage, errorStatus, fieldErrors } from '../../api/client';
import type { Category } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { CATEGORY_COLORS, categoryIcon } from '../../lib/categoryIcons';
import { categoryFormSchema, type CategoryFormValues } from '../schemas';
import { useCreateCategory, useUpdateCategory } from './hooks';

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
}

export function CategoryFormModal({ open, onClose, category }: CategoryFormModalProps) {
  const isEdit = !!category;
  const toast = useToast();
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categoryFormSchema), defaultValues: { name: '', color: CATEGORY_COLORS[0] } });

  useEffect(() => {
    if (!open) return;
    reset(category ? { name: category.name, color: category.color ?? CATEGORY_COLORS[0] } : { name: '', color: CATEGORY_COLORS[0] });
  }, [open, category, reset]);

  const color = watch('color');
  const name = watch('name');

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && category) {
        await update.mutateAsync({ id: category.id, name: values.name, color: values.color });
        toast.success('Category updated');
      } else {
        await create.mutateAsync({ name: values.name, color: values.color });
        toast.success('Category created', `“${values.name}” is ready for expenses and budgets.`);
      }
      onClose();
    } catch (err) {
      const fields = fieldErrors(err);
      if (errorStatus(err) === 409) setError('name', { message: 'A category with this name already exists' });
      else if (fields.name) setError('name', { message: fields.name });
      else setError('root', { message: errorMessage(err) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={isEdit ? 'Edit category' : 'Add category'}
      description="Categories group your expenses and budgets."
      icon={
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control" style={{ color, backgroundColor: `${color}1F` }}>
          <Icon name={categoryIcon(name || 'category')} size={20} />
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={isSubmitting} icon="check">
            {isEdit ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {errors.root && (
          <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-body-sm text-danger-fg">
            {errors.root.message}
          </p>
        )}
        <Input label="Name" placeholder="e.g. Groceries" maxLength={50} error={errors.name?.message} {...register('name')} />
        <fieldset>
          <legend className="mb-2 text-label-md font-semibold text-ink-2">Colour</legend>
          <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Category colour">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Colour ${c}`}
                onClick={() => setValue('color', c, { shouldDirty: true })}
                className={clsx(
                  'flex h-9 items-center justify-center rounded-control transition-transform hover:scale-105',
                  color === c && 'ring-2 ring-offset-2 ring-offset-surface',
                )}
                style={{ backgroundColor: c, ['--tw-ring-color' as string]: c }}
              >
                {color === c && <Icon name="check" size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
