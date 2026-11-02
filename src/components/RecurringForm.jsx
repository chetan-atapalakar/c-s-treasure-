import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { useToast } from './Toast.jsx';
import { createRecurring, updateRecurring } from '../services/recurring.js';
import { parseAmount } from '../utils/finance.js';
import { toISODate } from '../utils/format.js';

function Body({ item, accounts, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(item);
  const [kind, setKind] = useState(item?.kind || 'expense');
  const [amount, setAmount] = useState(editing ? String(item.amount) : '');
  const [description, setDescription] = useState(item?.description || '');
  const [accountId, setAccountId] = useState(item?.account_id || accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(item?.category_id || '');
  const [frequency, setFrequency] = useState(item?.frequency || 'monthly');
  const [nextDue, setNextDue] = useState(item?.next_due || toISODate());
  const [isSub, setIsSub] = useState(Boolean(item?.is_subscription));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (accounts.length === 0) {
    return (
      <div className="stack">
        <p className="muted">Create an account before adding recurring transactions.</p>
        <div className="modal__foot"><Button onClick={onClose}>Close</Button></div>
      </div>
    );
  }

  const kindCategories = categories.filter((c) => c.kind === kind);

  function changeKind(next) {
    setKind(next);
    setCategoryId('');
    if (next === 'income') setIsSub(false);
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const value = parseAmount(amount);
    if (Number.isNaN(value)) errs.amount = 'Enter an amount above 0 with up to 2 decimals.';
    if (!accountId) errs.accountId = 'Choose an account.';
    if (!nextDue) errs.nextDue = 'Choose the next due date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        kind,
        amount: value,
        description: description.trim(),
        account_id: accountId,
        category_id: categoryId || null,
        frequency,
        next_due: nextDue,
        is_subscription: kind === 'expense' && isSub,
      };
      if (editing) await updateRecurring(item.id, payload);
      else await createRecurring(payload);
      toast.success(editing ? 'Recurring item updated.' : 'Recurring item created.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <div className="seg" role="group" aria-label="Type">
        <Button className="btn--expense" aria-pressed={kind === 'expense'} icon="arrowUp" onClick={() => changeKind('expense')}>Expense</Button>
        <Button className="btn--income" aria-pressed={kind === 'income'} icon="arrowDown" onClick={() => changeKind('income')}>Income</Button>
      </div>
      <Field label="Name" maxLength={120} placeholder="e.g. Rent, Netflix, Salary" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="form-grid form-grid--2">
        <Field label="Amount" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <Field as="select" label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </Field>
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
      <Field label="Next due date" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} error={errors.nextDue} hint="Items due today or earlier are posted automatically, once per date." />
      {kind === 'expense' && (
        <label className="check">
          <input type="checkbox" checked={isSub} onChange={(e) => setIsSub(e.target.checked)} />
          <span className="check__box"><Icon name="check" size={14} stroke={3} /></span>
          This is a subscription
        </label>
      )}
      <div className="modal__foot">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{editing ? 'Save changes' : 'Create'}</Button>
      </div>
    </form>
  );
}

export default function RecurringForm({ open, item, accounts, categories, onClose, onSaved }) {
  return (
    <Modal open={open} title={item ? 'Edit recurring item' : 'New recurring item'} onClose={onClose}>
      <Body item={item} accounts={accounts} categories={categories} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}