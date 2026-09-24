import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/ui/Brand';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../context/ThemeContext';

/** Centred single-column card, full-height on mobile (Plan §14, login/sign-up designs). */
export function AuthLayout({ badge, title, subtitle, children, footer }: { badge?: ReactNode; title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-canvas px-4 py-8 sm:justify-center sm:py-12">
      {/* Ambient glow from the dark sign-up design */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[28rem] w-[28rem] rounded-full bg-success/5 blur-3xl dark:bg-success/10" />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-control text-muted hover:bg-hover hover:text-ink"
      >
        <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={21} />
      </button>

      <Link to="/" className="relative mb-6 flex items-center gap-2" aria-label="RupeeFlow home">
        <LogoMark size={36} />
        <span className="font-heading text-headline-sm font-bold text-ink">RupeeFlow</span>
      </Link>

      <main className="relative w-full max-w-[30rem] rounded-card border border-line bg-surface p-6 shadow-float sm:p-10 dark:bg-[#131C2E]">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 p-1.5 ring-1 ring-line dark:bg-surface">
            <LogoMark size={52} />
          </span>
          {badge}
          <h1 className="font-heading text-headline-md text-ink">{title}</h1>
          <p className="mt-2 max-w-sm text-body-md text-muted">{subtitle}</p>
        </div>
        {children}
        <div className="mt-7 border-t border-line pt-5 text-center text-body-md text-muted">{footer}</div>
      </main>
    </div>
  );
}
