import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import Button from './Button.jsx';
import { useToast } from './Toast.jsx';
import { createTransfer } from '../services/transfers.js';
import { parseAmount } from '../utils/finance.js';
import { toISODate } from '../utils/format.js';

function Body({ accounts, defaultFrom, onClose, onSaved }) {
  const toast = useToast();
  const initialFrom = defaultFrom || accounts[0]?.id || '';
  const initialTo = accounts.find((a) => a.id !== initialFrom)?.id || '';
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (accounts.length < 2) {
    return (
      <div className="stack">
        <p className="muted">You need at least two accounts to make a transfer. Create another account first.</p>
        <div className="modal__foot"><Button onClick={onClose}>Close</Button></div>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const value = parseAmount(amount);
    if (!from) errs.from = 'Choose an account.';
    if (!to) errs.to = 'Choose an account.';
    else if (to === from) errs.to = 'Choose a different account.';
    if (Number.isNaN(value)) errs.amount = 'Enter an amount above 0 with up to 2 decimals.';
    if (!date) errs.date = 'Choose a date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await createTransfer({ from_account_id: from, to_account_id: to, amount: value, note: note.trim(), occurred_on: date });
      toast.success('Transfer completed.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  return (
    <form id="transfer-form" className="form-grid" onSubmit={submit} noValidate>
      <div className="form-grid form-grid--2">
        <Field as="select" label="From" value={from} onChange={(e) => setFrom(e.target.value)} error={errors.from}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Field>
        <Field as="select" label="To" value={to} onChange={(e) => setTo(e.target.value)} error={errors.to}>
          <option value="">Select account</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Field>
      </div>
      <div className="form-grid form-grid--2">
        <Field label="Amount" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </div>
      <Field label="Note (optional)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="modal__foot">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>Transfer</Button>
      </div>
    </form>
  );
}

export default function TransferForm({ open, accounts, defaultFrom, onClose, onSaved }) {
  return (
    <Modal open={open} title="Transfer between accounts" onClose={onClose}>
      <Body accounts={accounts} defaultFrom={defaultFrom} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}