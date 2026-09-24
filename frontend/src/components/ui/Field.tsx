import clsx from 'clsx';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';

const controlBase =
  'w-full rounded-control border bg-surface text-ink placeholder:text-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-60 dark:bg-canvas';

const borderFor = (invalid?: boolean) => (invalid ? 'border-danger focus:ring-danger/30 focus:border-danger' : 'border-line-strong dark:border-line');

interface FieldShellProps {
  label?: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Label + control + inline error (Plan §14: inline field errors). */
export function FieldShell({ label, hint, error, htmlFor, aside, children, className }: FieldShellProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {(label || aside) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className="text-label-md font-semibold text-ink-2">
              {label}
            </label>
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="flex items-center gap-1 text-body-sm text-danger-fg">
          <Icon name="error" size={14} />
          {error}
        </p>
      ) : (
        hint && <p className="text-body-sm text-subtle">{hint}</p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
  icon?: string;
  prefix?: string;
  trailing?: ReactNode;
  aside?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, prefix, trailing, aside, id, className, containerClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} aside={aside} className={containerClassName}>
      <div className="relative">
        {icon && <Icon name={icon} size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />}
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-medium text-subtle">{prefix}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={clsx(controlBase, borderFor(!!error), 'h-10 px-3', (icon || prefix) && 'pl-9', trailing && 'pr-10', className)}
          {...rest}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className, containerClassName, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={selectId} className={containerClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={clsx(controlBase, borderFor(!!error), 'h-10 cursor-pointer appearance-none pl-3 pr-9', className)}
          {...rest}
        >
          {children}
        </select>
        <Icon name="expand_more" size={20} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle" />
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={areaId}>
      <textarea
        ref={ref}
        id={areaId}
        aria-invalid={!!error || undefined}
        className={clsx(controlBase, borderFor(!!error), 'min-h-[76px] resize-y px-3 py-2', className)}
        {...rest}
      />
    </FieldShell>
  );
});
