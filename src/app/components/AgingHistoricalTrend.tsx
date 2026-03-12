import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Line,
} from 'recharts';

interface SnapshotTrend {
  snapshot_id:       string;
  label:             string;
  total_amount:      number;
  current_amount:    number;
  overdue_amount:    number;
  collected_rate:    number;
  overdue_rate:      number;
  total_customers:   number;
  paid_customers:    number;
  overdue_customers: number;
  paid_pct:          number;
  overdue_pct:       number;
}

const C = {
  emerald: '#10b981',
  rose:    '#f43f5e',
  indigo:  '#6366f1',
  amber:   '#f59e0b',
  border:  'hsl(var(--border))',
  mutedFg: 'hsl(var(--muted-foreground))',
  card:    'hsl(var(--card))',
  cardFg:  'hsl(var(--card-foreground))',
  muted:   'hsl(var(--muted))',
};

const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'LYD', maximumFractionDigits: 0,
  }).format(v);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d: SnapshotTrend = payload[0]?.payload;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 12, padding: '14px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 12, minWidth: 240,
    }}>
      <p style={{ fontWeight: 800, color: '#111827', marginBottom: 12, fontSize: 13 }}>{label}</p>

      {/* Customers */}
      <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Customers ({d.total_customers} total)
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: `${C.emerald}12`, border: `1px solid ${C.emerald}25` }}>
          <p style={{ fontSize: 10, color: C.emerald, fontWeight: 700, margin: '0 0 2px' }}>✓ Paid</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.emerald, margin: 0 }}>{d.paid_pct}%</p>
          <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{d.paid_customers} customers</p>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: `${C.rose}12`, border: `1px solid ${C.rose}25` }}>
          <p style={{ fontSize: 10, color: C.rose, fontWeight: 700, margin: '0 0 2px' }}>✗ Overdue</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.rose, margin: 0 }}>{d.overdue_pct}%</p>
          <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{d.overdue_customers} customers</p>
        </div>
      </div>

      {/* Amounts */}
      <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Amounts
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Total</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>{formatCurrency(d.total_amount)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: C.emerald }}>Current (healthy)</span>
          <span style={{ fontWeight: 700, color: C.emerald }}>{formatCurrency(d.current_amount)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: C.rose }}>Overdue</span>
          <span style={{ fontWeight: 700, color: C.rose }}>{formatCurrency(d.overdue_amount)}</span>
        </div>
      </div>
    </div>
  );
}

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

  const cardStyle: React.CSSProperties = {
    background: C.card, borderRadius: 16, padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
    border: `1px solid ${C.border}`,
  };

  if (loading) return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.mutedFg }}>
      Loading…
    </div>
  );

  if (error || data.length === 0) return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.mutedFg, fontSize: 13 }}>
      {error ?? 'No data available — import multiple snapshots to see trends.'}
    </div>
  );

  const latest = data[data.length - 1];
  const prev   = data.length > 1 ? data[data.length - 2] : null;

  // Chart data
  const chartData = data.map(d => ({
    ...d,
    paid_value:    mode === 'customers' ? d.paid_pct    : d.collected_rate,
    overdue_value: mode === 'customers' ? d.overdue_pct : d.overdue_rate,
  }));

  return (
    <div style={cardStyle}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.cardFg, margin: 0 }}>
            Paid vs Overdue — Historical Trend
          </h3>
          <p style={{ fontSize: 12, color: C.mutedFg, marginTop: 3 }}>
            {mode === 'customers'
              ? '% of customers with no overdue balance vs customers with overdue balance'
              : '% of total receivable amount that is current vs overdue'}
          </p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {(['customers', 'amount'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: mode === m ? C.indigo : C.card,
              color:      mode === m ? '#fff'   : C.mutedFg,
              transition: 'all 0.15s',
            }}>
              {m === 'customers' ? '👥 Customers' : '💰 Amount'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI badges — latest snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Paid Customers',    value: `${latest.paid_pct}%`,     sub: `${latest.paid_customers} / ${latest.total_customers}`,    color: C.emerald, delta: prev ? +(latest.paid_pct - prev.paid_pct).toFixed(1) : null, good: true },
          { label: 'Overdue Customers', value: `${latest.overdue_pct}%`,  sub: `${latest.overdue_customers} / ${latest.total_customers}`, color: C.rose,    delta: prev ? +(latest.overdue_pct - prev.overdue_pct).toFixed(1) : null, good: false },
          { label: 'Current Amount',    value: `${latest.collected_rate}%`, sub: formatCurrency(latest.current_amount),                  color: C.emerald, delta: prev ? +(latest.collected_rate - prev.collected_rate).toFixed(1) : null, good: true },
          { label: 'Overdue Amount',    value: `${latest.overdue_rate}%`,   sub: formatCurrency(latest.overdue_amount),                  color: C.rose,    delta: prev ? +(latest.overdue_rate - prev.overdue_rate).toFixed(1) : null, good: false },
        ].map((kpi, i) => (
          <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: `${kpi.color}10`, border: `1px solid ${kpi.color}25` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.mutedFg, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: C.mutedFg, margin: '2px 0 0' }}>{kpi.sub}</p>
            {kpi.delta !== null && (
              <p style={{ fontSize: 10, margin: '4px 0 0', fontWeight: 600, color: (kpi.good ? kpi.delta >= 0 : kpi.delta <= 0) ? C.emerald : C.rose }}>
                {kpi.delta >= 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}% vs prev
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Stacked 100% bar chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={C.border} vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={axisStyle} axisLine={false} tickLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => (
              <span style={{ color: C.mutedFg }}>
                {value === 'paid_value'    ? (mode === 'customers' ? '✓ Paid customers %'    : '✓ Current amount %') : ''}
                {value === 'overdue_value' ? (mode === 'customers' ? '✗ Overdue customers %' : '✗ Overdue amount %') : ''}
              </span>
            )}
          />
          <Bar dataKey="paid_value"    name="paid_value"    stackId="a" fill={C.emerald} radius={[0, 0, 0, 0]} />
          <Bar dataKey="overdue_value" name="overdue_value" stackId="a" fill={C.rose}    radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Snapshot', 'Total Customers', 'Paid %', 'Overdue %', 'Current Amount', 'Overdue Amount', 'Total'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.mutedFg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((row, i) => (
              <tr key={row.snapshot_id} style={{ borderBottom: `1px solid ${C.border}`, background: i === 0 ? `${C.indigo}05` : 'transparent' }}>
                <td style={{ padding: '8px 10px', fontWeight: i === 0 ? 700 : 400, color: C.cardFg, whiteSpace: 'nowrap' }}>{row.label}</td>
                <td style={{ padding: '8px 10px', color: C.mutedFg }}>{row.total_customers}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ fontWeight: 700, color: C.emerald }}>{row.paid_pct}%</span>
                  <span style={{ color: C.mutedFg, fontSize: 10, marginLeft: 4 }}>({row.paid_customers})</span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ fontWeight: 700, color: C.rose }}>{row.overdue_pct}%</span>
                  <span style={{ color: C.mutedFg, fontSize: 10, marginLeft: 4 }}>({row.overdue_customers})</span>
                </td>
                <td style={{ padding: '8px 10px', color: C.emerald, fontWeight: 600 }}>{formatCurrency(row.current_amount)}</td>
                <td style={{ padding: '8px 10px', color: C.rose,    fontWeight: 600 }}>{formatCurrency(row.overdue_amount)}</td>
                <td style={{ padding: '8px 10px', color: C.cardFg,  fontWeight: 700 }}>{formatCurrency(row.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}