import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage, errorStatus } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loginSchema } from '../features/schemas';
import type { z } from 'zod';
import { AuthLayout } from './AuthLayout';

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const status = errorStatus(err);
      if (status === 401 || status === 400) {
        // Inline error under the form on 401 (Plan §14)
        setError('root', { message: status === 401 ? 'Invalid email or password' : errorMessage(err) });
      } else {
        toast.error('Sign-in failed', errorMessage(err));
      }
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your personal expense ledger and budgets."
      footer={
        <>
          Don’t have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-fg hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {errors.root && (
          <div role="alert" className="flex items-center gap-2 rounded-control border border-danger/25 bg-danger/10 px-3 py-2.5 text-body-sm text-danger-fg">
            <Icon name="error" size={18} />
            {errors.root.message}
          </div>
        )}
        <Input label="Email address" type="email" autoComplete="email" icon="mail" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          icon="lock"
          placeholder="••••••••"
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
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Sign in to Dashboard
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-body-sm text-subtle">
          <Icon name="verified_user" size={16} className="text-success-fg" />
          You’ll stay signed in on this device for 30 days.
        </p>
      </form>
    </AuthLayout>
  );
}
