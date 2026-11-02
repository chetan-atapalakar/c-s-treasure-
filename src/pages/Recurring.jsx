import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import RecurringForm from '../components/RecurringForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import useRefData from '../hooks/useRefData.js';
import useMoney from '../hooks/useMoney.js';
import { deleteRecurring, listRecurring, listRecurringHistory, runDueRecurring, updateRecurring } from '../services/recurring.js';
import { round2 } from '../utils/finance.js';
import { daysUntil } from '../utils/dates.js';
import { formatDate } from '../utils/format.js';
import { monthlyEquivalent } from '../utils/planning.js';
import '../styles/pages.css';
import '../styles/planning.css';

const FREQ = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expenses' },
  { id: 'sub', label: 'Subscriptions' },
];

function DueLabel({ item }) {
  if (!item.active) return <span className="due muted">Paused</span>;
  const d = daysUntil(item.next_due);
  if (d < 0) return <span className="due due--late">Overdue since {formatDate(item.next_due)}</span>;
  if (d === 0) return <span className="due due--soon">Due today</span>;
  if (d <= 7) return <span className="due due--soon">Due in {d} day{d === 1 ? '' : 's'}</span>;
  return <span className="due muted">Next: {formatDate(item.next_due)}</span>;
}

function RecurringHistory({ item, onClose }) {
  const { fmt } = useMoney();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    listRecurringHistory(item.id)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item.id]);

  return (
    <Modal open title={`${item.description || 'Recurring'} history`} onClose={onClose}>
      {loading && <div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 54 }} />)}</div>}
      {!loading && error && <p className="auth-alert" role="alert">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <div className="empty">
          <span className="empty__icon"><Icon name="repeat" size={28} /></span>
          <p>Nothing has been posted yet.</p>
        </div>
      )}
      {!loading && !error && rows.length > 0 && (
        <ul className="tx-list">
          {rows.map((t) => (
            <li key={t.id} className="tx-row tx-row--static">
              <span className="tx-dot" style={{ '--c': t.kind === 'income' ? 'var(--green)' : 'var(--red)' }} />
              <span className="tx-main">
                <strong>{t.description || 'Recurring transaction'}</strong>
                <span>{formatDate(t.occurred_on)}</span>
              </span>
              <span className={`tx-amount ${t.kind === 'income' ? 'tx-amount--income' : 'tx-amount--expense'}`}>{t.kind === 'income' ? '+' : '−'}{fmt(t.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function Recurring() {
  const toast = useToast();
  const { fmt } = useMoney();
  const { accounts, categories, loading: refLoading, error: refError, reload: reloadRef } = useRefData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await listRecurring());
    } catch (err) {
      setError(err.message || 'Could not load recurring items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const summary = useMemo(() => {
    const active = items.filter((i) => i.active);
    const sum = (list) => round2(list.reduce((s, i) => s + monthlyEquivalent(i.amount, i.frequency), 0));
    return {
      income: sum(active.filter((i) => i.kind === 'income')),
      expense: sum(active.filter((i) => i.kind === 'expense')),
      subs: sum(active.filter((i) => i.is_subscription)),
    };
  }, [items]);

  const visible = items.filter((i) => {
    if (filter === 'income') return i.kind === 'income';
    if (filter === 'expense') return i.kind === 'expense';
    if (filter === 'sub') return i.is_subscription;
    return true;
  });

  // Posts anything due (the database prevents duplicates), then reloads.
  async function postDueAndReload() {
    try {
      const n = await runDueRecurring();
      if (n > 0) toast.info(`${n} recurring transaction${n > 1 ? 's' : ''} posted.`);
    } catch {
      /* posting is retried next time the app opens */
    }
    await load();
    reloadRef();
  }

  async function togglePause(item) {
    setBusyId(item.id);
    try {
      await updateRecurring(item.id, { active: !item.active });
      toast.success(item.active ? 'Paused.' : 'Resumed.');
      await postDueAndReload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    try {
      await deleteRecurring(deleting.id);
      toast.success('Recurring item deleted. Past transactions were kept.');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const fatal = error || refError;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Recurring</h1>
        <div className="page-head__actions">
          <Button variant="primary" icon="plus" onClick={openNew}>New recurring item</Button>
        </div>
      </div>

      {fatal && (
        <Card className="empty">
          <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <p>{fatal}</p>
          <Button onClick={() => { setLoading(true); load(); reloadRef(); }}>Try again</Button>
        </Card>
      )}

      {!fatal && (loading || refLoading) && (
        <div className="grid-cards" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
      )}

      {!fatal && !loading && !refLoading && (
        <div className="stack">
          <div className="grid-cards anim-stagger">
            <Card accent="green" className="stat">
              <span className="stat__label">RECURRING INCOME / MONTH</span>
              <span className="stat__value num num--income">{fmt(summary.income)}</span>
            </Card>
            <Card accent="red" className="stat">
              <span className="stat__label">RECURRING EXPENSES / MONTH</span>
              <span className="stat__value num num--expense">{fmt(summary.expense)}</span>
            </Card>
            <Card accent="purple" className="stat">
              <span className="stat__label">SUBSCRIPTIONS / MONTH</span>
              <span className="stat__value num num--insight">{fmt(summary.subs)}</span>
            </Card>
          </div>

          {items.length > 0 && (
            <div className="chips" role="group" aria-label="Filter">
              {FILTERS.map((f) => (
                <Button key={f.id} size="sm" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Button>
              ))}
            </div>
          )}

          {items.length === 0 && (
            <Card className="empty">
              <span className="empty__icon"><Icon name="repeat" size={30} /></span>
              <h2>Nothing recurring yet</h2>
              <p>Add rent, salary or subscriptions once and they’ll post automatically on schedule.</p>
              <Button variant="primary" icon="plus" onClick={openNew}>New recurring item</Button>
            </Card>
          )}

          {items.length > 0 && visible.length === 0 && (
            <Card className="empty"><p>No items match this filter.</p></Card>
          )}

          {visible.length > 0 && (
            <div className="grid-2 anim-stagger">
              {visible.map((item) => {
                const cat = catMap.get(item.category_id);
                const acc = accMap.get(item.account_id);
                const income = item.kind === 'income';
                return (
                  <Card key={item.id} interactive className={`plan-card ${item.active ? '' : 'is-paused'}`}>
                    <div className="plan-card__top">
                      <span className="type-icon" style={{ '--c': income ? 'var(--green)' : item.is_subscription ? 'var(--purple)' : 'var(--red)' }}>
                        <Icon name={item.is_subscription ? 'repeat' : income ? 'arrowDown' : 'arrowUp'} />
                      </span>
                      <div className="grow">
                        <div className="plan-card__title">{item.description || cat?.name || (income ? 'Recurring income' : 'Recurring expense')}</div>
                        <div className="plan-card__sub">{[cat?.name, acc?.name].filter(Boolean).join(' · ') || 'No category'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={`num ${income ? 'num--income' : 'num--expense'}`} style={{ fontWeight: 700 }}>{income ? '+' : '−'}{fmt(item.amount)}</div>
                        <div className="plan-card__sub">{FREQ[item.frequency]}</div>
                      </div>
                    </div>
                    <div className="row row--between row--wrap">
                      <DueLabel item={item} />
                      {item.is_subscription && <span className="badge badge--manual">Subscription</span>}
                    </div>
                    <div className="plan-card__actions">
                      <Button size="sm" loading={busyId === item.id} icon={item.active ? undefined : 'check'} onClick={() => togglePause(item)}>{item.active ? 'Pause' : 'Resume'}</Button>
                      <Button size="sm" icon="receipt" onClick={() => setHistory(item)}>History</Button>
                      <Button size="sm" variant="ghost" iconOnly icon="edit" aria-label="Edit" onClick={() => { setEditing(item); setFormOpen(true); }} />
                      <Button size="sm" variant="ghost" iconOnly icon="trash" aria-label="Delete" onClick={() => setDeleting(item)} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <RecurringForm
        open={formOpen}
        item={editing}
        accounts={accounts}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          postDueAndReload();
        }}
      />

      {history && <RecurringHistory item={history} onClose={() => setHistory(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete recurring item?"
        message="It will stop posting. Transactions it already created stay in your history."
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}