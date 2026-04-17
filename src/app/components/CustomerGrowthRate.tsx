// src/app/components/CustomerGrowthRate.tsx
// ─────────────────────────────────────────────────────────────────
// Composant : Taux de croissance clients année par année
// Design    : Inspiré du dashboard "Receivables by Age Bucket"
//             → barres en dégradé, tooltip épuré, fond blanc, coins arrondis
// API       : GET /api/aging/customer-growth/
// ─────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

interface GrowthYear {
  year:             number;
  snapshot_id:      string;
  label:            string;
  customer_count:   number;
  prev_count:       number | null;
  growth_rate:      number | null;
  growth_absolute:  number | null;
  is_growth:        boolean | null;
}

interface GrowthResponse {
  count: number;
  years: GrowthYear[];
}

// ── Palette — inspirée de l'image ──────────────────────────────
// Vert clair → Jaune-ambre → Orange → Rouge selon la "sévérité"
// Pour la croissance : vert = positif, orange/rouge = négatif
const C = {
  // Dégradés barres (couleurs de l'image)
  green:   '#34d399',   // base year / current
  teal:    '#2dd4bf',
  amber:   '#fbbf24',   // 31-60d dans l'image
  orange:  '#fb923c',   // 61-90d
  rose:    '#f43f5e',   // > 90d / déclin
  indigo:  '#6366f1',   // ligne de tendance

  // UI neutres
  slate:   '#1e293b',
  slateL:  '#64748b',
  slateXL: '#94a3b8',
  border:  '#e2e8f0',
  bg:      '#f8fafc',
  card:    '#ffffff',
  cardFg:  '#0f172a',
  muted:   '#f1f5f9',
  mutedFg: '#94a3b8',
};

// Couleur d'une barre selon le taux de croissance (même logique que l'image : vert → rouge)
function barColor(rate: number | null, isGrowth: boolean | null): string {
  if (rate === null) return C.green;           // année de base → vert
  if (rate >= 10)   return C.green;
  if (rate >= 0)    return C.amber;
  if (rate >= -10)  return C.orange;
  return C.rose;                               // fort déclin → rouge
}

// Dégradé SVG id unique par barre
function gradientId(year: number) { return `grad-${year}`; }

const axisStyle = {
  fontSize: 12,
  fill: C.slateXL,
  fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
};

const cardStyle: React.CSSProperties = {
  background:   C.card,
  borderRadius: 16,
  padding:      '28px 28px 24px',
  boxShadow:    '0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04)',
  border:       `1px solid ${C.border}`,
  fontFamily:   "'DM Sans', 'Segoe UI', system-ui, sans-serif",
};

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat('en-US').format(n);
}

// ── Tooltip — style très épuré comme dans l'image ─────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: GrowthYear = payload[0]?.payload;
  const color = barColor(d.growth_rate, d.is_growth);

  return (
    <div style={{
      background: '#fff',
      border:     `1px solid ${C.border}`,
      borderRadius: 12,
      padding:    '14px 20px',
      boxShadow:  '0 8px 32px rgba(0,0,0,0.10)',
      fontSize:   13,
      minWidth:   200,
    }}>
      {/* Header année */}
      <p style={{ fontWeight: 700, color: C.slate, margin: '0 0 12px', fontSize: 14 }}>
        {d.year}
        {d.label && (
          <span style={{ fontWeight: 400, color: C.slateL, marginLeft: 6, fontSize: 12 }}>
            — {d.label}
          </span>
        )}
      </p>

      <TTRow label="Customers"    value={fmt(d.customer_count)} color={C.slate} />
      {d.prev_count !== null && (
        <TTRow label="Previous year" value={fmt(d.prev_count)} color={C.slateL} />
      )}
      {d.growth_rate !== null && (
        <>
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '10px 0 10px' }} />
          <TTRow
            label="Growth rate"
            value={`${d.growth_rate > 0 ? '+' : ''}${d.growth_rate}%`}
            color={color}
            bold
          />
          {d.growth_absolute !== null && (
            <TTRow
              label="Net change"
              value={`${d.growth_absolute > 0 ? '+' : ''}${fmt(d.growth_absolute)}`}
              color={color}
            />
          )}
        </>
      )}
      {d.growth_rate === null && (
        <p style={{ fontSize: 11, color: C.slateXL, fontStyle: 'italic', margin: '8px 0 0' }}>
          Base year — no prior comparison
        </p>
      )}
    </div>
  );
}

function TTRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: C.slateL }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color }}>{value}</span>
    </div>
  );
}

// ── Summary KPI card (petits badges en haut) ───────────────────
function SummaryBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '12px 20px',
      borderRadius: 12,
      background: `${color}0d`,
      border:     `1px solid ${color}22`,
      minWidth:   140,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.slateXL, margin: '0 0 5px' }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  );
}

// ── Custom Bar shape avec dégradé (comme l'image) ──────────────
function GradientBar(props: any) {
  const { x, y, width, height, payload } = props;
  if (!height || height <= 0) return null;

  const color = barColor(payload.growth_rate, payload.is_growth);
  const id    = gradientId(payload.year);

  // Dégradé vertical : couleur vive en haut, plus transparent en bas (comme l'image)
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        fill={`url(#${id})`}
      />
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────
export function CustomerGrowthRate() {
  const [data,    setData]    = useState<GrowthYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('fasi_access_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/aging/customer-growth/', { headers })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: GrowthResponse) => { setData(d.years ?? []); setLoading(false); })
      .catch(e => { setError(e.message || 'Failed to load'); setLoading(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: C.mutedFg, fontSize: 13, gap: 10 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Loading growth data…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Error / vide ─────────────────────────────────────────────
  if (error || data.length === 0) return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10, color: C.mutedFg, fontSize: 13 }}>
      <span>{error ?? 'No data — import aging snapshots to view customer growth.'}</span>
      {error && (
        <button onClick={fetchData} style={{
          padding: '6px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.card, color: C.mutedFg, fontSize: 12, cursor: 'pointer',
        }}>Retry</button>
      )}
    </div>
  );

  // ── Calculs ─────────────────────────────────────────────────
  const withRate   = data.filter(d => d.growth_rate !== null);
  const avgGrowth  = withRate.length > 0
    ? round2(withRate.reduce((s, d) => s + (d.growth_rate ?? 0), 0) / withRate.length)
    : null;

  const totalGrowth = data.length >= 2
    ? (() => {
        const first = data[0].customer_count;
        const last  = data[data.length - 1].customer_count;
        return first > 0 ? round2((last - first) / first * 100) : null;
      })()
    : null;

  const latest = data[data.length - 1];

  // Chart data : on ajoute rate_display (null pour la ligne si base year)
  const chartData = data.map(d => ({
    ...d,
    rate_display: d.growth_rate,
  }));

  return (
    <div style={cardStyle}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.cardFg, margin: '0 0 4px' }}>
            Customer Growth Rate
          </h3>
          <p style={{ fontSize: 12, color: C.slateXL, margin: 0 }}>
            Year-over-year change in active customers
            <span style={{ marginLeft: 8, fontWeight: 600, color: C.slateL }}>
              · {data.length} year{data.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>

        <button
          onClick={fetchData}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 9,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.slateL, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Summary badges ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
        {avgGrowth !== null && (
          <SummaryBadge
            label="Avg. Annual Growth"
            value={`${avgGrowth >= 0 ? '+' : ''}${avgGrowth}%`}
            color={avgGrowth >= 0 ? C.green : C.rose}
          />
        )}
        {totalGrowth !== null && (
          <SummaryBadge
            label={`Total Growth (${data[0].year}→${latest.year})`}
            value={`${totalGrowth >= 0 ? '+' : ''}${totalGrowth}%`}
            color={totalGrowth >= 0 ? C.indigo : C.rose}
          />
        )}
        <SummaryBadge
          label="Latest Year Customers"
          value={fmt(latest.customer_count)}
          color={C.slate}
        />
      </div>

      {/* ── Chart principal ── */}
      <div style={{
        background:   C.bg,
        borderRadius: 12,
        padding:      '20px 12px 12px',
        border:       `1px solid ${C.border}`,
        marginBottom: 24,
      }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="year"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
            />

            {/* Axe gauche : nb clients */}
            <YAxis
              yAxisId="count"
              orientation="left"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => fmt(v)}
              width={52}
            />

            {/* Axe droit : taux % */}
            <YAxis
              yAxisId="rate"
              orientation="right"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              width={48}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(99,102,241,0.05)', rx: 6 }}
            />

            {/* Ligne 0% */}
            <ReferenceLine
              yAxisId="rate"
              y={0}
              stroke={C.slateXL}
              strokeDasharray="4 3"
              strokeWidth={1}
            />

            {/* Barres avec dégradé — même style que l'image */}
            <Bar
              yAxisId="count"
              dataKey="customer_count"
              name="Customers"
              maxBarSize={48}
              shape={<GradientBar />}
            />

            {/* Ligne taux de croissance */}
            <Line
              yAxisId="rate"
              dataKey="rate_display"
              name="Growth rate (%)"
              type="monotone"
              stroke={C.indigo}
              strokeWidth={2}
              strokeDasharray="0"
              dot={(props: any) => {
                const d: GrowthYear = props.payload;
                if (d.growth_rate === null) return <circle key={props.key} r={0} />;
                const color = barColor(d.growth_rate, d.is_growth);
                return (
                  <g key={props.key}>
                    <circle cx={props.cx} cy={props.cy} r={7} fill={color} opacity={0.18} />
                    <circle cx={props.cx} cy={props.cy} r={4} fill={color} />
                  </g>
                );
              }}
              activeDot={{ r: 6, fill: C.indigo, strokeWidth: 0 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Légende minimaliste — style image */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { color: C.green,  label: 'Strong growth (≥10%)' },
            { color: C.amber,  label: 'Moderate growth (0–10%)' },
            { color: C.orange, label: 'Slight decline' },
            { color: C.rose,   label: 'Sharp decline' },
            { color: C.indigo, label: 'Growth rate % (line)', dashed: true },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {l.dashed ? (
                <svg width="20" height="10">
                  <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth="2" />
                  <circle cx="10" cy="5" r="3" fill={l.color} />
                </svg>
              ) : (
                <span style={{
                  width: 10, height: 10, borderRadius: 3,
                  background: l.color, display: 'inline-block', flexShrink: 0,
                }} />
              )}
              <span style={{ fontSize: 11, color: C.slateL }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table récapitulative ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'inherit' }}>
          <thead>
            <tr>
              {['Year', 'Customers', 'Previous Year', 'Change', 'Growth Rate', 'Trend'].map(h => (
                <th key={h} style={{
                  padding: '8px 14px', textAlign: 'left',
                  color: C.slateXL, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  fontSize: 10, whiteSpace: 'nowrap',
                  borderBottom: `2px solid ${C.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((row, i) => {
              const isLatest = i === 0;
              const accent   = barColor(row.growth_rate, row.is_growth);

              return (
                <tr
                  key={row.year}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    background:   isLatest ? `${C.indigo}07` : 'transparent',
                    transition:   'background 0.15s',
                  }}
                >
                  {/* Year */}
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: C.slate, whiteSpace: 'nowrap' }}>
                    {row.year}
                    {isLatest && (
                      <span style={{
                        marginLeft: 8, fontSize: 9, fontWeight: 700,
                        color: C.indigo, background: `${C.indigo}12`,
                        padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em',
                      }}>
                        LATEST
                      </span>
                    )}
                  </td>

                  {/* Customers */}
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: C.slate }}>
                    {fmt(row.customer_count)}
                  </td>

                  {/* Previous */}
                  <td style={{ padding: '10px 14px', color: C.slateL }}>
                    {row.prev_count !== null ? fmt(row.prev_count) : <span style={{ color: C.slateXL }}>—</span>}
                  </td>

                  {/* Change abs */}
                  <td style={{ padding: '10px 14px' }}>
                    {row.growth_absolute !== null ? (
                      <span style={{ fontWeight: 700, color: accent }}>
                        {row.growth_absolute > 0 ? '+' : ''}{fmt(row.growth_absolute)}
                      </span>
                    ) : <span style={{ color: C.slateXL }}>—</span>}
                  </td>

                  {/* Growth rate */}
                  <td style={{ padding: '10px 14px' }}>
                    {row.growth_rate !== null ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700,
                        color: accent,
                        background: `${accent}12`,
                        border: `1px solid ${accent}20`,
                      }}>
                        {row.growth_rate > 0 ? '+' : ''}{row.growth_rate}%
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: C.slateXL, fontStyle: 'italic' }}>Base year</span>
                    )}
                  </td>

                  {/* Trend bar */}
                  <td style={{ padding: '10px 14px' }}>
                    {row.growth_rate !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{
                          height: 5, width: 70, borderRadius: 999,
                          background: C.muted, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: 999,
                            width: `${Math.min(100, Math.abs(row.growth_rate) * 4)}%`,
                            background: `linear-gradient(90deg, ${accent}55, ${accent})`,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>
                          {row.is_growth ? '▲' : '▼'}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}