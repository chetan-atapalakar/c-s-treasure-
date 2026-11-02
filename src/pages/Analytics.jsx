import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import { CategoryDonut, CHART_COLORS, IncomeExpenseChart, SeriesChart } from '../components/Charts.jsx';
import useRefData from '../hooks/useRefData.js';
import useMoney from '../hooks/useMoney.js';
import { listAllTxRows } from '../services/analytics.js';
import { round2, sumByKind } from '../utils/finance.js';
import { toISODate } from '../utils/format.js';
import {
  PRESETS, categoryBreakdown, filterRows, monthlySeries, monthsBetween, netWorthSeries, rangeFromPreset, savingsRate, shortMonth, yearsIn,
} from '../utils/analytics.js';
import '../styles/pages.css';
import '../styles/planning.css';
import '../styles/dashboard.css';

const MAX_MONTHS = 120;
const pct = (v) => (v === null ? '—' : `${v}%`);

export default function Analytics() {
  const { fmt } = useMoney();
  const { accounts, categories, loading: refLoading, error: refError, reload: reloadRef } = useRefData();
  const today = toISODate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [preset, setPreset] = useState('6m');
  const [range, setRange] = useState(() => rangeFromPreset('6m', today));
  const [year, setYear] = useState(today.slice(0, 4));

  useEffect(() => {
    let active = true;
    listAllTxRows()
      .then((r) => {
        if (active) {
          setRows(r);
          setError('');
        }
      })
      .catch((err) => active && setError(err.message || 'Could not load your data.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function applyPreset(id) {
    setPreset(id);
    setRange(rangeFromPreset(id, today));
  }

  function setCustom(key, value) {
    setPreset('custom');
    setRange((r) => ({ ...r, [key]: value }));
  }

  const validRange = Boolean(range.from && range.to && range.from <= range.to);
  const allMonths = useMemo(() => (validRange ? monthsBetween(range.from, range.to) : []), [validRange, range]);
  const clamped = allMonths.length > MAX_MONTHS;
  const months = useMemo(() => allMonths.slice(-MAX_MONTHS), [allMonths]);

  const inRange = useMemo(() => (validRange ? filterRows(rows, range.from, range.to) : []), [rows, validRange, range]);
  const series = useMemo(() => monthlySeries(inRange, months), [inRange, months]);
  const totals = useMemo(() => sumByKind(inRange), [inRange]);
  const rate = savingsRate(totals.income, totals.expense);
  const breakdown = useMemo(() => categoryBreakdown(inRange, categories), [inRange, categories]);
  const openingTotal = useMemo(() => accounts.reduce((s, a) => s + (Number(a.opening_balance) || 0), 0), [accounts]);
  const worth = useMemo(() => netWorthSeries(rows, months, openingTotal, today), [rows, months, openingTotal, today]);

  // Annual summary
  const yearOptions = useMemo(() => {
    const set = new Set([...yearsIn(rows), today.slice(0, 4)]);
    return [...set].sort().reverse();
  }, [rows, today]);
  const yearMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}-01`), [year]);
  const yearRows = useMemo(() => rows.filter((r) => r.occurred_on.startsWith(year)), [rows, year]);
  const yearSeries = useMemo(() => monthlySeries(yearRows, yearMonths), [yearRows, yearMonths]);
  const yearTotals = useMemo(() => sumByKind(yearRows), [yearRows]);
  const yearTop = useMemo(() => categoryBreakdown(yearRows, categories).slice(0, 3), [yearRows, categories]);

  const fatal = error || refError;
  const busy = !fatal && (loading || refLoading);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Analytics</h1>
      </div>

      <Card className="range-bar">
        <div className="chips" role="group" aria-label="Date range">
          {PRESETS.map((p) => (
            <Button key={p.id} size="sm" aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)}>{p.label}</Button>
          ))}
        </div>
        <div className="range-dates">
          <Field label="From" type="date" value={range.from} max={range.to || undefined} onChange={(e) => setCustom('from', e.target.value)} />
          <Field label="To" type="date" value={range.to} min={range.from || undefined} onChange={(e) => setCustom('to', e.target.value)} />
        </div>
        {!validRange && <p className="field__error" role="alert">Choose a start date that is on or before the end date.</p>}
        {clamped && <p className="muted" style={{ fontSize: '0.82rem' }}>Showing the most recent {MAX_MONTHS} months of this range.</p>}
      </Card>

      {fatal && (
        <Card className="empty" style={{ marginTop: 18 }}>
          <span className="empty__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <p>{fatal}</p>
          <Button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); reloadRef(); }}>Try again</Button>
        </Card>
      )}

      {busy && (
        <div className="stack" style={{ marginTop: 18 }} aria-busy="true">
          <div className="grid-cards">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}</div>
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      )}

      {!fatal && !busy && (
        <div className="stack" style={{ marginTop: 18 }}>
          <div className="grid-cards anim-stagger">
            <Card accent="green" className="stat">
              <span className="stat__label">INCOME</span>
              <span className="stat__value num num--income">{fmt(totals.income)}</span>
            </Card>
            <Card accent="red" className="stat">
              <span className="stat__label">EXPENSES</span>
              <span className="stat__value num num--expense">{fmt(totals.expense)}</span>
            </Card>
            <Card accent={totals.net < 0 ? 'red' : 'orange'} className="stat">
              <span className="stat__label">NET</span>
              <span className={`stat__value num ${totals.net < 0 ? 'num--expense' : ''}`}>{fmt(totals.net)}</span>
            </Card>
            <Card accent="purple" className="stat">
              <span className="stat__label">SAVINGS RATE</span>
              <span className="stat__value num num--insight">{pct(rate)}</span>
            </Card>
          </div>

          <Card>
            <div className="card-head"><h2>Income vs expenses</h2></div>
            <IncomeExpenseChart data={series} tall />
          </Card>

          <div className="grid-2">
            <Card>
              <div className="card-head"><h2>Category breakdown</h2></div>
              <CategoryDonut data={breakdown} />
            </Card>
            <Card>
              <div className="card-head"><h2>Monthly spending trend</h2></div>
              <SeriesChart data={series} dataKey="expense" name="Expenses" color={CHART_COLORS.expense} variant="line" label="Monthly spending trend" />
            </Card>
          </div>

          <div className="grid-2">
            <Card>
              <div className="card-head"><h2>Savings trend</h2></div>
              <SeriesChart data={series} dataKey="net" name="Net savings" color={CHART_COLORS.income} label="Net savings by month" />
            </Card>
            <Card>
              <div className="card-head"><h2>Net worth progression</h2></div>
              <SeriesChart data={worth} dataKey="value" name="Net worth" color={CHART_COLORS.insight} label="Net worth at the end of each month" />
              <p className="stat__hint" style={{ marginTop: 8 }}>
                Calculated from your account opening balances plus recorded income and expenses. Transfers between your own accounts don’t change it.
              </p>
            </Card>
          </div>

          <Card>
            <div className="card-head">
              <h2>Annual summary</h2>
              <div style={{ minWidth: 110 }}>
                <Field as="select" aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </Field>
              </div>
            </div>

            <div className="grid-cards" style={{ marginBottom: 16 }}>
              <div className="stat"><span className="stat__label">INCOME</span><span className="stat__value num num--income">{fmt(yearTotals.income)}</span></div>
              <div className="stat"><span className="stat__label">EXPENSES</span><span className="stat__value num num--expense">{fmt(yearTotals.expense)}</span></div>
              <div className="stat"><span className="stat__label">NET</span><span className={`stat__value num ${yearTotals.net < 0 ? 'num--expense' : ''}`}>{fmt(yearTotals.net)}</span></div>
              <div className="stat"><span className="stat__label">SAVINGS RATE</span><span className="stat__value num num--insight">{pct(savingsRate(yearTotals.income, yearTotals.expense))}</span></div>
            </div>

            {yearRows.length === 0 ? (
              <div className="empty" style={{ padding: '18px 8px' }}><p>No transactions recorded in {year}.</p></div>
            ) : (
              <>
                {yearTop.length > 0 && (
                  <p className="muted" style={{ marginBottom: 14, fontSize: '0.9rem' }}>
                    Top spending categories in {year}: {yearTop.map((c) => `${c.name} (${fmt(c.value)})`).join(', ')}.
                  </p>
                )}
                <div className="annual-scroll">
                  <div className="annual-table">
                    <div className="annual-row annual-row--head" aria-hidden="true">
                      <span>MONTH</span><span>INCOME</span><span>EXPENSES</span><span>NET</span><span>SAVED</span>
                    </div>
                    {yearSeries.map((m) => (
                      <div className="annual-row" key={m.month}>
                        <strong>{shortMonth(m.month)}</strong>
                        <span className="num">{fmt(m.income)}</span>
                        <span className="num">{fmt(m.expense)}</span>
                        <span className={`num ${m.net < 0 ? 'num--expense' : ''}`}>{fmt(m.net)}</span>
                        <span className="num muted">{pct(m.savingsRate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
          <p className="disclaimer">All figures come from the transactions you have recorded. {round2(0) === 0 ? '' : ''}</p>
        </div>
      )}
    </div>
  );
}