import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import Button from './Button.jsx';
import { useToast } from './Toast.jsx';
import { createAccount, updateAccount } from '../services/accounts.js';
import { ACCOUNT_TYPES, fromStoredOpening, isLiability, parseAmountOrZero, toStoredOpening } from '../utils/finance.js';

function Body({ account, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(account);
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'bank');
  const [balance, setBalance] = useState(editing ? String(fromStoredOpening(account.type, account.opening_balance)) : '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const trimmed = name.trim();
    const amount = parseAmountOrZero(balance);
    if (!trimmed) errs.name = 'Enter an account name.';
    else if (trimmed.length > 60) errs.name = 'Keep the name under 60 characters.';
    if (Number.isNaN(amount)) errs.balance = 'Enter 0 or a positive amount with up to 2 decimals.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = { name: trimmed, type, opening_balance: toStoredOpening(type, amount) };
      if (editing) await updateAccount(account.id, payload);
      else await createAccount(payload);
      toast.success(editing ? 'Account updated.' : 'Account created.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  return (
    <form id="account-form" className="form-grid" onSubmit={submit} noValidate>
      <Field label="Account name" maxLength={60} placeholder="e.g. Savings account" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <Field as="select" label="Type" value={type} onChange={(e) => setType(e.target.value)}>
        {ACCOUNT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </Field>
      <Field
        label={isLiability(type) ? 'Amount currently owed' : 'Opening balance'}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        error={errors.balance}
        hint="Entered by you. This is not connected to a bank."
      />
      <div className="modal__foot">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{editing ? 'Save changes' : 'Create account'}</Button>
      </div>
    </form>
  );
}

export default function AccountForm({ open, account, onClose, onSaved }) {
  return (
    <Modal open={open} title={account ? 'Edit account' : 'New account'} onClose={onClose}>
      <Body account={account} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}