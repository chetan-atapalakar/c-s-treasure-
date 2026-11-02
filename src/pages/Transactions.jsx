import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import { useToast } from '../components/Toast.jsx';
import useRefData from '../hooks/useRefData.js';
import useDebounce from '../hooks/useDebounce.js';
import useMoney from '../hooks/useMoney.js';
import { listTransactions, deleteTransaction } from '../services/transactions.js';
import { formatDate } from '../utils/format.js';
import '../styles/pages.css';

const PAGE_SIZE = 25;
const DEFAULT_FILTERS = { q: '', kind: '', categoryId: '', accountId: '', from: '', to: '', sort: 'date_desc' };

export default function Transactions() {
  const toast = useToast();
  const { fmt } = useMoney();
  const { accounts, categories, loading: refLoading, error: refError, reload: reloadRef } = useRefData();
  const [searchParams] = useSearchParams();
  const urlQ = searchParams.get('q') ?? '';

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, q: urlQ });
  const [qInput, setQInput] = useState(urlQ);
  const debouncedQ = useDebounce(qInput, 350);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const reqRef = useRef(0);

  // The topbar search navigates here with ?q=...
  useEffect(() => {
    setQInput(urlQ);
  }, [urlQ]);

  useEffect(() => {
    setFilters((f) => (f.q === debouncedQ ? f : { ...f, q: debouncedQ }));
  }, [debouncedQ]);

  const load = useCallback(
    async (nextPage, append) => {
      const id = ++reqRef.current;
      if (append) setMoreLoading(true);
      else setLoading(true);
      setError('');
      try {
        const res = await listTransactions({ filters, page: nextPage, pageSize: PAGE_SIZE });
        if (id !== reqRef.current) return;
        setItems((prev) => (append ? [...prev, ...res.rows] : res.rows));
        setTotal(res.count);
        setPage(nextPage);
      } catch (err) {
        if (id === reqRef.current) setError(err.message || 'Could not load transactions.');
      } finally {
        if (id === reqRef.current) {
          setLoading(false);
          setMoreLoading(false);
        }
      }
    },
    [filters]
  );

  useEffect(() => {
    load(0, false);
  }, [load, reloadKey]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const activeFilters = ['kind', 'categoryId', 'accountId', 'from', 'to'].filter((k) => filters[k]).length + (filters.q ? 1 : 0);

  function clearFilters() {
    setQInput('');
    setFilters(DEFAULT_FILTERS);
  }

  function refreshAll() {
    setReloadKey((k) => k + 1);
    reloadRef();
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(tx) {
    setSelected(null);
    setEditing(tx);
    setFormOpen(true);
  }

  async function confirmDelete() {
    try {
      await deleteTransaction(deleting.id);
      toast.success('Transaction deleted.');
      setDeleting(null);
      refreshAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const rowMeta = (tx) => {
    const cat = catMap.get(tx.category_id);
    const acc = accMap.get(tx.account_id);
    return { cat, acc };
  };

  const selectedMeta = selected ? rowMeta(selected) : null;
  const hasMore = items.length < total;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Transactions</h1>
        <div className="page-head__actions">
          <Button variant="primary" icon="plus" onClick={openAdd}>Add transaction</Button>
        </div>
      </div>

      <Card className="stack">
        <div className="filters">
          <Field className="filters__search" icon="search" type="search" label="Search" placeholder="Search descriptions" value={qInput} onChange={(e) => setQInput(e.target.value)} />
          <Field as="select" label="Type" value={filters.kind} onChange={setFilter('kind')}>
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Field>
          <Field as="select" label="Category" value={filters.categoryId} onChange={setFilter('categoryId')}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Field>
          <Field as="select" label="Account" value={filters.accountId} onChange={setFilter('accountId')}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Field>
          <Field label="From" type="date" value={filters.from} onChange={setFilter('from')} />
          <Field label="To" type="date" value={filters.to} onChange={setFilter('to')} />
          <Field as="select" label="Sort by" value={filters.sort} onChange={setFilter('sort')}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
          </Field>
        </div>
        <div className="filters-bar">
          <span>{loading ? 'Loading…' : `${total} transaction${total === 1 ? '' : 's'}`}</span>
          {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters ({activeFilters})</Button>}
        </div>
      </Card>

      <div style={{ marginTop: 18 }}>
        {(error || refError) && (
          <Card className="empty">
            <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
            <p>{error || refError}</p>
            <Button onClick={() => { refreshAll(); }}>Try again</Button>
          </Card>
        )}

        {!error && !refError && (loading || refLoading) && (
          <div className="skeleton-list" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 62 }} />)}
          </div>
        )}

        {!error && !refError && !loading && !refLoading && items.length === 0 && (
          <Card className="empty">
            <span className="empty__icon"><Icon name="receipt" size={30} /></span>
            <h2>{activeFilters ? 'No matching transactions' : 'No transactions yet'}</h2>
            <p>{activeFilters ? 'Try changing or clearing your filters.' : 'Add your first income or expense to start tracking.'}</p>
            {activeFilters ? <Button onClick={clearFilters}>Clear filters</Button> : <Button variant="primary" icon="plus" onClick={openAdd}>Add transaction</Button>}
          </Card>
        )}

        {!error && !refError && !loading && !refLoading && items.length > 0 && (
          <>
            <ul className="tx-list anim-stagger">
              {items.map((tx) => {
                const { cat, acc } = rowMeta(tx);
                const isIncome = tx.kind === 'income';
                return (
                  <li key={tx.id}>
                    <button type="button" className="tx-row" onClick={() => setSelected(tx)}>
                      <span className="tx-dot" style={{ '--c': cat?.color || 'var(--text-2)' }} />
                      <span className="tx-main">
                        <strong>{tx.description || cat?.name || (isIncome ? 'Income' : 'Expense')}</strong>
                        <span>{[cat?.name || 'No category', acc?.name, formatDate(tx.occurred_on)].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className={`tx-amount ${isIncome ? 'tx-amount--income' : 'tx-amount--expense'}`}>
                        {isIncome ? '+' : '−'}{fmt(tx.amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div style={{ display: 'grid', placeItems: 'center', marginTop: 18 }}>
                <Button loading={moreLoading} onClick={() => load(page + 1, true)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        transaction={editing}
        accounts={accounts}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          refreshAll();
        }}
      />

      <Modal
        open={Boolean(selected)}
        title="Transaction details"
        onClose={() => setSelected(null)}
        footer={
          selected && (
            <>
              <Button icon="trash" onClick={() => { setDeleting(selected); setSelected(null); }}>Delete</Button>
              <Button variant="primary" icon="edit" onClick={() => openEdit(selected)}>Edit</Button>
            </>
          )
        }
      >
        {selected && (
          <dl className="detail-list">
            <div><dt>Amount</dt><dd className={selected.kind === 'income' ? 'tx-amount--income' : 'tx-amount--expense'}>{selected.kind === 'income' ? '+' : '−'}{fmt(selected.amount)}</dd></div>
            <div><dt>Type</dt><dd style={{ textTransform: 'capitalize' }}>{selected.kind}</dd></div>
            <div><dt>Category</dt><dd>{selectedMeta?.cat?.name || 'No category'}</dd></div>
            <div><dt>Account</dt><dd>{selectedMeta?.acc?.name || 'Unknown'}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(selected.occurred_on)}</dd></div>
            <div><dt>Description</dt><dd>{selected.description || '—'}</dd></div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete transaction?"
        message="This removes the transaction and updates your account balance. This can’t be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}