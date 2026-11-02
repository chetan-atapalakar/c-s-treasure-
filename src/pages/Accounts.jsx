import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AccountForm from '../components/AccountForm.jsx';
import TransferForm from '../components/TransferForm.jsx';
import { useToast } from '../components/Toast.jsx';
import useRefData from '../hooks/useRefData.js';
import useMoney from '../hooks/useMoney.js';
import { deleteAccount } from '../services/accounts.js';
import { listAccountTransactions } from '../services/transactions.js';
import { listAccountTransfers, deleteTransfer } from '../services/transfers.js';
import { accountTypeMeta, isLiability, summarizeAccounts } from '../utils/finance.js';
import { formatDate } from '../utils/format.js';
import '../styles/pages.css';

function AccountHistory({ account, accounts, categories, onClose, onChanged }) {
  const toast = useToast();
  const { fmt } = useMoney();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);

  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [txs, trs] = await Promise.all([listAccountTransactions(account.id), listAccountTransfers(account.id)]);
      const merged = [
        ...txs.map((t) => ({ ...t, _type: 'tx' })),
        ...trs.map((t) => ({ ...t, _type: 'transfer' })),
      ].sort((a, b) => (b.occurred_on + b.created_at).localeCompare(a.occurred_on + a.created_at));
      setItems(merged);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [account.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmRemove() {
    try {
      await deleteTransfer(removing.id);
      toast.success('Transfer deleted.');
      setRemoving(null);
      await load();
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <Modal open title={`${account.name} history`} onClose={onClose}>
        {loading && <div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 54 }} />)}</div>}
        {!loading && error && <p className="auth-alert" role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">
            <span className="empty__icon"><Icon name="receipt" size={28} /></span>
            <p>No activity on this account yet.</p>
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="tx-list">
            {items.map((item) => {
              if (item._type === 'tx') {
                const cat = catMap.get(item.category_id);
                const income = item.kind === 'income';
                return (
                  <li key={`t-${item.id}`} className="tx-row tx-row--static">
                    <span className="tx-dot" style={{ '--c': cat?.color || 'var(--text-2)' }} />
                    <span className="tx-main">
                      <strong>{item.description || cat?.name || (income ? 'Income' : 'Expense')}</strong>
                      <span>{[cat?.name, formatDate(item.occurred_on)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={`tx-amount ${income ? 'tx-amount--income' : 'tx-amount--expense'}`}>{income ? '+' : '−'}{fmt(item.amount)}</span>
                  </li>
                );
              }
              const incoming = item.to_account_id === account.id;
              const other = accMap.get(incoming ? item.from_account_id : item.to_account_id);
              return (
                <li key={`x-${item.id}`} className="tx-row tx-row--static">
                  <span className="tx-dot" style={{ '--c': 'var(--purple)' }} />
                  <span className="tx-main">
                    <strong>{incoming ? `Transfer from ${other?.name || 'account'}` : `Transfer to ${other?.name || 'account'}`}</strong>
                    <span>{[item.note, formatDate(item.occurred_on)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="tx-amount tx-amount--neutral">{incoming ? '+' : '−'}{fmt(item.amount)}</span>
                  <Button variant="ghost" size="sm" iconOnly icon="trash" aria-label="Delete transfer" onClick={() => setRemoving(item)} />
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete transfer?"
        message="Both account balances will be adjusted. This can’t be undone."
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

export default function Accounts() {
  const toast = useToast();
  const { fmt } = useMoney();
  const { accounts, categories, loading, error, reload } = useRefData();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const summary = useMemo(() => summarizeAccounts(accounts), [accounts]);

  async function confirmDelete() {
    try {
      await deleteAccount(deleting.id);
      toast.success('Account deleted.');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Accounts</h1>
        <div className="page-head__actions">
          <Button icon="swap" onClick={() => { setTransferFrom(''); setTransferOpen(true); }}>Transfer</Button>
          <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setFormOpen(true); }}>New account</Button>
        </div>
      </div>

      {error && (
        <Card className="empty">
          <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <p>{error}</p>
          <Button onClick={reload}>Try again</Button>
        </Card>
      )}

      {!error && loading && (
        <div className="grid-cards" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
        </div>
      )}

      {!error && !loading && (
        <div className="stack">
          <div className="grid-cards anim-stagger">
            <Card accent="purple" className="stat">
              <span className="stat__label">NET WORTH</span>
              <span className="stat__value num num--insight">{fmt(summary.netWorth)}</span>
            </Card>
            <Card accent="green" className="stat">
              <span className="stat__label">TOTAL ASSETS</span>
              <span className="stat__value num num--income">{fmt(summary.assets)}</span>
            </Card>
            <Card accent="red" className="stat">
              <span className="stat__label">TOTAL LIABILITIES</span>
              <span className="stat__value num num--expense">{fmt(summary.liabilities)}</span>
            </Card>
          </div>

          {accounts.length === 0 ? (
            <Card className="empty">
              <span className="empty__icon"><Icon name="wallet" size={30} /></span>
              <h2>No accounts yet</h2>
              <p>Add a cash wallet or bank account to start tracking balances.</p>
              <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setFormOpen(true); }}>New account</Button>
            </Card>
          ) : (
            <div className="grid-2 anim-stagger">
              {accounts.map((a) => {
                const meta = accountTypeMeta(a.type);
                const liability = isLiability(a.type);
                const balance = Number(a.balance) || 0;
                const shown = liability ? -balance : balance;
                const bad = liability ? shown > 0 : shown < 0;
                return (
                  <Card key={a.id} interactive className="account-card">
                    <div className="account-card__top">
                      <span className="type-icon" style={{ '--c': liability ? 'var(--red)' : 'var(--orange)' }}><Icon name={meta.icon} /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="account-card__name">{a.name}</div>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="muted" style={{ fontSize: '0.82rem' }}>{meta.label}</span>
                          {a.is_manual && <span className="badge badge--manual">Manual</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="stat__label">{liability ? 'AMOUNT OWED' : 'BALANCE'}</div>
                      <div className={`account-card__balance num ${bad ? 'num--expense' : 'num--income'}`}>{fmt(shown)}</div>
                    </div>
                    <div className="account-card__actions">
                      <Button size="sm" icon="receipt" onClick={() => setHistory(a)}>History</Button>
                      <Button size="sm" icon="swap" onClick={() => { setTransferFrom(a.id); setTransferOpen(true); }}>Transfer</Button>
                      <Button size="sm" variant="ghost" iconOnly icon="edit" aria-label={`Edit ${a.name}`} onClick={() => { setEditing(a); setFormOpen(true); }} />
                      <Button size="sm" variant="ghost" iconOnly icon="trash" aria-label={`Delete ${a.name}`} onClick={() => setDeleting(a)} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AccountForm
        open={formOpen}
        account={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />

      <TransferForm
        open={transferOpen}
        accounts={accounts}
        defaultFrom={transferFrom}
        onClose={() => setTransferOpen(false)}
        onSaved={() => {
          setTransferOpen(false);
          reload();
        }}
      />

      {history && (
        <AccountHistory account={history} accounts={accounts} categories={categories} onClose={() => setHistory(null)} onChanged={reload} />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting ? `Delete “${deleting.name}”?` : 'Delete account?'}
        message="This permanently deletes the account along with all its transactions, transfers and recurring items. This can’t be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}