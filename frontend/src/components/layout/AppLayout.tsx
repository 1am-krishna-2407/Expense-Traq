import clsx from 'clsx';
import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePeriod } from '../../context/PeriodContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { Avatar, Logo } from '../ui/Brand';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { MonthPicker } from '../ui/MonthPicker';
import { NAV_ITEMS } from './nav';
import { QuickAddProvider, useQuickAdd } from './QuickAdd';

function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  return async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
      toast.notify('info', 'Signed out', 'Your session has ended on this device.');
    }
  };
}

function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={clsx('flex h-10 w-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-hover hover:text-ink', className)}
    >
      <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={21} />
    </button>
  );
}

/** Desktop sidebar (≥1024px). */
function Sidebar() {
  const { user } = useAuth();
  const onLogout = useLogout();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col justify-between border-r border-line bg-surface shadow-card lg:flex">
      <div>
        <div className="flex h-16 items-center border-b border-line px-6 dark:border-line">
          <Logo />
        </div>
        <nav aria-label="Main" className="mt-4 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-control px-3 py-2.5 text-body-md font-semibold transition-colors',
                  isActive ? 'bg-primary text-white shadow-card' : 'text-muted hover:bg-hover hover:text-ink',
                )
              }
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {user && (
        <div className="m-3 flex flex-col gap-2.5 rounded-card border border-line bg-surface-2 p-3 dark:bg-[#131C2E]">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-subtle">{user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="flex items-center gap-1.5 text-body-sm font-medium text-danger-fg hover:underline">
            <Icon name="logout" size={16} />
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}

function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/expenses?search=${encodeURIComponent(q)}` : '/expenses');
  };
  return (
    <form role="search" onSubmit={onSubmit} className={clsx('relative', className)}>
      <Icon name="search" size={19} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search transactions…"
        aria-label="Search transactions"
        className="h-10 w-full rounded-control border border-line bg-surface pl-10 pr-3 text-body-md text-ink shadow-card placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-surface-2"
      />
    </form>
  );
}

/** Desktop top bar: month picker, search, theme, Add Expense, avatar. */
function TopBar() {
  const { user } = useAuth();
  const { period, setPeriod } = usePeriod();
  const { openExpense } = useQuickAdd();
  return (
    <header className="fixed left-sidebar right-0 top-0 z-30 hidden h-16 border-b border-line bg-canvas/80 backdrop-blur-xl lg:block dark:bg-surface/90">
      <div className="flex h-full items-center justify-between gap-4 px-6">
        <div className="flex max-w-xl flex-1 items-center gap-3">
          <MonthPicker value={period} onChange={setPeriod} />
          <SearchBox className="flex-1" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button icon="add" onClick={() => openExpense()}>
            Add Expense
          </Button>
          {user && <Avatar name={user.name} size={34} />}
        </div>
      </div>
    </header>
  );
}

/** Mobile: compact header + hamburger drawer for secondary items (Plan §14). */
function MobileHeader() {
  const { user } = useAuth();
  const { period, setPeriod } = usePeriod();
  const onLogout = useLogout();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl lg:hidden dark:bg-surface/95">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-control text-ink hover:bg-hover"
            >
              <Icon name="menu" size={24} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          <MonthPicker value={period} onChange={setPeriod} />
          <SearchBox className="flex-1" />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40 dark:bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] animate-slide-up flex-col border-l border-line bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-heading text-headline-sm text-ink">Menu</span>
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-control p-2 text-subtle hover:bg-hover">
                <Icon name="close" size={22} />
              </button>
            </div>
            {user && (
              <div className="mb-4 flex items-center gap-3 rounded-card bg-surface-2 p-3 dark:bg-canvas">
                <Avatar name={user.name} size={36} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-body-sm text-subtle">{user.email}</p>
                </div>
              </div>
            )}
            <nav aria-label="Secondary" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-control px-3 py-2.5 font-semibold',
                      isActive ? 'bg-primary text-white' : 'text-muted hover:bg-hover hover:text-ink',
                    )
                  }
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              onClick={onLogout}
              className="mt-auto flex items-center gap-2 rounded-control px-3 py-2.5 font-semibold text-danger-fg hover:bg-danger/10"
            >
              <Icon name="logout" size={20} />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Mobile bottom tab bar: 4 destinations + central Add button. */
function BottomNav() {
  const { openExpense } = useQuickAdd();
  const tabs = NAV_ITEMS.filter((i) => i.to !== '/categories');
  const renderTab = (item: (typeof tabs)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        clsx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-primary-fg' : 'text-subtle')
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} size={22} filled={isActive} />
          {item.label}
        </>
      )}
    </NavLink>
  );
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {tabs.slice(0, 2).map(renderTab)}
      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          aria-label="Add expense"
          onClick={() => openExpense()}
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-float ring-4 ring-canvas transition-transform active:scale-95"
        >
          <Icon name="add" size={28} />
        </button>
      </div>
      {tabs.slice(2).map(renderTab)}
    </nav>
  );
}

export function AppLayout() {
  return (
    <QuickAddProvider>
      <div className="min-h-screen bg-canvas">
        <Sidebar />
        <TopBar />
        <MobileHeader />
        <main className="px-4 pb-28 pt-4 sm:px-6 lg:ml-sidebar lg:px-6 lg:pb-10 lg:pt-[5.5rem]">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </QuickAddProvider>
  );
}
