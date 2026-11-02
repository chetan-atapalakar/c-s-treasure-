import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import Button from './Button.jsx';
import { useToast } from './Toast.jsx';
import { createGoal, updateGoal } from '../services/goals.js';
import { parseAmount } from '../utils/finance.js';
import { toISODate } from '../utils/format.js';

function Body({ goal, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(goal);
  const [name, setName] = useState(goal?.name || '');
  const [target, setTarget] = useState(editing ? String(goal.target_amount) : '');
  const [date, setDate] = useState(goal?.target_date || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const value = parseAmount(target);
    const trimmed = name.trim();
    if (!trimmed) errs.name = 'Give your goal a name.';
    else if (trimmed.length > 80) errs.name = 'Keep the name under 80 characters.';
    if (Number.isNaN(value)) errs.target = 'Enter a target above 0 with up to 2 decimals.';
    if (date && !editing && date < toISODate()) errs.date = 'Choose a date that is today or later.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = { name: trimmed, target_amount: value, target_date: date || null };
      if (editing) await updateGoal(goal.id, payload);
      else await createGoal(payload);
      toast.success(editing ? 'Goal updated.' : 'Goal created.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <Field label="Goal name" maxLength={80} placeholder="e.g. Emergency fund" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <div className="form-grid form-grid--2">
        <Field label="Target amount" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={target} onChange={(e) => setTarget(e.target.value)} error={errors.target} />
        <Field label="Target date (optional)" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </div>
      <div className="modal__foot">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{editing ? 'Save changes' : 'Create goal'}</Button>
      </div>
    </form>
  );
}

export default function GoalForm({ open, goal, onClose, onSaved }) {
  return (
    <Modal open={open} title={goal ? 'Edit goal' : 'New savings goal'} onClose={onClose}>
      <Body goal={goal} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}