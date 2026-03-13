// src/app/components/SalesKPISection.tsx
import { useState } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, Clock,
  BarChart2, ArrowUp, ArrowDown, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useSalesKPI } from '../lib/dataHooks';
import { formatCurrency, formatNumber } from '../lib/utils';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  cyan:    '#0ea5e9',
  teal:    '#14b8a6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  orange:  '#f97316',
  rose:    '#f43f5e',
};

const COLORS = [C.indigo, C.cyan, C.teal, C.emerald, C.amber, C.rose, C.violet, C.orange, '#84cc16', '#ec4899'];

const css = {
  card:      'hsl(var(--card))',
  cardFg:    'hsl(var(--card-foreground))',
  border:    'hsl(var(--border))',
  muted:     'hsl(var(--muted))',
  mutedFg:   'hsl(var(--muted-foreground))',
  bg:        'hsl(var(--background))',
  fg:        'hsl(var(--foreground))',
};

const cardStyle: React.CSSProperties = {
  background:   css.card,
  borderRadius: 16,
  padding:      24,
  boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border:       `1px solid ${css.border}`,
};

const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const legendStyle = { fontSize: 12, color: 'hsl(var(--muted-foreground))', paddingTop: 8 };

// ── Panel ──────────────────────────────────────────────────────────────────────
function Panel({ title, sub, icon: Icon, iconAccent, children }: {
  title: string; sub?: string;
  icon?: React.ElementType; iconAccent?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>
          {Icon && <Icon size={15} style={{ color: iconAccent ?? C.indigo, flexShrink: 0 }} />}
          {title}
        </h3>
        {sub && <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3, marginLeft: Icon ? 23 : 0 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Custom Tooltip — Dashboard style ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:   css.card,
      border:       `1px solid ${css.border}`,
      borderRadius: 12,
      padding:      '12px 16px',
      boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
      fontSize:     12,
      minWidth:     220,
      maxWidth:     300,
    }}>
      <p style={{
        fontSize: 12, fontWeight: 700, color: css.cardFg,
        paddingBottom: 8, borderBottom: `1px solid ${css.border}`,
        margin: '0 0 8px 0',
      }}>
        {label}
      </p>
      <div style={{ marginTop: 10 }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 8 : 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color ?? COLORS[i], display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: css.mutedFg, flex: 1 }}>{p.name}</span>
            <span style={{ fontWeight: 700, color: css.cardFg }}>
              {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KpiStatCard — Dashboard style ──────────────────────────────────────────────
function KpiStatCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string;
  trend?: { value: number; isUp: boolean } | null;
}) {
  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${accent}`, paddingTop: 20 }}>
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: accent, opacity: 0.06, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        {trend && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700,
            color: trend.isUp ? C.emerald : C.rose,
            background: trend.isUp ? `${C.emerald}12` : `${C.rose}12`,
            border: `1px solid ${trend.isUp ? C.emerald : C.rose}25`,
            padding: '3px 8px', borderRadius: 20,
          }}>
            {trend.isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {trend.value.toFixed(1)}%
          </div>
        )}
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: css.cardFg, marginTop: 5, marginBottom: 4, letterSpacing: '-0.03em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: css.mutedFg, marginBottom: 14 }}>{sub}</p>}
      {!sub && <div style={{ marginBottom: 14 }} />}
      <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: '64%', background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
      </div>
    </div>
  );
}

// ── Year selector button — UNCHANGED ──────────────────────────────────────────
function YearBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      height: 34, padding: '0 14px', borderRadius: 8,
      border: `1px solid ${active ? C.indigo : css.border}`,
      background: active ? `${C.indigo}15` : 'transparent',
      color: active ? C.indigo : css.cardFg,
      fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

// ── Main Section ───────────────────────────────────────────────────────────────
export function SalesKPISection() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, loading, error, refetch } = useSalesKPI({ year });

  const caTotal             = Number(data?.ca?.total         ?? 0);
  const caPrevious          = Number(data?.ca?.previous      ?? 0);
  const salesEvolutionValue = Number(data?.sales_evolution?.value ?? 0);
  const hasSalesEvolution   = data?.sales_evolution?.is_up != null;
  const salesEvolutionIsUp  = Boolean(data?.sales_evolution?.is_up);
  const salesEvolutionDesc  = data?.sales_evolution?.description ?? 'No comparison data';

  const monthlyChartData = [...(data?.monthly_sales ?? [])]
    .sort((a, b) => a.month - b.month)
    .map(m => ({ month: m.month_label, revenue: m.total_revenue, qty: m.total_qty }));

  const topProducts = data?.top_products.slice(0, 10) ?? [];
  const topClients  = data?.top_clients.slice(0, 8)   ?? [];
  const margins     = data?.product_margins.filter(p => p.margin_pct !== undefined).slice(0, 10) ?? [];
  const velocity    = data?.sales_velocity;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: css.fg, letterSpacing: '-0.02em', margin: 0 }}>
            <TrendingUp size={18} style={{ color: C.indigo }} />
            Sales KPIs
          </h2>
          <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>
            Revenue, top products, margins, top clients &amp; sales velocity
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[currentYear - 1, currentYear].map(y => (
              <YearBtn key={y} active={year === y} onClick={() => setYear(y)}>{y}</YearBtn>
            ))}
          </div>
          <button onClick={refetch} disabled={loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8,
            border: `1px solid ${css.border}`, background: css.card,
            color: css.cardFg, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, color: C.rose }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: 13, flex: 1 }}>{error}</span>
          <button onClick={refetch} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 12, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {loading && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: C.indigo }} />
          <span style={{ fontSize: 14, color: css.mutedFg }}>Loading sales KPIs…</span>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI Summary Cards — Dashboard style */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            <KpiStatCard
              label="Total Revenue (CA)" value={formatCurrency(caTotal)} sub={`vs ${formatCurrency(caPrevious)} prev. year`}
              icon={TrendingUp} accent={C.indigo}
              trend={caPrevious > 0 ? { value: Math.abs(salesEvolutionValue), isUp: salesEvolutionIsUp } : null}
            />
            <KpiStatCard
              label="Sales Evolution" value={hasSalesEvolution ? `${salesEvolutionIsUp ? '+' : ''}${salesEvolutionValue.toFixed(1)}%` : 'N/A'} sub={salesEvolutionDesc}
              icon={!hasSalesEvolution ? Clock : salesEvolutionIsUp ? TrendingUp : TrendingDown}
              accent={!hasSalesEvolution ? '#64748b' : salesEvolutionIsUp ? C.emerald : C.rose}
            />
            <KpiStatCard
              label="Top Profitable Product" value={topProducts[0] ? `${topProducts[0].material_name.slice(0, 24)}` : 'No data'}
              icon={ShoppingBag} accent={C.violet}
            />
            <KpiStatCard
              label="Avg Daily Sales" value={formatCurrency(velocity?.avg_daily_revenue ?? 0)}
              sub={velocity ? `Over ${velocity.n_days} days · ${formatNumber(velocity.avg_daily_qty)} units/day` : ''}
              icon={Clock} accent={C.amber}
            />
          </div>

          {/* Monthly Revenue Trend — Dashboard style */}
          {monthlyChartData.length > 0 && (
            <Panel title={`Monthly Revenue — ${year}`} sub="Revenue trend by month" icon={TrendingUp} iconAccent={C.indigo}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {/* 3-stop gradient — Dashboard style */}
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={C.indigo} stopOpacity={0.28} />
                      <stop offset="55%"  stopColor={C.indigo} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={C.indigo} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} tickCount={5} width={36} />
                  <RechartsTooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 3' }}
                  />
                  <Area
                    type="natural"
                    dataKey="revenue"
                    stroke={C.indigo}
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                    name="Revenue"
                    dot={false}
                    activeDot={{ r: 5, fill: css.card, stroke: C.indigo, strokeWidth: 2.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          )}

          {/* Top Products + Top Clients — Dashboard style for charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {topProducts.length > 0 && (
              <Panel title="Top Products by Revenue" sub={`Top ${topProducts.length} products · ${year}`} icon={ShoppingBag} iconAccent={C.indigo}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={topProducts.map(p => ({ name: p.material_name.slice(0, 18), revenue: p.total_revenue, share: p.revenue_share }))}
                    layout="vertical" barCategoryGap="30%" barGap={4}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      {topProducts.map((_, i) => (
                        <linearGradient key={i} id={`top-p-${i}`} x1="1" y1="0" x2="0" y2="0">
                          <stop offset="0%"   stopColor={COLORS[i % COLORS.length]} stopOpacity={1}    />
                          <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.55} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke={css.border} strokeWidth={1} horizontal={false} />
                    <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={110} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    <Bar dataKey="revenue" name="Revenue" radius={[0, 5, 5, 0]} maxBarSize={22}>
                      {topProducts.map((_, i) => <Cell key={i} fill={`url(#top-p-${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            )}

            {topClients.length > 0 && (
              <Panel title="Top Clients by Revenue" sub="Excludes cash customers (نقدي / قطاعي)" icon={Users} iconAccent={C.emerald}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {topClients.map((client, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: css.mutedFg, width: 16, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.customer_name}</p>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.indigo, marginLeft: 8, flexShrink: 0 }}>{formatCurrency(client.total_revenue)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${Number(client.revenue_share ?? 0)}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}65, ${COLORS[i % COLORS.length]})`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                          </div>
                          <span style={{ fontSize: 10, color: css.mutedFg, width: 36, textAlign: 'right', flexShrink: 0 }}>{Number(client.revenue_share ?? 0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: `1px solid ${css.border}`, color: css.mutedFg, flexShrink: 0 }}>
                        {client.transaction_count} ops
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* Product Margins — UNCHANGED logic, progress bar updated */}
          {margins.length > 0 && (
            <Panel title="Product Margins" sub="Gross margin % per product (estimated from purchase cost data)" icon={BarChart2} iconAccent={C.amber}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {margins.map((p, i) => {
                  const margin = p.margin_pct ?? 0;
                  const accent = margin >= 30 ? C.emerald : margin >= 15 ? C.amber : C.rose;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: css.cardFg, margin: 0, width: 200, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.material_name.slice(0, 28)}
                      </p>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(100, Math.max(0, margin))}%`, background: `linear-gradient(90deg, ${accent}65, ${accent})`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: accent, width: 48, textAlign: 'right', flexShrink: 0 }}>{margin.toFixed(1)}%</span>
                      </div>
                      <span style={{ fontSize: 11, color: css.mutedFg, width: 110, textAlign: 'right', flexShrink: 0 }}>{formatCurrency(p.total_revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Sales Velocity — UNCHANGED */}
          {(velocity?.by_product?.length ?? 0) > 0 && (
            <Panel title="Sales Velocity — Days to Sell 100 Units" sub={`Faster products sell first · ${velocity!.n_days} days period`} icon={Clock} iconAccent={C.violet}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${css.border}` }}>
                      {['Product', 'Avg Qty/Day', 'Avg Revenue/Day', 'Days to sell 100'].map((h, i) => (
                        <th key={i} style={{ padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: css.mutedFg, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {velocity!.by_product.slice(0, 10).map((p, i) => {
                      const fast = p.days_to_sell_100 <= 30;
                      const mid  = p.days_to_sell_100 <= 90;
                      const badgeAccent = fast ? C.indigo : mid ? C.amber : '#94a3b8';
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${css.border}` }}>
                          <td style={{ padding: '10px 0', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: css.cardFg }}>{p.material_name}</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', color: css.mutedFg }}>{p.avg_daily_qty.toFixed(2)}</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', color: css.mutedFg }}>{formatCurrency(p.avg_daily_revenue)}</td>
                          <td style={{ padding: '10px 0', textAlign: 'right' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${badgeAccent}18`, color: badgeAccent, border: `1px solid ${badgeAccent}35` }}>
                              {p.days_to_sell_100 > 9999 ? '∞' : `${p.days_to_sell_100}d`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}