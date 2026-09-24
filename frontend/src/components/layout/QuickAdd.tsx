import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Expense } from '../../api/types';
import { ExpenseFormModal } from '../../features/expenses/ExpenseFormModal';

interface QuickAddValue {
  /** Opens the expense modal — create mode, or edit mode when given an expense. */
  openExpense: (expense?: Expense) => void;
}

const QuickAddContext = createContext<QuickAddValue | null>(null);

/** One shared expense modal, reachable from the top bar, mobile FAB and any page. */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const openExpense = useCallback((expense?: Expense) => {
    setEditing(expense ?? null);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openExpense }), [openExpense]);

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <ExpenseFormModal open={open} expense={editing} onClose={() => setOpen(false)} />
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd(): QuickAddValue {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error('useQuickAdd must be used inside <QuickAddProvider>');
  return ctx;
}
