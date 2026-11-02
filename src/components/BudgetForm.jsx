import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import Button from './Button.jsx';
import { useToast } from './Toast.jsx';
import { createBudget, updateBudget } from '../services/budgets.js';
import { parseAmount } from '../utils/finance.js';
import { monthLabel } from '../utils/dates.js';

function Body({ budget, month, categories, takenIds, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(budget);
  const available = categories.filter((c) => c.kind === 'expense' && (editing ? c.id === budget.category_id : !takenIds.has(c.id)));
  const [categoryId, setCategoryId] = useState(budget?.category_id || available[0]?.id || '');
  const [limit, setLimit] = useState(editing ? String(budget.limit_amount) : '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!editing && available.length === 0) {
    return (
      <div className="stack">
        <p className="muted">Every expense category already has a budget for {monthLabel(month)}.</p>
        <div className="modal__foot"><Button onClick={onClose}>Close</Button></div>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const value = parseAmount(limit);
    if (!categoryId) errs.categoryId = 'Choose a category.';
    if (Number.isNaN(value)) errs.limit = 'Enter a limit above 0 with up to 2 decimals.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (editing) await updateBudget(budget.id, { limit_amount: value });
      else await createBudget({ category_id: categoryId, month, limit_amount: value });
      toast.success(editing ? 'Budget updated.' : 'Budget created.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <Field as="select" label="Category" value={categoryId} disabled={editing} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId}>
        {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Field>
      <Field label={`Spending limit for ${monthLabel(month)}`} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={limit} onChange={(e) => setLimit(e.target.value)} error={errors.limit} />
      <div className="modal__foot">
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{editing ? 'Save changes' : 'Create budget'}</Button>
      </div>
    </form>
  );
}

export default function BudgetForm({ open, budget, month, categories, takenIds, onClose, onSaved }) {
  return (
    <Modal open={open} title={budget ? 'Edit budget' : 'New budget'} onClose={onClose}>
      <Body budget={budget} month={month} categories={categories} takenIds={takenIds} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}