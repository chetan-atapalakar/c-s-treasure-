import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import BudgetForm from '../components/BudgetForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useRefData from '../hooks/useRefData.js';
import useMoney from '../hooks/useMoney.js';
import { copyBudgets, deleteBudget, listBudgets, listBudgetsBetween, listExpenseRows } from '../services/budgets.js';
import { ensureNotification } from '../services/notifications.js';
import { round2 } from '../utils/finance.js';
import { addMonths, monthLabel } from '../utils/dates.js';
import { monthStart } from '../utils/format.js';
import { STATE_COLOR, budgetStatus, groupSpend } from '../utils/planning.js';
import '../styles/pages.css';
import '../styles/planning.css';

const STATE_TEXT = { ok: 'On track', warn: 'Nearing limit', over: 'Over budget' };

export default function Budgets() {
  const toast = useToast();
  const { profile } = useAuth();
  const { fmt } = useMoney();
  const { categories, loading: refLoading, error: refError, reload: reloadRef } = useRefData();

  const thisMonth = monthStart();
  const [month, setMonth] = useState(thisMonth);
  const [budgets, setBudgets] = useState([]);
  const [histBudgets, setHistBudgets] = useState([]);
  const [spendByMonth, setSpendByMonth] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const histFrom = addMonths(month, -5);
        const [cur, hist, rows] = await Promise.all([
          listBudgets(month),
          listBudgetsBetween(histFrom, month),
          listExpenseRows(histFrom, addMonths(month, 1)),
        ]);
        if (!active) return;
        setBudgets(cur);
        setHistBudgets(hist);
        setSpendByMonth(groupSpend(rows));
      } catch (err) {
        if (active) setError(err.message || 'Could not load budgets.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const rows = useMemo(() => {
    const spend = spendByMonth.get(month) || new Map();
    return budgets
      .map((b) => {
        const spent = spend.get(b.category_id) || 0;
        return { budget: b, cat: catMap.get(b.category_id), spent, status: budgetStatus(spent, b.limit_amount) };
      })
      .sort((a, b) => b.status.pct - a.status.pct);
  }, [budgets, spendByMonth, month, catMap]);

  const totals = useMemo(() => {
    const budgeted = round2(rows.reduce((s, r) => s + Number(r.budget.limit_amount), 0));
    const spent = round2(rows.reduce((s, r) => s + r.spent, 0));
    return { budgeted, spent, remaining: round2(budgeted - spent) };
  }, [rows]);

  const overRows = rows.filter((r) => r.status.state === 'over');

  // One notification per over-budget category per month (only for the current month).
  useEffect(() => {
    if (month !== thisMonth || !profile?.notify_budget) return;
    for (const r of overRows) {
      if (!r.cat) continue;
      ensureNotification({
        title: `Over budget: ${r.cat.name} (${monthLabel(month)})`,
        body: `You’ve spent ${fmt(r.spent)} of your ${fmt(r.budget.limit_amount)} limit.`,
        kind: 'budget',
      });
    }
  }, [overRows, month, thisMonth, profile?.notify_budget, fmt]);

  const history = useMemo(() => {
    const out = [];
    for (let i = 1; i <= 5; i += 1) {
      const m = addMonths(month, -i);
      const bs = histBudgets.filter((b) => b.month === m);
      if (bs.length === 0) continue;
      const sp = spendByMonth.get(m) || new Map();
      let budgeted = 0;
      let spent = 0;
      let over = 0;
      for (const b of bs) {
        const s = sp.get(b.category_id) || 0;
        budgeted += Number(b.limit_amount);
        spent += s;
        if (s > Number(b.limit_amount)) over += 1;
      }
      out.push({ month: m, budgeted: round2(budgeted), spent: round2(spent), over });
    }
    return out;
  }, [histBudgets, spendByMonth, month]);

  const prevMonth = addMonths(month, -1);
  const prevHasBudgets = histBudgets.some((b) => b.month === prevMonth);
  const takenIds = useMemo(() => new Set(budgets.map((b) => b.category_id)), [budgets]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  async function onCopy() {
    setCopying(true);
    try {
      const n = await copyBudgets(prevMonth, month);
      toast.success(n > 0 ? `${n} budget${n > 1 ? 's' : ''} copied from ${monthLabel(prevMonth)}.` : 'Nothing new to copy.');
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCopying(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteBudget(deleting.id);
      toast.success('Budget deleted.');
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const fatal = error || refError;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Budgets</h1>
        <div className="page-head__actions">
          <MonthPicker month={month} onChange={setMonth} maxMonth={addMonths(thisMonth, 12)} />
          <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setFormOpen(true); }}>New budget</Button>
        </div>
      </div>

      {fatal && (
        <Card className="empty">
          <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <p>{fatal}</p>
          <Button onClick={() => { refresh(); reloadRef(); }}>Try again</Button>
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
            <Card accent="orange" className="stat">
              <span className="stat__label">BUDGETED</span>
              <span className="stat__value num">{fmt(totals.budgeted)}</span>
            </Card>
            <Card accent="red" className="stat">
              <span className="stat__label">SPENT</span>
              <span className="stat__value num num--expense">{fmt(totals.spent)}</span>
            </Card>
            <Card accent={totals.remaining < 0 ? 'red' : 'green'} className="stat">
              <span className="stat__label">{totals.remaining < 0 ? 'OVER BY' : 'REMAINING'}</span>
              <span className={`stat__value num ${totals.remaining < 0 ? 'num--expense' : 'num--income'}`}>{fmt(Math.abs(totals.remaining))}</span>
            </Card>
          </div>

          {overRows.length > 0 && (
            <div className="alert-banner" role="alert">
              <Icon name="alert" size={22} />
              <div>
                <strong>{overRows.length === 1 ? '1 category is over budget' : `${overRows.length} categories are over budget`}</strong>
                <ul>
                  {overRows.map((r) => (
                    <li key={r.budget.id}>{r.cat?.name || 'Category'}: {fmt(r.spent)} spent of {fmt(r.budget.limit_amount)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <Card className="empty">
              <span className="empty__icon"><Icon name="target" size={30} /></span>
              <h2>No budgets for {monthLabel(month)}</h2>
              <p>Set a spending limit for a category to track it here.</p>
              <div className="row row--wrap" style={{ justifyContent: 'center' }}>
                <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setFormOpen(true); }}>New budget</Button>
                {prevHasBudgets && <Button loading={copying} onClick={onCopy}>Copy from {monthLabel(prevMonth)}</Button>}
              </div>
            </Card>
          ) : (
            <>
              <div className="grid-2 anim-stagger">
                {rows.map(({ budget, cat, spent, status }) => (
                  <Card key={budget.id} interactive className="plan-card" accent={status.state === 'over' ? 'red' : undefined}>
                    <div className="plan-card__top">
                      <span className="type-icon" style={{ '--c': cat?.color || 'var(--orange)' }}><Icon name={cat?.icon && cat.icon !== 'trending' ? cat.icon : 'tag'} /></span>
                      <div className="grow">
                        <div className="plan-card__title">{cat?.name || 'Category'}</div>
                        <div className="plan-card__sub" style={{ color: STATE_COLOR[status.state] }}>{STATE_TEXT[status.state]} · {Math.round(status.pct)}% used</div>
                      </div>
                    </div>
                    <ProgressBar value={status.pct} color={STATE_COLOR[status.state]} label={`${cat?.name || 'Category'} budget used`} />
                    <div className="plan-card__nums">
                      <span><span className="muted">Spent </span><strong className="num">{fmt(spent)}</strong></span>
                      <span><span className="muted">Limit </span><strong className="num">{fmt(budget.limit_amount)}</strong></span>
                      <span className={status.remaining < 0 ? 'num--expense' : ''}>
                        <span className="muted">{status.remaining < 0 ? 'Over by ' : 'Left '}</span>
                        <strong className="num">{fmt(Math.abs(status.remaining))}</strong>
                      </span>
                    </div>
                    <div className="plan-card__actions">
                      <Button size="sm" icon="edit" onClick={() => { setEditing(budget); setFormOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" iconOnly icon="trash" aria-label={`Delete ${cat?.name || ''} budget`} onClick={() => setDeleting(budget)} />
                    </div>
                  </Card>
                ))}
              </div>
              {prevHasBudgets && (
                <div>
                  <Button size="sm" loading={copying} onClick={onCopy}>Add missing budgets from {monthLabel(prevMonth)}</Button>
                </div>
              )}
            </>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="section-title">Budget history</h2>
              <Card className="history-table">
                <div className="history-row history-row--head" aria-hidden="true">
                  <span>MONTH</span><span>BUDGETED</span><span>SPENT</span><span>OVER</span>
                </div>
                {history.map((h) => (
                  <div className="history-row" key={h.month}>
                    <strong>{monthLabel(h.month)}</strong>
                    <span className="num">{fmt(h.budgeted)}</span>
                    <span className={`num ${h.spent > h.budgeted ? 'num--expense' : ''}`}>{fmt(h.spent)}</span>
                    <span className="badge" style={{ '--c': h.over ? 'var(--red)' : 'var(--green)' }}>{h.over ? `${h.over} over` : 'All on track'}</span>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        budget={editing}
        month={month}
        categories={categories}
        takenIds={takenIds}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); refresh(); }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete budget?"
        message="Your transactions are not affected. Only this month’s limit for the category is removed."
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}