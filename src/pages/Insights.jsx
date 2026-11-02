import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import useRefData from '../hooks/useRefData.js';
import useMoney from '../hooks/useMoney.js';
import { listAllTxRows } from '../services/analytics.js';
import { listBudgets } from '../services/budgets.js';
import { listGoals } from '../services/goals.js';
import { listRecurring } from '../services/recurring.js';
import { round2, sumByKind } from '../utils/finance.js';
import { addMonths, monthKeyOf, monthLabel } from '../utils/dates.js';
import { monthStart, toISODate } from '../utils/format.js';
import { monthlySeries, monthsBetween, netWorthSeries, savingsRate } from '../utils/analytics.js';
import { buildInsights } from '../utils/insights.js';
import '../styles/pages.css';
import '../styles/planning.css';
import '../styles/dashboard.css';

const TONE = {
  alert: { accent: 'red', color: 'var(--red)', icon: 'alert' },
  warn: { accent: 'orange', color: 'var(--orange)', icon: 'alert' },
  good: { accent: 'green', color: 'var(--green)', icon: 'check' },
  info: { accent: 'purple', color: 'var(--purple)', icon: 'bulb' },
};

function Delta({ cur, prev, upIsGood }) {
  if (!(prev > 0)) return <span className="delta delta--flat">No data last month</span>;
  const ch = ((cur - prev) / prev) * 100;
  if (Math.abs(ch) < 0.5) return <span className="delta delta--flat">Same as last month</span>;
  const good = upIsGood ? ch > 0 : ch < 0;
  return (
    <span className={`delta ${good ? 'delta--good' : 'delta--bad'}`}>
      {ch > 0 ? '▲' : '▼'} {Math.abs(Math.round(ch))}% vs last month
    </span>
  );
}

