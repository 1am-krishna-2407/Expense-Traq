import { format, parseISO } from 'date-fns';

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

/** ₹4,25,800 — Indian digit grouping (SpendWise typography rules). Shows paise only when present. */
export function formatINR(value: number, opts: { decimals?: 'auto' | 'always' | 'never' } = {}): string {
  const mode = opts.decimals ?? 'auto';
  if (mode === 'always') return inr2.format(value);
  if (mode === 'never') return inr0.format(value);
  return Number.isInteger(value) ? inr0.format(value) : inr2.format(value);
}

/** ₹17.5K style for tight spots (chart axes, donut centre). */
export const formatCompactINR = (value: number) => `₹${compact.format(value)}`;

export const formatPercent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? '—' : `${value.toFixed(digits).replace(/\.0+$/, '')}%`;

/** "23 Sep 2026" from a YYYY-MM-DD calendar date (parsed as local, never shifted by timezone). */
export const formatDate = (isoDate: string, pattern = 'd MMM yyyy') => format(parseISO(isoDate), pattern);

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const monthLabel = (month: number, year: number) => `${MONTHS[month - 1]} ${year}`;
export const shortMonth = (month: number) => MONTHS[month - 1].slice(0, 3);

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
