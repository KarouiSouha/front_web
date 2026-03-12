import { useMemo } from 'react';
import {
  ShoppingCart, Package, TrendingUp,
  AlertTriangle, Wallet, Loader2,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  useKPIs,
  useTransactionSummary,
  useAgingDistribution,
  useAgingRisk,
  useBranchSummary,
  useBranchBreakdown,
  useCategoryBreakdown,
  useBranchMonthly,
  MOVEMENT_TYPES,
  useTypeBreakdown,
} from '../lib/dataHooks';
import { formatCurrency } from '../lib/utils';

// ── Brand palette ─────────────────────────────────────────────────────────

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

const BRANCH_COLORS = [C.indigo, C.cyan, C.teal, C.emerald, C.amber, C.rose];

const AGING_COLORS: Record<string, string> = {
  current:  C.emerald,
  d1_30:    '#34d399',
  d31_60:   C.amber,
  d61_90:   C.orange,
  d91_120:  C.rose,
  d121_150: '#e11d48',
  d151_180: '#be123c',
  d181_210: '#9f1239',
  d211_240: '#881337',
  d241_270: '#78350f',
  d271_300: '#92400e',
  d301_330: '#7c3aed',
  over_330: '#4c1d95',
};

const css = {
  card:    'hsl(var(--card))',
  cardFg:  'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))',
  muted:   'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg:      'hsl(var(--background))',
  fg:      'hsl(var(--foreground))',
};

const cardStyle: React.CSSProperties = {
  background:   css.card,
  borderRadius: 16,
  padding:      24,
  boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border:       `1px solid ${css.border}`,
};

const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

// ── Branch name normalizer ────────────────────────────────────────────────
// Strips common Arabic prefixes to produce a match key.
// Works for ANY company — no hardcoded names.
// "فرع الكريمية"            → "الكريمية"
// "مخزن صالة عرض الكريمية" → "الكريمية"
// "مخزن بنغازي"             → "بنغازي"
// "بنغازي"                  → "بنغازي"
const normalizeBranch = (name: string): string =>
  name
    .trim()
    .replace(/^مخزن صالة عرض\s*/g, '')
    .replace(/^صالة عرض\s*/g, '')
    .replace(/^مخزن\s*/g, '')
    .replace(/^فرع\s*/g, '')
    .trim();

