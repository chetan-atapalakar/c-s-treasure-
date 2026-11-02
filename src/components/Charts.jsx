import { useId } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import Icon from './Icon.jsx';
import useMoney from '../hooks/useMoney.js';
import { formatCompact } from '../utils/format.js';
import { round2 } from '../utils/finance.js';
import '../styles/dashboard.css';

export const CHART_COLORS = { income: '#22C55E', expense: '#EF4444', insight: '#8B5CF6', primary: '#FF7023' };
const BRAND = [CHART_COLORS.primary, CHART_COLORS.insight, CHART_COLORS.income, CHART_COLORS.expense];

// Stays on-brand: cycle the four colours, fading each repeat.
export const sliceStyle = (i) => ({ color: BRAND[i % 4], opacity: Math.max(0.35, 1 - Math.floor(i / 4) * 0.25) });

function useChartFormat() {
  const { fmt, currency, hidden } = useMoney();
  return { fmt, axis: (v) => (hidden ? '' : formatCompact(v, currency)) };
}

function ChartTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label ?? payload[0]?.name}</div>
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: p.color || p.payload?.fill || p.fill }} />
          <span>{p.name}:</span>
          <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function ChartEmpty({ text = 'No data for this period yet.' }) {
  return (
    <div className="empty" style={{ padding: '28px 8px' }}>
      <span className="empty__icon"><Icon name="chart" size={26} /></span>
      <p>{text}</p>
    </div>
  );
}

const AXIS = { tickLine: false, axisLine: false };

export function IncomeExpenseChart({ data, tall = false }) {
  const { fmt, axis } = useChartFormat();
  if (!data.some((d) => d.income || d.expense)) return <ChartEmpty />;
  return (
    <div>
      <div className="legend" aria-hidden="true">
        <span><i className="legend__dot" style={{ background: CHART_COLORS.income }} />Income</span>
        <span><i className="legend__dot" style={{ background: CHART_COLORS.expense }} />Expenses</span>
      </div>
      <div className={`chart ${tall ? 'chart--tall' : ''}`} role="img" aria-label="Income versus expenses by month">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" {...AXIS} />
            <YAxis width={56} tickFormatter={axis} {...AXIS} />
            <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }} content={<ChartTooltip fmt={fmt} />} />
            <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" name="Expenses" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SeriesChart({ data, dataKey, name, color = CHART_COLORS.insight, variant = 'area', label }) {
  const { fmt, axis } = useChartFormat();
  const gid = `g${useId().replace(/:/g, '')}`;
  if (!data.some((d) => d[dataKey])) return <ChartEmpty />;
  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" {...AXIS} />
      <YAxis width={56} tickFormatter={axis} {...AXIS} />
      <Tooltip content={<ChartTooltip fmt={fmt} />} />
    </>
  );
  return (
    <div className="chart" role="img" aria-label={label || name}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === 'line' ? (
          <LineChart {...common}>
            {axes}
            <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
          </LineChart>
        ) : (
          <AreaChart {...common}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {axes}
            <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }) {
  const { fmt } = useChartFormat();
  if (data.length === 0) return <ChartEmpty text="No expenses in this period." />;

  const slices =
    data.length > 8
      ? [
          ...data.slice(0, 7),
          {
            id: 'other',
            name: 'Other',
            value: round2(data.slice(7).reduce((s, x) => s + x.value, 0)),
            pct: data.slice(7).reduce((s, x) => s + x.pct, 0),
          },
        ]
      : data;

  return (
    <div className="donut-wrap">
      <div className="chart" style={{ height: 220 }} role="img" aria-label="Spending by category">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
              {slices.map((s, i) => (
                <Cell key={s.id} fill={sliceStyle(i).color} fillOpacity={sliceStyle(i).opacity} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="cat-list">
        {slices.map((s, i) => (
          <li key={s.id}>
            <span className="swatch" style={{ background: sliceStyle(i).color, opacity: sliceStyle(i).opacity }} />
            <span>{s.name}</span>
            <strong className="num">{fmt(s.value)}</strong>
            <span className="pct">{s.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}