export default function Insights() {
  const { fmt } = useMoney();
  const { accounts, categories, loading: refLoading, error: refError, reload: reloadRef } = useRefData();
  const thisMonth = monthStart();
  const today = toISODate();

  const [month, setMonth] = useState(thisMonth);
  const [base, setBase] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([listAllTxRows(), listGoals(), listRecurring()])
      .then(([rows, goals, recurring]) => {
        if (active) {
          setBase({ rows, goals, recurring });
          setError('');
        }
      })
      .catch((err) => active && setError(err.message || 'Could not load your data.'));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setBudgets(null);
    listBudgets(month)
      .then((b) => active && setBudgets(b))
      .catch((err) => active && setError(err.message || 'Could not load budgets.'));
    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  const ready = Boolean(base && budgets && !refLoading);

  const computed = useMemo(() => {
    if (!ready) return null;
    const { rows, goals, recurring } = base;
    const curRows = rows.filter((r) => monthKeyOf(r.occurred_on) === month);
    const prevRows = rows.filter((r) => monthKeyOf(r.occurred_on) === addMonths(month, -1));
    const cur = sumByKind(curRows);
    const prev = sumByKind(prevRows);

    const insights = buildInsights({ month, rows, categories, budgets, goals, recurring, fmt, today });

    // 6-month progress report (ending at the selected month)
    const months = monthsBetween(addMonths(month, -5), month);
    const series = monthlySeries(rows, months);
    const openingTotal = accounts.reduce((s, a) => s + (Number(a.opening_balance) || 0), 0);
    const worth = netWorthSeries(rows, monthsBetween(addMonths(month, -6), month), openingTotal, today);
    const n = series.length;
    const report = {
      worthChange: round2(worth[worth.length - 1].value - worth[0].value),
      netTotal: round2(series.reduce((s, m) => s + m.net, 0)),
      avgIncome: round2(series.reduce((s, m) => s + m.income, 0) / n),
      avgExpense: round2(series.reduce((s, m) => s + m.expense, 0) / n),
    };
    return { cur, prev, insights, report };
  }, [ready, base, budgets, month, categories, accounts, fmt, today]);

  const fatal = error || refError;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Insights</h1>
        <div className="page-head__actions">
          <MonthPicker month={month} onChange={setMonth} maxMonth={thisMonth} />
        </div>
      </div>

      {fatal && (
        <Card className="empty">
          <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <p>{fatal}</p>
          <Button onClick={() => { setError(''); setBase(null); setReloadKey((k) => k + 1); reloadRef(); }}>Try again</Button>
        </Card>
      )}

      {!fatal && !computed && (
        <div className="stack" aria-busy="true">
          <div className="grid-cards">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}</div>
          <div className="skeleton" style={{ height: 160 }} />
        </div>
      )}

      {!fatal && computed && (
        <div className="stack">
          <section>
            <h2 className="section-title" style={{ marginTop: 0 }}>Monthly summary · {monthLabel(month)}</h2>
            <div className="grid-cards anim-stagger">
              <Card accent="green" className="stat">
                <span className="stat__label">INCOME</span>
                <span className="stat__value num num--income">{fmt(computed.cur.income)}</span>
                <Delta cur={computed.cur.income} prev={computed.prev.income} upIsGood />
              </Card>
              <Card accent="red" className="stat">
                <span className="stat__label">EXPENSES</span>
                <span className="stat__value num num--expense">{fmt(computed.cur.expense)}</span>
                <Delta cur={computed.cur.expense} prev={computed.prev.expense} upIsGood={false} />
              </Card>
              <Card accent={computed.cur.net < 0 ? 'red' : 'orange'} className="stat">
                <span className="stat__label">NET</span>
                <span className={`stat__value num ${computed.cur.net < 0 ? 'num--expense' : ''}`}>{fmt(computed.cur.net)}</span>
              </Card>
              <Card accent="purple" className="stat">
                <span className="stat__label">SAVINGS RATE</span>
                <span className="stat__value num num--insight">
                  {savingsRate(computed.cur.income, computed.cur.expense) === null ? '—' : `${savingsRate(computed.cur.income, computed.cur.expense)}%`}
                </span>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="section-title">Observations</h2>
            <div className="insight-grid anim-stagger">
              {computed.insights.map((i) => {
                const t = TONE[i.tone];
                return (
                  <Card key={i.id} accent={t.accent} className="insight">
                    <span className="type-icon" style={{ '--c': t.color }}><Icon name={t.icon} /></span>
                    <div>
                      <h3>{i.title}</h3>
                      <p className="muted">{i.body}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="section-title">Progress report · last 6 months to {monthLabel(month)}</h2>
            <div className="grid-cards anim-stagger">
              <Card accent="purple" className="stat">
                <span className="stat__label">NET WORTH CHANGE</span>
                <span className={`stat__value num ${computed.report.worthChange < 0 ? 'num--expense' : 'num--insight'}`}>{fmt(computed.report.worthChange)}</span>
                <span className="stat__hint">Since the end of {monthLabel(addMonths(month, -6))}</span>
              </Card>
              <Card accent="green" className="stat">
                <span className="stat__label">NET SAVED</span>
                <span className={`stat__value num ${computed.report.netTotal < 0 ? 'num--expense' : 'num--income'}`}>{fmt(computed.report.netTotal)}</span>
                <span className="stat__hint">Income minus expenses</span>
              </Card>
              <Card className="stat">
                <span className="stat__label">AVG MONTHLY INCOME</span>
                <span className="stat__value num num--income">{fmt(computed.report.avgIncome)}</span>
              </Card>
              <Card className="stat">
                <span className="stat__label">AVG MONTHLY EXPENSES</span>
                <span className="stat__value num num--expense">{fmt(computed.report.avgExpense)}</span>
              </Card>
            </div>
          </section>

          <p className="disclaimer">
            These observations describe the data you have recorded. They are not predictions or financial advice.
          </p>
        </div>
      )}
    </div>
  );
}