// ── Custom Tooltip ────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const isRtl = /[\u0600-\u06FF]/.test(String(label));
  return (
    <div style={{
      background:   '#ffffff',
      border:       '1px solid #e5e7eb',
      borderRadius: 12,
      padding:      '12px 16px',
      boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
      fontSize:     12,
      minWidth:     220,
      maxWidth:     300,
    }}>
      <p style={{
        fontSize:      12,
        fontWeight:    700,
        color:         '#111827',
        paddingBottom: 8,
        borderBottom:  '1px solid #f3f4f6',
        direction:     isRtl ? 'rtl' : 'ltr',
        textAlign:     isRtl ? 'right' : 'left',
        wordBreak:     'break-word',
        whiteSpace:    'normal',
        margin:        0,
      }}>
        {label}
      </p>
      <div style={{ marginTop: 10 }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{
            display:    'flex',
            alignItems: 'center',
            gap:         8,
            marginTop:   i > 0 ? 8 : 0,
          }}>
            <span style={{
              width:        10,
              height:       10,
              borderRadius: 3,
              background:   p.fill ?? p.color,
              display:      'inline-block',
              flexShrink:   0,
            }} />
            <span style={{ color: '#6b7280', flex: 1 }}>{p.name}</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              {formatCurrency(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Loader / Empty ────────────────────────────────────────────────────────

function Loader({ label }: { label: string }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      height:          120,
      gap:             8,
      color:           css.mutedFg,
    }}>
      <Loader2 size={15} className="animate-spin" />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

function Empty() {
  return (
    <div style={{
      height:         120,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      color:           css.mutedFg,
      fontSize:        13,
    }}>
      No data available
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────

function KPI({
  title, value, icon: Icon, accent,
}: {
  title: string; value: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position:      'absolute',
        top:           -24,
        right:         -24,
        width:          80,
        height:         80,
        borderRadius:  '50%',
        background:     accent,
        opacity:        0.08,
        filter:        'blur(20px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:    16,
      }}>
        <div style={{
          width:          40,
          height:         40,
          borderRadius:   12,
          background:     `${accent}18`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Icon size={17} style={{ color: accent }} />
        </div>
        <ArrowUpRight size={13} style={{ color: C.emerald }} />
      </div>
      <p style={{
        fontSize:      11,
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color:          css.mutedFg,
      }}>
        {title}
      </p>
      <p style={{
        fontSize:      20,
        fontWeight:    800,
        color:          css.cardFg,
        marginTop:      4,
        letterSpacing: '-0.03em',
      }}>
        {value}
      </p>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────

function Panel({
  title, sub, children,
}: {
  title: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>
          {title}
        </h3>
        {sub && (
          <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{sub}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Aging Bar Chart ───────────────────────────────────────────────────────

function AgingBarChart({
  data,
}: {
  data: Array<{ label: string; total: number; fill: string }>;
}) {
  if (!data.length) return <Empty />;
  const chartData = data.map(d => ({ label: d.label, value: d.total, fill: d.fill }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: 0, bottom: 40 }}
        barCategoryGap="22%"
      >
        <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name="Amount" radius={[5, 5, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Category Bars ─────────────────────────────────────────────────────────

function CategoryBars({
  data,
}: {
  data: Array<{ category: string; value: number; fill: string }>;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: css.mutedFg, fontWeight: 500 }}>
              {d.category}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg }}>
              {formatCurrency(d.value)}
            </span>
          </div>
          <div style={{
            height:       6,
            borderRadius: 999,
            background:   css.muted,
            overflow:     'hidden',
          }}>
            <div style={{
              height:       '100%',
              borderRadius: 999,
              width:        `${(d.value / max) * 100}%`,
              background:   `linear-gradient(90deg, ${d.fill}70, ${d.fill})`,
              transition:   'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const kpi               = useKPIs();
  const summary           = useTransactionSummary();
  const agingDist         = useAgingDistribution();
  const agingRisk         = useAgingRisk({ limit: 5 });
  const categoryBreakdown = useCategoryBreakdown();
  const typeBreakdown     = useTypeBreakdown();
  const branchMonthly     = useBranchMonthly({ movement_type: MOVEMENT_TYPES.SALE });
  const branchStockSummary = useBranchSummary();
  const branchSales        = useBranchBreakdown({ movement_type: MOVEMENT_TYPES.SALE });

  const kpiData = kpi.data;

  const trendData = useMemo(() =>
    [...(summary.data?.summary ?? [])]
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(-12)
      .map(m => ({
        month:     m.month_label,
        sales:     m.total_sales,
        purchases: m.total_purchases,
      })),
    [summary.data]
  );

  const agingBars = useMemo(() =>
    (agingDist.data?.distribution ?? [])
      .filter(b => b.total > 0)
      .map(b => ({ ...b, fill: AGING_COLORS[b.bucket] ?? '#94a3b8' })),
    [agingDist.data]
  );

  // ── Branch Performance : fusion Transactions (sales) + Inventory (stock) ──
  //
  // PROBLÈME : les deux APIs peuvent retourner des noms différents
  // pour la même branche physique :
  //   Transactions → "فرع الكريمية"
  //   Inventory    → "مخزن صالة عرض الكريمية"
  //
  // SOLUTION : normaliser les deux noms → clé commune → fusionner
  // normalizeBranch() supprime les préfixes arabes courants.
  // Aucun nom hardcodé → fonctionne pour n'importe quelle société.
  const branchPerfData = useMemo(() => {
    const salesBranches = branchSales.data?.branches  ?? [];
    const stockBranches = branchStockSummary.data?.branches ?? [];

    if (!salesBranches.length && !stockBranches.length) return [];

    // ── Index ventes par clé normalisée ──────────────────────────────────
    // Si deux noms normalisent vers la même clé → additionner les totaux
    const salesMap = new Map<string, { displayName: string; total: number }>();
    for (const b of salesBranches) {
      const key = normalizeBranch(b.branch);
      if (!key) continue;
      const val = typeof b.total === 'number' ? b.total : parseFloat(String(b.total)) || 0;
      const existing = salesMap.get(key);
      if (existing) {
        existing.total += val;
      } else {
        salesMap.set(key, { displayName: b.branch, total: val });
      }
    }

    // ── Index stock par clé normalisée ────────────────────────────────────
    // Nom affiché = nom inventaire (source de vérité — plus descriptif)
    const stockMap = new Map<string, { displayName: string; total_value: number }>();
    for (const b of stockBranches) {
      const key = normalizeBranch(b.branch);
      if (!key) continue;
      const val = typeof b.total_value === 'number' ? b.total_value : parseFloat(String(b.total_value)) || 0;
      const existing = stockMap.get(key);
      if (existing) {
        existing.total_value += val;
      } else {
        stockMap.set(key, { displayName: b.branch, total_value: val });
      }
    }

    // ── Fusionner : union des deux sources ────────────────────────────────
    const allKeys = new Set([...salesMap.keys(), ...stockMap.keys()]);

    return Array.from(allKeys)
      .filter(k => k.length > 0)
      .map(k => {
        const s = salesMap.get(k);
        const t = stockMap.get(k);
        return {
          // Nom affiché : préférer inventaire (plus complet), sinon transactions
          branch: t?.displayName ?? s?.displayName ?? k,
          sales:  s?.total       ?? 0,
          stock:  t?.total_value ?? 0,
        };
      })
      .filter(b => b.sales > 0 || b.stock > 0)
      .sort((a, b) => (b.sales + b.stock) - (a.sales + a.stock));
  }, [branchSales.data, branchStockSummary.data]);

  const categoryData = useMemo(() =>
    (categoryBreakdown.data?.categories ?? [])
      .slice(0, 8)
      .map((c, i) => ({
        category: c.category,
        value:    c.total_value,
        fill:     BRANCH_COLORS[i % BRANCH_COLORS.length],
      })),
    [categoryBreakdown.data]
  );

  const totalPurchases = useMemo(() =>
    (typeBreakdown.data?.breakdown ?? [])
      .find(t => t.movement_type === MOVEMENT_TYPES.PURCHASE)?.total_in ?? 0,
    [typeBreakdown.data]
  );

  const legendStyle = {
    fontSize:   12,
    color:      'hsl(var(--muted-foreground))',
    paddingTop: 8,
  };

  const branchPerfLoading = branchSales.loading || branchStockSummary.loading;

  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize:      24,
          fontWeight:    800,
          color:          css.fg,
          letterSpacing: '-0.03em',
          margin:         0,
        }}>
          Dashboard Overview
        </h1>
        <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>
          Monitor your business performance and key metrics
        </p>
      </div>

      {/* ── KPIs ── */}
      {kpi.loading ? (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap:                  16,
          marginBottom:         24,
        }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              height:       110,
              borderRadius: 16,
              background:   css.muted,
              opacity:       0.5,
            }} />
          ))}
        </div>
      ) : (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap:                  16,
          marginBottom:         24,
        }}>
          <KPI title="Total Sales"         value={formatCurrency(kpiData?.totalSalesValue ?? 0)} icon={TrendingUp}   accent={C.indigo} />
          <KPI title="Total Purchases"     value={formatCurrency(totalPurchases)}                 icon={ShoppingCart} accent={C.amber}  />
          <KPI title="Current Stock Value" value={formatCurrency(kpiData?.stockValue ?? 0)}       icon={Package}      accent={C.cyan}   />
          <KPI title="Total Receivables"   value={formatCurrency(kpiData?.totalReceivables ?? 0)} icon={Wallet}       accent={C.violet} />
        </div>
      )}

      {/* ── Row 1: Sales Trend + Branch Performance ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                  16,
        marginBottom:         16,
      }}>

        {/* Sales vs Purchases */}
        <Panel title="Sales vs Purchases" sub="Monthly comparison — last 12 months">
          {summary.loading ? <Loader label="Loading…" /> :
           trendData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.indigo} stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.amber} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.amber} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="sales"
                  stroke={C.indigo} strokeWidth={2.5} fill="url(#gS)"
                  name="Sales" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="purchases"
                  stroke={C.amber} strokeWidth={2.5} fill="url(#gP)"
                  name="Purchases" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Branch Performance */}
        <Panel
          title="Branch Performance"
          sub={
            branchPerfLoading
              ? 'Loading…'
              : `Sales vs stock value · ${branchPerfData.length} branches`
          }
        >
          {branchPerfLoading ? <Loader label="Loading…" /> :
           branchPerfData.length === 0 ? <Empty /> : (() => {
            const indexed = branchPerfData.map((b, i) => ({ ...b, _idx: i + 1 }));
            return (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={indexed}
                    barCategoryGap="28%"
                    barGap={3}
                    margin={{ top: 4, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                    <XAxis
                      dataKey="_idx"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                    />
                    <YAxis
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as typeof indexed[number];
                        const isRtl = /[\u0600-\u06FF]/.test(row.branch);
                        return (
                          <div style={{
                            background:   '#ffffff',
                            border:       '1px solid #e5e7eb',
                            borderRadius: 12,
                            padding:      '12px 16px',
                            boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
                            fontSize:     12,
                            minWidth:     220,
                          }}>
                            <p style={{
                              fontWeight:    700,
                              color:         '#111827',
                              direction:     isRtl ? 'rtl' : 'ltr',
                              textAlign:     isRtl ? 'right' : 'left',
                              wordBreak:     'break-word',
                              whiteSpace:    'normal',
                              borderBottom:  '1px solid #f3f4f6',
                              paddingBottom: 8,
                              marginBottom:  8,
                              margin:        0,
                            }}>
                              {row._idx}. {row.branch}
                            </p>
                            {payload.map((p: any, i: number) => (
                              <div key={i} style={{
                                display:    'flex',
                                alignItems: 'center',
                                gap:         8,
                                marginTop:   i > 0 ? 6 : 10,
                              }}>
                                <span style={{
                                  width: 10, height: 10, borderRadius: 3,
                                  background: p.fill ?? p.color,
                                  display: 'inline-block', flexShrink: 0,
                                }} />
                                <span style={{ color: '#6b7280', flex: 1 }}>{p.name}</span>
                                <span style={{ fontWeight: 700, color: '#111827' }}>
                                  {formatCurrency(p.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="sales" fill={C.indigo} name="Sales"       radius={[4,4,0,0]} maxBarSize={22} />
                    <Bar dataKey="stock" fill={C.cyan}   name="Stock Value" radius={[4,4,0,0]} maxBarSize={22} fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Numbered legend — auto-adapts to any number of branches */}
                <div style={{
                  marginTop:  16,
                  paddingTop: 14,
                  borderTop:  `1px solid ${css.border}`,
                  display:    'flex',
                  flexWrap:   'wrap',
                  gap:        '6px 20px',
                }}>
                  {indexed.map(b => {
                    const isRtl = /[\u0600-\u06FF]/.test(b.branch);
                    return (
                      <div key={b._idx} style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:         6,
                        fontSize:   11,
                        color:       css.mutedFg,
                      }}>
                        <span style={{
                          fontWeight:  700,
                          color:        css.cardFg,
                          minWidth:     16,
                          textAlign:   'center',
                          background:  `${C.indigo}15`,
                          borderRadius: 6,
                          padding:     '1px 5px',
                          fontSize:     10,
                        }}>
                          {b._idx}
                        </span>
                        <span style={{
                          direction:    isRtl ? 'rtl' : 'ltr',
                          maxWidth:     180,
                          whiteSpace:   'nowrap',
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {b.branch}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </Panel>
      </div>

      {/* ── Row 2: Aging + Category ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                  16,
        marginBottom:         16,
      }}>
        <Panel title="Aging Receivables" sub="Outstanding balances by period">
          {agingDist.loading
            ? <Loader label="Loading…" />
            : <AgingBarChart data={agingBars} />}
        </Panel>

        <Panel title="Inventory by Category" sub="Stock value across product categories">
          {categoryBreakdown.loading ? <Loader label="Loading…" /> :
           categoryData.length === 0  ? <Empty /> :
           <CategoryBars data={categoryData} />}
        </Panel>
      </div>

      {/* ── Top Risky Customers ── */}
      <div style={{ marginBottom: 16 }}>
        <Panel title="Top Risky Customers" sub="Customers with highest overdue balances">
          {agingRisk.loading ? <Loader label="Loading…" /> :
           !agingRisk.data || agingRisk.data.top_risk.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {agingRisk.data.top_risk.map(item => {
                const pct    = item.total > 0
                  ? Math.min(100, (item.overdue_total / item.total) * 100)
                  : 0;
                const crit   = item.risk_score === 'critical' || item.risk_score === 'high';
                const accent = crit ? C.rose : C.amber;
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width:          36,
                      height:         36,
                      borderRadius:   10,
                      flexShrink:     0,
                      background:     `${accent}18`,
                      border:         `1px solid ${accent}35`,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                    }}>
                      <AlertTriangle size={15} style={{ color: accent }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display:        'flex',
                        justifyContent: 'space-between',
                        alignItems:     'center',
                        marginBottom:    6,
                      }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: 0 }}>
                            {item.customer_name || item.account}
                          </p>
                          <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>
                            {item.account_code}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: css.cardFg }}>
                            {formatCurrency(item.overdue_total)}
                          </span>
                          <span style={{
                            fontSize:      10,
                            fontWeight:    700,
                            padding:       '2px 8px',
                            borderRadius:  20,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background:    `${accent}18`,
                            color:          accent,
                            border:        `1px solid ${accent}35`,
                          }}>
                            {item.risk_score}
                          </span>
                        </div>
                      </div>
                      <div style={{
                        height:       5,
                        borderRadius: 999,
                        background:   css.muted,
                        overflow:     'hidden',
                      }}>
                        <div style={{
                          height:       '100%',
                          borderRadius: 999,
                          width:        `${pct}%`,
                          background:   `linear-gradient(90deg, ${accent}55, ${accent})`,
                          transition:   'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Revenue Trend by Branch ── */}
      <Panel
        title="Revenue Trend by Branch"
        sub="Monthly sales revenue — one line per branch"
      >
        {branchMonthly.loading ? <Loader label="Loading…" /> :
         !branchMonthly.data || branchMonthly.data.monthly_data.length === 0
           ? <Empty />
           : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={branchMonthly.data.monthly_data}
              margin={{ top: 10, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                {branchMonthly.data.branches.map((branch, i) => (
                  <linearGradient key={branch} id={`gb-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
              <XAxis dataKey="month"  tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              {branchMonthly.data.branches.map((branch, i) => (
                <Area
                  key={branch}
                  type="monotone"
                  dataKey={branch}
                  stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#gb-${i})`}
                  dot={false}
                  activeDot={{
                    r:           5,
                    strokeWidth: 0,
                    fill:        BRANCH_COLORS[i % BRANCH_COLORS.length],
                  }}
                  name={branch}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

    </div>
  );
}