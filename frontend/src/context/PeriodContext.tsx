import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Period } from '../api/types';
import { currentPeriod } from '../lib/dates';

interface PeriodContextValue {
  period: Period;
  setPeriod: (p: Period) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

/**
 * The month/year selected in the top bar, shared by Dashboard, Budgets and Categories so
 * switching month in one place keeps every screen consistent.
 */
export function PeriodProvider({ children, initial }: { children: ReactNode; initial?: Period }) {
  const [period, setPeriod] = useState<Period>(initial ?? currentPeriod());
  const value = useMemo(() => ({ period, setPeriod }), [period]);
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used inside <PeriodProvider>');
  return ctx;
}
