import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Line,
} from 'recharts';

interface SnapshotTrend {
  snapshot_id:         string;
  label:               string;
  total_amount:        number;
  current_amount:      number;
  overdue_amount:      number;
  collected_rate:      number;
  overdue_rate:        number;
  total_customers:     number;
  paid_customers:      number;
  overdue_customers:   number;
  overdue60_customers: number;
  paid_pct:            number;
  overdue_pct:         number;
  overdue60_pct:       number;
}

// ─── Professional finance palette ───────────────────────────────────────────
const C = {
  teal:       '#8c6161',   // healthy / paid
  tealMuted:  '#0d948820',
  tealBorder: '#0d948835',
  crimson:    '#c88a8a',   // overdue
  crimsonMuted:  '#a4615918',
  crimsonBorder: '#c0392b30',
  amber:      '#b45309',   // >60d warning
  amberMuted: '#b4530918',
  amberBorder:'#b4530930',
  slate:      '#1e293b',   // headings
  slateLight: '#475569',   // secondary text
  slateXLight:'#94a3b8',   // muted
  indigo:     '#3730a3',   // active toggle
  indigoBg:   '#eef2ff',
  border:     'hsl(var(--border))',
  card:       'hsl(var(--card))',
  cardFg:     'hsl(var(--card-foreground))',
  mutedFg:    'hsl(var(--muted-foreground))',
  bg:         '#f8fafc',
};

const axisStyle = { fontSize: 11, fill: C.slateXLight, fontFamily: 'inherit' };

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'LYD', maximumFractionDigits: 0,
  }).format(v);
}

