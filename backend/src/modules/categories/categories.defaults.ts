/**
 * Default categories seeded for every new user inside the registration transaction
 * (Plan §8 seed-data strategy). Colours come from the RupeeFlow palette.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Food', color: '#2563EB' },
  { name: 'Transport', color: '#64748B' },
  { name: 'Utilities', color: '#F59E0B' },
  { name: 'Entertainment', color: '#10B981' },
  { name: 'Health', color: '#8B5CF6' },
  { name: 'Other', color: '#94A3B8' },
];
