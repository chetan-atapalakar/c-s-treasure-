import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import Button from './Button.jsx';
import { useToast } from './Toast.jsx';
import { createTransaction, updateTransaction } from '../services/transactions.js';
import { parseAmount } from '../utils/finance.js';
import { toISODate } from '../utils/format.js';

function Body({ transaction, accounts, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(transaction);
  const [kind, setKind] = useState(transaction?.kind || 'expense');
  const [amount, setAmount] = useState(editing ? String(transaction.amount) : '');
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
  const [accountId, setAccountId] = useState(transaction?.account_id || accounts[0]?.id || '');
  const [date, setDate] = useState(transaction?.occurred_on || toISODate());
  const [description, setDescription] = useState(transaction?.description || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const kindCategories = categories.filter((c) => c.kind === kind);

  function changeKind(next) {
    setKind(next);
    setCategoryId('');
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const value = parseAmount(amount);
    if (Number.isNaN(value)) errs.amount = 'Enter an amount above 0 with up to 2 decimals.';
    if (!accountId) errs.accountId = 'Choose an account.';
    if (!date) errs.date = 'Choose a date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        kind,
        amount: value,
        account_id: accountId,
        category_id: categoryId || null,
        description: description.trim(),
        occurred_on: date,
      };
      if (editing) await updateTransaction(transaction.id, payload);
      else await createTransaction(payload);
      toast.success(editing ? 'Transaction updated.' : 'Transaction added.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="stack">
        <p className="muted">Create an account before adding transactions.</p>
        <div className="modal__foot"><Button onClick={onClose}>Close</Button></div>
      </div>
    );
  }

  return (
    <form id="transaction-form" className="form-grid" onSubmit={submit} noValidate>
      <div className="seg" role="group" aria-label="Transaction type">
        <Button className="btn--expense" aria-pressed={kind === 'expense'} icon="arrowUp" onClick={() => changeKind('expense')}>Expense</Button>
        <Button className="btn--income" aria-pressed={kind === 'income'} icon="arrowDown" onClick={() => changeKind('income')}>Income</Button>
      </div>
      <div className="form-grid form-grid--2">
        <Field label="Amount" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </div>
      <div className="form-grid form-grid--2">
        <Field as="select" label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)} error={errors.accountId}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Field>
        <Field as="select" label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">No category</option>
          {kindCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Field>
      </div>
      <Field label="Description" maxLength={120} placeholder="What was this for?" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="modal__foot">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{editing ? 'Save changes' : 'Add transaction'}</Button>
      </div>
    </form>
  );
}

export default function TransactionForm({ open, transaction, accounts, categories, onClose, onSaved }) {
  return (
    <Modal open={open} title={transaction ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      <Body transaction={transaction} accounts={accounts} categories={categories} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}