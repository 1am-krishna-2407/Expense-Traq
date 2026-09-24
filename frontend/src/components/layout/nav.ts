export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

/** Sidebar order from the designs. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/expenses', label: 'Expenses', icon: 'receipt_long' },
  { to: '/budgets', label: 'Budgets', icon: 'account_balance_wallet' },
  { to: '/categories', label: 'Categories', icon: 'grid_view' },
  { to: '/reports', label: 'Reports', icon: 'bar_chart' },
];