// ─── Tooltip ────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d: SnapshotTrend = payload[0]?.payload;

  const metricRow = (label: string, val: string, sub: string, color: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid #f1f5f9` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 11, color: C.slateLight }}>{label}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{val}</span>
        <span style={{ fontSize: 10, color: C.slateXLight, marginLeft: 6 }}>{sub}</span>
      </div>
    </div>
  );

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '14px 16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      fontSize: 12,
      minWidth: 280,
    }}>
      <p style={{ fontWeight: 700, color: C.slate, marginBottom: 10, fontSize: 12, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: 10, fontWeight: 600, color: C.slateXLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        Customers — {d.total_customers} total
      </p>
      {metricRow('Paid / Current',     `${d.paid_pct}%`,      `${d.paid_customers} customers`,      C.teal)}
      {metricRow('Overdue (all)',       `${d.overdue_pct}%`,   `${d.overdue_customers} customers`,   C.crimson)}
      {metricRow('Overdue > 60 days',  `${d.overdue60_pct}%`, `${d.overdue60_customers} customers`, C.amber)}
      <p style={{ fontSize: 10, fontWeight: 600, color: C.slateXLight, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '10px 0 6px' }}>
        Amounts
      </p>
      {metricRow('Total',           fmt(d.total_amount),   '', C.slate)}
      {metricRow('Current',         fmt(d.current_amount), `${d.collected_rate}%`, C.teal)}
      {metricRow('Overdue',         fmt(d.overdue_amount), `${d.overdue_rate}%`,   C.crimson)}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function AgingHistoricalTrend() {
  const [data,    setData]    = useState<SnapshotTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [mode,    setMode]    = useState<'customers' | 'amount'>('customers');

  useEffect(() => {
    const token = localStorage.getItem('fasi_access_token');
    fetch('/api/aging/historical-trend/', {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
      .then(r => r.json())
      .then(d => { setData(d.trend ?? []); setLoading(false); })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, []);

  const card: React.CSSProperties = {
    background: C.card,
    borderRadius: 14,
    padding: 28,
    border: `1px solid ${C.border}`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };

  if (loading) return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.mutedFg, fontSize: 13 }}>
      Loading data…
    </div>
  );

  if (error || data.length === 0) return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.mutedFg, fontSize: 13 }}>
      {error ?? 'No data — import multiple snapshots to view trends.'}
    </div>
  );

  const latest = data[data.length - 1];
  const prev   = data.length > 1 ? data[data.length - 2] : null;

  const chartData = data.map(d => ({
    ...d,
    paid_value:      mode === 'customers' ? d.paid_pct      : d.collected_rate,
    overdue_value:   mode === 'customers' ? d.overdue_pct   : d.overdue_rate,
    overdue60_value: mode === 'customers' ? d.overdue60_pct : null,
  }));

  // ── KPI config ──────────────────────────────────────────────────────────
  const kpis = [
    {
      label: 'Paid Customers',
      value: `${latest.paid_pct}%`,
      sub:   `${latest.paid_customers} of ${latest.total_customers}`,
      color: C.teal,
      muted: C.tealMuted,
      bdr:   C.tealBorder,
      delta: prev ? +(latest.paid_pct - prev.paid_pct).toFixed(1) : null,
      good:  true,
    },
    {
      label: 'Overdue Customers',
      value: `${latest.overdue_pct}%`,
      sub:   `${latest.overdue_customers} of ${latest.total_customers}`,
      color: C.crimson,
      muted: C.crimsonMuted,
      bdr:   C.crimsonBorder,
      delta: prev ? +(latest.overdue_pct - prev.overdue_pct).toFixed(1) : null,
      good:  false,
    },
    {
      label: 'Overdue > 60 Days',
      value: `${latest.overdue60_pct}%`,
      sub:   `${latest.overdue60_customers} of ${latest.total_customers}`,
      color: C.amber,
      muted: C.amberMuted,
      bdr:   C.amberBorder,
      delta: prev ? +(latest.overdue60_pct - prev.overdue60_pct).toFixed(1) : null,
      good:  false,
    },
    {
      label: 'Current Amount',
      value: `${latest.collected_rate}%`,
      sub:   fmt(latest.current_amount),
      color: C.teal,
      muted: C.tealMuted,
      bdr:   C.tealBorder,
      delta: prev ? +(latest.collected_rate - prev.collected_rate).toFixed(1) : null,
      good:  true,
    },
    {
      label: 'Overdue Amount',
      value: `${latest.overdue_rate}%`,
      sub:   fmt(latest.overdue_amount),
      color: C.crimson,
      muted: C.crimsonMuted,
      bdr:   C.crimsonBorder,
      delta: prev ? +(latest.overdue_rate - prev.overdue_rate).toFixed(1) : null,
      good:  false,
    },
  ];

  return (
    <div style={card}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {/* Decorative accent bar */}
            <div style={{ width: 3, height: 18, borderRadius: 2, background: `linear-gradient(180deg, ${C.teal}, ${C.indigo})` }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.cardFg, margin: 0, letterSpacing: '-0.01em' }}>
              Paid vs Overdue — Historical Trend
            </h3>
          </div>
          <p style={{ fontSize: 12, color: C.mutedFg, margin: '0 0 0 13px' }}>
            {mode === 'customers'
              ? 'Distribution of customers by payment status across snapshots'
              : 'Receivable amount split between current and overdue balances'}
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex',
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
          background: C.bg,
        }}>
          {(['customers', 'amount'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '7px 18px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: mode === m ? C.indigo : 'transparent',
              color:      mode === m ? '#fff'   : C.slateLight,
              letterSpacing: '0.02em',
              transition: 'all 0.15s ease',
            }}>
              {m === 'customers' ? 'Customers' : 'Amount'}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Badges ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{
            padding: '14px 16px',
            borderRadius: 10,
            background: kpi.muted,
            border: `1px solid ${kpi.bdr}`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: kpi.color, opacity: 0.6 }} />
            <p style={{ fontSize: 10, fontWeight: 600, color: C.slateXLight, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {kpi.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: kpi.color, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {kpi.value}
            </p>
            <p style={{ fontSize: 11, color: C.slateLight, margin: '4px 0 0' }}>{kpi.sub}</p>
            {kpi.delta !== null && (
              <p style={{
                fontSize: 10,
                margin: '6px 0 0',
                fontWeight: 600,
                color: (kpi.good ? kpi.delta >= 0 : kpi.delta <= 0) ? C.teal : C.crimson,
              }}>
                {kpi.delta >= 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}% vs prev
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div style={{ background: C.bg, borderRadius: 10, padding: '16px 8px 8px', border: `1px solid ${C.border}` }}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 14 }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  paid_value:      mode === 'customers' ? 'Paid customers'        : 'Current amount',
                  overdue_value:   mode === 'customers' ? 'Overdue customers'     : 'Overdue amount',
                  overdue60_value: 'Overdue > 60 days',
                };
                return <span style={{ color: C.slateLight }}>{labels[value] ?? value}</span>;
              }}
            />
            <Bar dataKey="paid_value"    name="paid_value"    stackId="a" fill={C.teal}   radius={[0, 0, 4, 4]} />
            <Bar dataKey="overdue_value" name="overdue_value" stackId="a" fill={C.crimson} radius={[4, 4, 0, 0]} />
            {mode === 'customers' && (
              <Line
                dataKey="overdue60_value"
                name="overdue60_value"
                type="monotone"
                stroke={C.amber}
                strokeWidth={2}
                dot={{ r: 3.5, fill: C.amber, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: C.amber }}
                strokeDasharray="6 3"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Summary table ── */}
      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Snapshot', 'Customers', 'Paid', 'Overdue', 'Overdue > 60d', 'Current Amount', 'Overdue Amount', 'Total'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  color: C.slateXLight,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                  borderBottom: `2px solid ${C.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((row, i) => (
              <tr key={row.snapshot_id} style={{
                borderBottom: `1px solid ${C.border}`,
                background: i === 0 ? '#f0f4ff' : 'transparent',
                transition: 'background 0.1s',
              }}>
                <td style={{ padding: '9px 12px', fontWeight: i === 0 ? 700 : 500, color: C.slate, whiteSpace: 'nowrap', fontSize: 12 }}>
                  {row.label}
                  {i === 0 && (
                    <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, color: C.indigo, background: C.indigoBg, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>
                      LATEST
                    </span>
                  )}
                </td>
                <td style={{ padding: '9px 12px', color: C.slateLight }}>{row.total_customers}</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontWeight: 700, color: C.teal }}>{row.paid_pct}%</span>
                  <span style={{ color: C.slateXLight, fontSize: 10, marginLeft: 5 }}>({row.paid_customers})</span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontWeight: 700, color: C.crimson }}>{row.overdue_pct}%</span>
                  <span style={{ color: C.slateXLight, fontSize: 10, marginLeft: 5 }}>({row.overdue_customers})</span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontWeight: 700, color: C.amber }}>{row.overdue60_pct}%</span>
                  <span style={{ color: C.slateXLight, fontSize: 10, marginLeft: 5 }}>({row.overdue60_customers})</span>
                </td>
                <td style={{ padding: '9px 12px', color: C.teal,   fontWeight: 600 }}>{fmt(row.current_amount)}</td>
                <td style={{ padding: '9px 12px', color: C.crimson, fontWeight: 600 }}>{fmt(row.overdue_amount)}</td>
                <td style={{ padding: '9px 12px', color: C.slate,   fontWeight: 700 }}>{fmt(row.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}