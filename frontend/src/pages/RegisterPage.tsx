import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { errorMessage, errorStatus, fieldErrors } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PASSWORD_RULES, registerSchema } from '../features/schemas';
import { AuthLayout } from './AuthLayout';

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;

  const onSubmit = handleSubmit(async ({ name, email, password: pw }) => {
    try {
      await registerAccount({ name, email, password: pw });
      toast.success('Welcome to RupeeFlow!', 'We’ve set up six starter categories for you.');
      navigate('/dashboard', { replace: true }); // auto-logged in → empty dashboard (Plan §3)
    } catch (err) {
      if (errorStatus(err) === 409) {
        setError('email', { message: 'An account with this email already exists' });
        return;
      }
      const fields = fieldErrors(err);
      const known = (['name', 'email', 'password'] as const).filter((f) => fields[f]);
      known.forEach((f) => setError(f, { message: fields[f] }));
      if (known.length === 0) toast.error('Registration failed', errorMessage(err));
    }
  });

  return (
    <AuthLayout
      badge={
        <Badge tone="primary" className="mb-3">
          <Icon name="shield" size={13} />
          Ledgers &amp; budgets
        </Badge>
      }
      title="Create your RupeeFlow account"
      subtitle="Start tracking expenses, setting monthly budgets and understanding where your money goes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-fg hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Full name" autoComplete="name" icon="person" placeholder="Krishna Sharma" error={errors.name?.message} {...register('name')} />
        <Input label="Email address" type="email" autoComplete="email" icon="mail" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Create password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            icon="lock"
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="flex h-8 w-8 items-center justify-center rounded-control text-subtle hover:text-ink"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
              </button>
            }
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            icon="shield"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        {/* Live security checklist from the sign-up design, limited to the rules the API enforces */}
        <div className="rounded-control border border-line bg-surface-2 p-3 dark:bg-canvas">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-caps">Password checklist</span>
            <span className={clsx('flex items-center gap-1 text-body-sm font-semibold', passed === PASSWORD_RULES.length ? 'text-success-fg' : 'text-subtle')}>
              <Icon name="check_circle" size={15} />
              {passed} / {PASSWORD_RULES.length}
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <li key={rule.id} className={clsx('flex items-center gap-1.5 text-body-sm', ok ? 'text-success-fg' : 'text-subtle')}>
                  <Icon name={ok ? 'check_circle' : 'radio_button_unchecked'} size={15} />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} iconRight="arrow_forward">
          Create account &amp; continue
        </Button>
      </form>
    </AuthLayout>
  );
}
