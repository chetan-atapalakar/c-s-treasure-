import { useCallback, useEffect, useState } from 'react';
import { listAccounts } from '../services/accounts.js';
import { listCategories } from '../services/categories.js';

// Accounts (with derived balances) and categories, shared by many pages.
export default function useRefData() {
  const [state, setState] = useState({ accounts: [], categories: [], loading: true, error: '' });

  const reload = useCallback(async () => {
    try {
      const [accounts, categories] = await Promise.all([listAccounts(), listCategories()]);
      setState({ accounts, categories, loading: false, error: '' });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message || 'Could not load your data.' }));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}