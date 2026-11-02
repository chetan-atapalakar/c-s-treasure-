// Single source of truth for sidebar, bottom nav and App routes.
// `file` is the page component filename in src/pages (without .jsx).
export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', file: 'Dashboard', mobile: true },
  { path: '/transactions', label: 'Transactions', icon: 'receipt', file: 'Transactions', mobile: true },
  { path: '/accounts', label: 'Accounts', icon: 'wallet', file: 'Accounts', mobile: true },
  { path: '/budgets', label: 'Budgets', icon: 'target', file: 'Budgets', mobile: true },
  { path: '/goals', label: 'Savings Goals', icon: 'piggy', file: 'SavingsGoals' },
  { path: '/analytics', label: 'Analytics', icon: 'chart', file: 'Analytics' },
  { path: '/recurring', label: 'Recurring', icon: 'repeat', file: 'Recurring' },
  { path: '/insights', label: 'Insights', icon: 'bulb', file: 'Insights' },
  { path: '/profile', label: 'Profile', icon: 'user', file: 'Profile', menu: true },
  { path: '/settings', label: 'Settings', icon: 'settings', file: 'Settings', menu: true },
];