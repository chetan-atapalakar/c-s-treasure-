import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import GoalForm from '../components/GoalForm.jsx';
import ContributionForm from '../components/ContributionForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useMoney from '../hooks/useMoney.js';
import { deleteContribution, deleteGoal, listContributions, listGoals } from '../services/goals.js';
import { ensureNotification } from '../services/notifications.js';
import { round2 } from '../utils/finance.js';
import { formatDate } from '../utils/format.js';
import { goalMetrics } from '../utils/planning.js';
import '../styles/pages.css';
import '../styles/planning.css';

function GoalHistory({ goal, onClose, onChanged }) {
  const toast = useToast();
  const { fmt } = useMoney();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await listContributions(goal.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [goal.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmRemove() {
    try {
      await deleteContribution(removing.id);
      toast.success('Entry deleted.');
      setRemoving(null);
      await load();
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <Modal open title={`${goal.name} history`} onClose={onClose}>
        {loading && <div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 54 }} />)}</div>}
        {!loading && error && <p className="auth-alert" role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">
            <span className="empty__icon"><Icon name="piggy" size={28} /></span>
            <p>No contributions yet.</p>
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="tx-list">
            {items.map((c) => {
              const positive = Number(c.amount) > 0;
              return (
                <li key={c.id} className="tx-row tx-row--static">
                  <span className="tx-dot" style={{ '--c': positive ? 'var(--green)' : 'var(--red)' }} />
                  <span className="tx-main">
                    <strong>{positive ? 'Contribution' : 'Withdrawal'}</strong>
                    <span>{[c.note, formatDate(c.contributed_on)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={`tx-amount ${positive ? 'tx-amount--income' : 'tx-amount--expense'}`}>{positive ? '+' : '−'}{fmt(Math.abs(c.amount))}</span>
                  <Button variant="ghost" size="sm" iconOnly icon="trash" aria-label="Delete entry" onClick={() => setRemoving(c)} />
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete entry?"
        message="The goal’s saved amount will be recalculated."
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

function GoalCard({ goal, fmt, onContribute, onHistory, onEdit, onDelete }) {
  const m = goalMetrics(goal);
  return (
    <Card interactive className="plan-card" accent={m.completed ? 'green' : undefined} glow={m.completed}>
      <div className="plan-card__top">
        <span className="type-icon" style={{ '--c': m.completed ? 'var(--green)' : 'var(--orange)' }}>
          <Icon name={m.completed ? 'check' : 'piggy'} />
        </span>
        <div className="grow">
          <div className="plan-card__title">{goal.name}</div>
          <div className="plan-card__sub">
            {m.completed
              ? 'Goal reached'
              : goal.target_date
                ? m.overdue
                  ? `Target date passed (${formatDate(goal.target_date)})`
                  : `${m.daysLeft} day${m.daysLeft === 1 ? '' : 's'} left · ${formatDate(goal.target_date)}`
                : 'No target date'}
          </div>
        </div>
        <span className="num" style={{ fontWeight: 700, color: m.completed ? 'var(--green)' : 'var(--text)' }}>{Math.round(m.pct)}%</span>
      </div>
      <ProgressBar value={m.pct} color="var(--green)" label={`${goal.name} progress`} />
      <div className="plan-card__nums">
        <span><span className="muted">Saved </span><strong className="num num--income">{fmt(goal.saved)}</strong></span>
        <span><span className="muted">Target </span><strong className="num">{fmt(goal.target_amount)}</strong></span>
        {!m.completed && <span><span className="muted">To go </span><strong className="num">{fmt(m.remaining)}</strong></span>}
      </div>
      {m.monthlyNeeded !== null && (
        <p className="plan-card__sub">About <strong className="num">{fmt(m.monthlyNeeded)}</strong> per month reaches this goal by the target date.</p>
      )}
      <div className="plan-card__actions">
        <Button size="sm" variant="primary" icon="plus" onClick={() => onContribute(goal)}>Contribute</Button>
        <Button size="sm" icon="receipt" onClick={() => onHistory(goal)}>History</Button>
        <Button size="sm" variant="ghost" iconOnly icon="edit" aria-label={`Edit ${goal.name}`} onClick={() => onEdit(goal)} />
        <Button size="sm" variant="ghost" iconOnly icon="trash" aria-label={`Delete ${goal.name}`} onClick={() => onDelete(goal)} />
      </div>
    </Card>
  );
}

export default function SavingsGoals() {
  const toast = useToast();
  const { profile } = useAuth();
  const { fmt } = useMoney();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null);
  const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setGoals(await listGoals());
    } catch (err) {
      setError(err.message || 'Could not load your goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const done = useMemo(() => goals.filter((g) => g.completed), [goals]);
  const totals = useMemo(
    () => ({
      saved: round2(goals.reduce((s, g) => s + (Number(g.saved) || 0), 0)),
      target: round2(goals.reduce((s, g) => s + (Number(g.target_amount) || 0), 0)),
    }),
    [goals]
  );

  async function onContributed(signed) {
    const goal = contributing;
    setContributing(null);
    const before = Number(goal.saved) || 0;
    const after = round2(before + signed);
    const target = Number(goal.target_amount) || 0;
    if (before < target && after >= target) {
      toast.success(`Goal reached: ${goal.name}!`);
      if (profile?.notify_goals) {
        ensureNotification({ title: `Goal reached: ${goal.name}`, body: `You’ve saved ${fmt(after)} of ${fmt(target)}.`, kind: 'goal' });
      }
    }
    load();
  }

  async function confirmDelete() {
    try {
      await deleteGoal(deleting.id);
      toast.success('Goal deleted.');
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

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Savings Goals</h1>
        <div className="page-head__actions">
          <Button variant="primary" icon="plus" onClick={openNew}>New goal</Button>
        </div>
      </div>

      {error && (
        <Card className="empty">
          <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <p>{error}</p>
          <Button onClick={() => { setLoading(true); load(); }}>Try again</Button>
        </Card>
      )}

      {!error && loading && (
        <div className="grid-2" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 190 }} />)}
        </div>
      )}

      {!error && !loading && goals.length === 0 && (
        <Card className="empty">
          <span className="empty__icon"><Icon name="piggy" size={30} /></span>
          <h2>No savings goals yet</h2>
          <p>Create a goal like an emergency fund or a trip and track every contribution.</p>
          <Button variant="primary" icon="plus" onClick={openNew}>New goal</Button>
        </Card>
      )}

      {!error && !loading && goals.length > 0 && (
        <div className="stack">
          <div className="grid-cards anim-stagger">
            <Card accent="green" className="stat">
              <span className="stat__label">TOTAL SAVED</span>
              <span className="stat__value num num--income">{fmt(totals.saved)}</span>
            </Card>
            <Card accent="purple" className="stat">
              <span className="stat__label">TOTAL TARGET</span>
              <span className="stat__value num num--insight">{fmt(totals.target)}</span>
            </Card>
            <Card accent="orange" className="stat">
              <span className="stat__label">COMPLETED</span>
              <span className="stat__value num">{done.length} of {goals.length}</span>
            </Card>
          </div>

          {active.length > 0 && (
            <div className="grid-2 anim-stagger">
              {active.map((g) => (
                <GoalCard key={g.id} goal={g} fmt={fmt} onContribute={setContributing} onHistory={setHistory} onEdit={(x) => { setEditing(x); setFormOpen(true); }} onDelete={setDeleting} />
              ))}
            </div>
          )}

          {done.length > 0 && (
            <section>
              <h2 className="section-title">Completed goals</h2>
              <div className="grid-2">
                {done.map((g) => (
                  <GoalCard key={g.id} goal={g} fmt={fmt} onContribute={setContributing} onHistory={setHistory} onEdit={(x) => { setEditing(x); setFormOpen(true); }} onDelete={setDeleting} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <GoalForm
        open={formOpen}
        goal={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />

      <ContributionForm open={Boolean(contributing)} goal={contributing} onClose={() => setContributing(null)} onSaved={onContributed} />

      {history && <GoalHistory goal={history} onClose={() => setHistory(null)} onChanged={load} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting ? `Delete “${deleting.name}”?` : 'Delete goal?'}
        message="The goal and all its contributions will be permanently deleted. This can’t be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}