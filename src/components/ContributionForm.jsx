import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import Button from './Button.jsx';
import { useToast } from './Toast.jsx';
import useMoney from '../hooks/useMoney.js';
import { addContribution } from '../services/goals.js';
import { parseAmount } from '../utils/finance.js';
import { toISODate } from '../utils/format.js';

function Body({ goal, onClose, onSaved }) {
  const toast = useToast();
  const { fmt } = useMoney();
  const saved = Number(goal.saved) || 0;
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const value = parseAmount(amount);
    if (Number.isNaN(value)) errs.amount = 'Enter an amount above 0 with up to 2 decimals.';
    else if (mode === 'withdraw' && value > saved) errs.amount = `You can withdraw at most ${fmt(saved)}.`;
    if (!date) errs.date = 'Choose a date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const signed = mode === 'withdraw' ? -value : value;
      await addContribution({ goal_id: goal.id, amount: signed, contributed_on: date, note: note.trim() });
      toast.success(mode === 'withdraw' ? 'Withdrawal recorded.' : 'Contribution added.');
      onSaved(signed);
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <div className="seg" role="group" aria-label="Contribution type">
        <Button className="btn--income" aria-pressed={mode === 'add'} icon="arrowDown" onClick={() => setMode('add')}>Add money</Button>
        <Button className="btn--expense" aria-pressed={mode === 'withdraw'} icon="arrowUp" onClick={() => setMode('withdraw')}>Withdraw</Button>
      </div>
      <div className="form-grid form-grid--2">
        <Field label="Amount" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </div>
      <Field label="Note (optional)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} hint="Goal savings are tracked separately and don’t change your account balances." />
      <div className="modal__foot">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{mode === 'withdraw' ? 'Withdraw' : 'Add to goal'}</Button>
      </div>
    </form>
  );
}

export default function ContributionForm({ open, goal, onClose, onSaved }) {
  return (
    <Modal open={open} title={goal ? `Contribute to ${goal.name}` : 'Contribute'} onClose={onClose}>
      {goal && <Body goal={goal} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}