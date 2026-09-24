import clsx from 'clsx';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  notify: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastKind, { icon: string; accent: string }> = {
  success: { icon: 'check_circle', accent: 'text-success-fg bg-success/10' },
  error: { icon: 'error', accent: 'text-danger-fg bg-danger/10' },
  info: { icon: 'info', accent: 'text-primary-fg bg-primary/10' },
};

/** "Action completed" banners from the designs, stacked bottom-right (top on mobile). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, kind, title, message }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, message) => notify('success', title, message),
      error: (title, message) => notify('error', title, message),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-96"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="card pointer-events-auto flex animate-slide-up items-start gap-3 p-3.5 shadow-float"
          >
            <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', STYLES[t.kind].accent)}>
              <Icon name={STYLES[t.kind].icon} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{t.title}</p>
              {t.message && <p className="mt-0.5 text-body-sm text-muted">{t.message}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="rounded-control p-1 text-subtle hover:bg-hover hover:text-ink"
              onClick={() => dismiss(t.id)}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
