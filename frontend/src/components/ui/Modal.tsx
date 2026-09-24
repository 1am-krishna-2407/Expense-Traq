import clsx from 'clsx';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Render as a bottom sheet on mobile widths (Plan §14 filter sheet). */
  sheetOnMobile?: boolean;
}

const WIDTH = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/** Accessible dialog: focus moves in, Esc closes, focus returns to the trigger on close. */
export function Modal({ open, onClose, title, description, icon, children, footer, size = 'md', sheetOnMobile = true }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]');
    (firstField ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={clsx('fixed inset-0 z-[90] flex justify-center', sheetOnMobile ? 'items-end sm:items-center' : 'items-center p-4')}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/60" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          'relative flex max-h-[92vh] w-full flex-col border border-line bg-surface shadow-float outline-none dark:bg-[#131C2E] dark:border-line-strong',
          sheetOnMobile
            ? 'animate-sheet-up rounded-t-2xl sm:m-4 sm:animate-slide-up sm:rounded-card'
            : 'animate-slide-up rounded-card',
          WIDTH[size],
        )}
      >
        {sheetOnMobile && <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" />}
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-heading text-headline-sm text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-body-sm text-muted">{description}</p>}
          </div>
          <IconButton icon="close" label="Close dialog" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3.5 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
