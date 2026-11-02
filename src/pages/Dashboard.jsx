import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import { IncomeExpenseChart } from '../components/Charts.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import TransferForm from '../components/TransferForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useRefData from '../hooks/useRefData.js';
import useMoney from '../hooks/useMoney.js';
import { listBudgets } from '../services/budgets.js';
import { listGoals } from '../services/goals.js';
import { listRecentNotifications, listRecentTransactions, listTxRowsBetween } from '../services/analytics.js';
import { round2, summarizeAccounts } from '../utils/finance.js';
import { addMonths, monthLabel } from '../utils/dates.js';
import { formatDate, monthStart } from '../utils/format.js';
import { monthlySeries, monthsBetween } from '../utils/analytics.js';
import { STATE_COLOR, budgetStatus, goalMetrics, groupSpend } from '../utils/planning.js';
import '../styles/pages.css';
import '../styles/planning.css';
import '../styles/dashboard.css';

const LIQUID = ['cash', 'bank', 'wallet'];
const pctText = (n) => `${n.toFixed(1)}%`;

export default function Dashboard() {
  const { profile } = useAuth();
  const { fmt } = useMoney();
  const { accounts, categories, loading: refLoading, error: refError, reload: reloadRef } = useRefData();

  const thisMonth = monthStart();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [txOpen, setTxOpen] = useState(false);
  const [trOpen, setTrOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [rows, budgets, goals, recent, notifs] = await Promise.all([
          listTxRowsBetween(addMonths(thisMonth, -5), addMonths(thisMonth, 1)),
          listBudgets(thisMonth),
          listGoals(),
          listRecentTransactions(6),
          listRecentNotifications(4),
        ]);
        if (active) {
          setData({ rows, budgets, goals, recent, notifs });
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not load your dashboard.');
      }
    })();
    return () => {
      active = false;
    };
  }, [thisMonth, reloadKey]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const summary = useMemo(() => summarizeAccounts(accounts), [accounts]);
  const available = useMemo(
    () => round2(accounts.filter((a) => LIQUID.includes(a.type)).reduce((s, a) => s + (Number(a.balance) || 0), 0)),
    [accounts]
  );

  const series = useMemo(() => (data ? monthlySeries(data.rows, monthsBetween(addMonths(thisMonth, -5), thisMonth)) : []), [data, thisMonth]);
  const current = series[series.length - 1];

  const budgetRows = useMemo(() => {
    if (!data) return [];
    const spend = groupSpend(data.rows.filter((r) => r.kind === 'expense')).get(thisMonth) || new Map();
    return data.budgets
      .map((b) => {
        const spent = spend.get(b.category_id) || 0;
        return { b, cat: catMap.get(b.category_id), spent, status: budgetStatus(spent, b.limit_amount) };
      })
      .sort((a, b) => b.status.pct - a.status.pct);
  }, [data, catMap, thisMonth]);

  const budgetTotals = useMemo(() => {
    const limit = round2(budgetRows.reduce((s, r) => s + Number(r.b.limit_amount), 0));
    const spent = round2(budgetRows.reduce((s, r) => s + r.spent, 0));
    return { limit, spent, status: budgetStatus(spent, limit) };
  }, [budgetRows]);

  const activeGoals = useMemo(() => (data ? data.goals.filter((g) => !g.completed).slice(0, 3) : []), [data]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (profile?.full_name || '').trim().split(' ')[0];

  const fatal = error || refError;
  const loading = !fatal && (!data || refLoading);

  function refresh() {
    setReloadKey((k) => k + 1);
    reloadRef();
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="greeting">
          <h1 className="page__title">{greet}{first ? `, ${first}` : ''}</h1>
          <p className="muted">Here’s your financial picture for {monthLabel(thisMonth)}.</p>
        </div>
        <div className="quick-actions">
          <Button variant="primary" icon="plus" onClick={() => setTxOpen(true)}>Add transaction</Button>
          <Button icon="swap" onClick={() => setTrOpen(true)}>Transfer</Button>
          <Link className="btn" to="/budgets"><Icon name="target" size={20} />Budgets</Link>
          <Link className="btn" to="/goals"><Icon name="piggy" size={20} />Goals</Link>
        </div>
      </div>

      {fatal && (
        <Card className="empty">
          <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <p>{fatal}</p>
          <Button onClick={() => { setData(null); setError(''); refresh(); }}>Try again</Button>
        </Card>
      )}

      {loading && (
        <div className="stack" aria-busy="true">
          <div className="grid-cards">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}</div>
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      )}

      {!fatal && !loading && (
        <div className="stack">
          <div className="grid-cards anim-stagger">
            <Card accent="purple" glow className="stat">
              <span className="stat__label">NET WORTH</span>
              <AnimatedNumber className="stat__value num num--insight" value={summary.netWorth} />
              <span className="stat__hint">Assets minus liabilities</span>
            </Card>
            <Card accent="green" className="stat">
              <span className="stat__label">TOTAL ASSETS</span>
              <AnimatedNumber className="stat__value num num--income" value={summary.assets} />
            </Card>
            <Card accent="red" className="stat">
              <span className="stat__label">TOTAL LIABILITIES</span>
              <AnimatedNumber className="stat__value num num--expense" value={summary.liabilities} />
            </Card>
            <Card accent="orange" className="stat">
              <span className="stat__label">AVAILABLE BALANCE</span>
              <AnimatedNumber className="stat__value num" value={available} />
              <span className="stat__hint">Cash, bank and wallet accounts</span>
            </Card>
          </div>

          <div className="grid-cards anim-stagger">
            <Card accent="green" className="stat">
              <span className="stat__label">INCOME · {monthLabel(thisMonth).toUpperCase()}</span>
              <AnimatedNumber className="stat__value num num--income" value={current.income} />
            </Card>
            <Card accent="red" className="stat">
              <span className="stat__label">EXPENSES · {monthLabel(thisMonth).toUpperCase()}</span>
              <AnimatedNumber className="stat__value num num--expense" value={current.expense} />
            </Card>
            <Card accent="purple" className="stat">
              <span className="stat__label">SAVINGS RATE</span>
              {current.savingsRate === null ? (
                <span className="stat__value num">—</span>
              ) : (
                <AnimatedNumber className="stat__value num num--insight" value={current.savingsRate} format={pctText} />
              )}
              <span className="stat__hint">{current.savingsRate === null ? 'No income recorded this month' : 'Share of income kept this month'}</span>
            </Card>
          </div>

          <Card>
            <div className="card-head">
              <h2>Financial overview</h2>
              <Link to="/analytics">Full analytics</Link>
            </div>
            <IncomeExpenseChart data={series} />
          </Card>

          <div className="grid-2">
            <Card>
              <div className="card-head">
                <h2>Budget utilisation</h2>
                <Link to="/budgets">Manage</Link>
              </div>
              {budgetRows.length === 0 ? (
                <div className="empty" style={{ padding: '18px 8px' }}>
                  <p>No budgets set for {monthLabel(thisMonth)}.</p>
                  <Link className="btn btn--sm" to="/budgets">Set a budget</Link>
                </div>
              ) : (
                <div className="mini-list">
                  <div className="mini-row">
                    <div className="mini-row__top">
                      <span>Overall</span>
                      <span className="num">{fmt(budgetTotals.spent)} of {fmt(budgetTotals.limit)}</span>
                    </div>
                    <ProgressBar value={budgetTotals.status.pct} color={STATE_COLOR[budgetTotals.status.state]} label="Overall budget used" />
                  </div>
                  {budgetRows.slice(0, 4).map(({ b, cat, spent, status }) => (
                    <div className="mini-row" key={b.id}>
                      <div className="mini-row__top">
                        <span>{cat?.name || 'Category'}</span>
                        <span className="num" style={{ color: STATE_COLOR[status.state] }}>{Math.round(status.pct)}%</span>
                      </div>
                      <ProgressBar value={status.pct} color={STATE_COLOR[status.state]} label={`${cat?.name || 'Category'} budget used`} />
                      <span className="stat__hint">{fmt(spent)} of {fmt(b.limit_amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="card-head">
                <h2>Savings progress</h2>
                <Link to="/goals">All goals</Link>
              </div>
              {activeGoals.length === 0 ? (
                <div className="empty" style={{ padding: '18px 8px' }}>
                  <p>{data.goals.length > 0 ? 'All your goals are complete.' : 'No savings goals yet.'}</p>
                  <Link className="btn btn--sm" to="/goals">{data.goals.length > 0 ? 'View goals' : 'Create a goal'}</Link>
                </div>
              ) : (
                <div className="mini-list">
                  {activeGoals.map((g) => {
                    const m = goalMetrics(g);
                    return (
                      <div className="mini-row" key={g.id}>
                        <div className="mini-row__top">
                          <span>{g.name}</span>
                          <span className="num num--income">{Math.round(m.pct)}%</span>
                        </div>
                        <ProgressBar value={m.pct} color="var(--green)" label={`${g.name} progress`} />
                        <span className="stat__hint">{fmt(g.saved)} of {fmt(g.target_amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="grid-2">
            <Card>
              <div className="card-head">
                <h2>Recent transactions</h2>
                <Link to="/transactions">View all</Link>
              </div>
              {data.recent.length === 0 ? (
                <div className="empty" style={{ padding: '18px 8px' }}>
                  <p>No transactions yet.</p>
                  <Button size="sm" variant="primary" icon="plus" onClick={() => setTxOpen(true)}>Add transaction</Button>
                </div>
              ) : (
                <ul className="tx-list">
                  {data.recent.map((tx) => {
                    const cat = catMap.get(tx.category_id);
                    const acc = accMap.get(tx.account_id);
                    const income = tx.kind === 'income';
                    return (
                      <li key={tx.id} className="tx-row tx-row--static">
                        <span className="tx-dot" style={{ '--c': cat?.color || 'var(--text-2)' }} />
                        <span className="tx-main">
                          <strong>{tx.description || cat?.name || (income ? 'Income' : 'Expense')}</strong>
                          <span>{[acc?.name, formatDate(tx.occurred_on)].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className={`tx-amount ${income ? 'tx-amount--income' : 'tx-amount--expense'}`}>{income ? '+' : '−'}{fmt(tx.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <div className="card-head"><h2>Notifications</h2></div>
              {data.notifs.length === 0 ? (
                <div className="empty" style={{ padding: '18px 8px' }}>
                  <span className="empty__icon"><Icon name="bell" size={26} /></span>
                  <p>You’re all caught up.</p>
                </div>
              ) : (
                <div className="notif-list">
                  {data.notifs.map((n) => (
                    <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
                      <strong>{n.title}</strong>
                      {n.body && <span>{n.body}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <TransactionForm
        open={txOpen}
        accounts={accounts}
        categories={categories}
        onClose={() => setTxOpen(false)}
        onSaved={() => { setTxOpen(false); refresh(); }}
      />
      <TransferForm
        open={trOpen}
        accounts={accounts}
        onClose={() => setTrOpen(false)}
        onSaved={() => { setTrOpen(false); refresh(); }}
      />
    </div>
  );
}