import { useEffect, useMemo, useState } from 'react';
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
  useTransactionSummary,
  useAgingSnapshots,
  useAgingDistribution,
  useAgingRisk,
  useBranchSummary,
  useBranchBreakdown,
  useCategoryBreakdown,
  useBranchMonthly,
  MOVEMENT_TYPES,
  useTypeBreakdown,
} from '../lib/dataHooks';
import { notificationsApi } from '../lib/notificationsApi';
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
        fontSize:      12,
        fontWeight:    700,
        color:         css.cardFg,
        paddingBottom: 8,
        borderBottom:  `1px solid ${css.border}`,
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
            <span style={{ color: css.mutedFg, flex: 1 }}>{p.name}</span>
            <span style={{ fontWeight: 700, color: css.cardFg }}>
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
    <div style={{
      ...cardStyle,
      position:    'relative',
      overflow:    'hidden',
      borderTop:   `3px solid ${accent}`,
      paddingTop:  20,
      transition:  'box-shadow 0.2s, transform 0.2s',
    }}>
      {/* Background watermark circle */}
      <div style={{
        position:     'absolute',
        bottom:       -20,
        right:        -20,
        width:         90,
        height:        90,
        borderRadius: '50%',
        background:    accent,
        opacity:       0.06,
        pointerEvents:'none',
      }} />

      {/* Top row: icon + trend badge */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        marginBottom:   18,
      }}>
        <div style={{
          width:          38,
          height:         38,
          borderRadius:   11,
          background:     `${accent}15`,
          border:         `1px solid ${accent}25`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color: accent }} />
        </div>

        {/* Trend pill */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:           3,
          fontSize:      10,
          fontWeight:    700,
          color:          C.emerald,
          background:    `${C.emerald}12`,
          border:        `1px solid ${C.emerald}25`,
          padding:       '3px 8px',
          borderRadius:   20,
        }}>
          <ArrowUpRight size={10} />
          2.4%
        </div>
      </div>

      {/* Label */}
      <p style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color:          css.mutedFg,
        margin:         0,
      }}>
        {title}
      </p>

      {/* Value */}
      <p style={{
        fontSize:      22,
        fontWeight:    800,
        color:          css.cardFg,
        marginTop:      5,
        marginBottom:   16,
        letterSpacing: '-0.03em',
        lineHeight:     1,
      }}>
        {value}
      </p>

      {/* Mini progress bar */}
      <div style={{
        height:       3,
        borderRadius: 999,
        background:   css.muted,
        overflow:     'hidden',
      }}>
        <div style={{
          height:       '100%',
          borderRadius: 999,
          width:        '64%',
          background:   `linear-gradient(90deg, ${accent}60, ${accent})`,
        }} />
      </div>
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

// ── Gradient Bar shape (Aging chart) ─────────────────────────────────────
// Each bar gets its own top→bottom gradient derived from its fill color

function GradientBar(props: any) {
  const { x, y, width, height, fill, index } = props;
  if (!height || height <= 0) return null;
  const id = `aging-grad-${index}`;
  const r  = Math.min(5, width / 2);
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={fill} stopOpacity={1}   />
          <stop offset="100%" stopColor={fill} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <path
        d={`
          M${x + r},${y}
          h${width - 2 * r}
          a${r},${r} 0 0 1 ${r},${r}
          v${height - r}
          h${-width}
          v${-(height - r)}
          a${r},${r} 0 0 1 ${r},${-r}
          z
        `}
        fill={`url(#${id})`}
      />
    </g>
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
        margin={{ top: 8, right: 4, left: 0, bottom: 44 }}
        barCategoryGap="24%"
      >
        <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          angle={-40}
          textAnchor="end"
          interval={0}
          dy={4}
        />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          tickCount={5}
          width={36}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
        />
        <Bar dataKey="value" name="Amount" shape={<GradientBar />} isAnimationActive>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Rank number */}
            <span style={{
              fontSize:   9,
              fontWeight: 700,
              color:       d.fill,
              minWidth:    14,
              textAlign:  'right',
              opacity:     0.85,
              flexShrink:  0,
            }}>
              {i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'baseline',
                marginBottom:    5,
              }}>
                <span style={{
                  fontSize:     12,
                  color:         css.mutedFg,
                  fontWeight:    500,
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth:      160,
                }}>
                  {d.category}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: css.mutedFg, opacity: 0.6 }}>
                    {pct.toFixed(0)}%
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg }}>
                    {formatCurrency(d.value)}
                  </span>
                </div>
              </div>
              <div style={{
                height:       7,
                borderRadius: 999,
                background:   css.muted,
                overflow:     'hidden',
                boxShadow:    'inset 0 1px 2px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  height:       '100%',
                  borderRadius: 999,
                  width:        `${pct}%`,
                  background:   `linear-gradient(90deg, ${d.fill}65, ${d.fill})`,
                  transition:   'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  useEffect(() => {
    let mounted = true;

    notificationsApi.detect()
      .then(() => {
        if (mounted) {
          window.dispatchEvent(new Event('weeg-notifications-refresh'));
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const agingSnapshots = useAgingSnapshots();
  const [currentYearAgingSnapshotId, setCurrentYearAgingSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveSnapshotForYear = async () => {
      try {
        const snapshots = agingSnapshots.data?.items ?? [];
        const extractYear = (raw?: string | null): number | null => {
          if (!raw) return null;
          const date = new Date(raw);
          if (!Number.isNaN(date.getTime())) return date.getFullYear();
          const match = String(raw).match(/(19|20)\d{2}/);
          return match ? parseInt(match[0], 10) : null;
        };

        const candidates = snapshots.filter((snapshot) => {
          if (snapshot.aging_year === currentYear) return true;
          return extractYear(snapshot.report_date) === currentYear;
        });

        const sorted = candidates.sort((a, b) => (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? ''));
        const foundSnapshotId = sorted[0]?.id ?? null;

        if (mounted) setCurrentYearAgingSnapshotId(foundSnapshotId);
      } catch {
        if (mounted) setCurrentYearAgingSnapshotId(null);
      }
    };

    resolveSnapshotForYear();

    return () => {
      mounted = false;
    };
  }, [currentYear, agingSnapshots.data]);

  const summary = useTransactionSummary({
    year: currentYear,
    date_from: yearStart,
    date_to: yearEnd,
  });
  const agingDist = useAgingDistribution(
    currentYearAgingSnapshotId ? { snapshot_id: currentYearAgingSnapshotId } : null,
  );
  const agingRisk = useAgingRisk(
    currentYearAgingSnapshotId ? { snapshot_id: currentYearAgingSnapshotId, limit: 5 } : null,
  );
  const categoryBreakdown = useCategoryBreakdown();
  const typeBreakdown = useTypeBreakdown({ date_from: yearStart, date_to: yearEnd });
  const branchMonthly = useBranchMonthly({
    movement_type: MOVEMENT_TYPES.SALE,
    year: currentYear,
    date_from: yearStart,
    date_to: yearEnd,
  });
  const branchStockSummary = useBranchSummary();
  const branchSales = useBranchBreakdown({
    movement_type: MOVEMENT_TYPES.SALE,
    date_from: yearStart,
    date_to: yearEnd,
  });

  const trendData = useMemo(() =>
    [...(summary.data?.summary ?? [])]
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map(m => ({
        month:     m.month_label,
        sales:     m.total_sales,
        purchases: m.total_purchases,
      })),
    [summary.data]
  );

  const agingBars = useMemo(() =>
    currentYearAgingSnapshotId
      ? (agingDist.data?.distribution ?? [])
          .filter(b => b.total > 0)
          .map(b => ({ ...b, fill: AGING_COLORS[b.bucket] ?? '#94a3b8' }))
      : [],
    [agingDist.data, currentYearAgingSnapshotId]
  );

  const branchPerfData = useMemo(() => {
    const salesBranches = branchSales.data?.branches  ?? [];
    const stockBranches = branchStockSummary.data?.branches ?? [];

    if (!salesBranches.length && !stockBranches.length) return [];

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

    const allKeys = new Set([...salesMap.keys(), ...stockMap.keys()]);

    return Array.from(allKeys)
      .filter(k => k.length > 0)
      .map(k => {
        const s = salesMap.get(k);
        const t = stockMap.get(k);
        return {
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

  const topRiskCustomers = useMemo(
    () => (currentYearAgingSnapshotId ? (agingRisk.data?.top_risk ?? []) : []),
    [agingRisk.data, currentYearAgingSnapshotId],
  );

  const totalPurchases = useMemo(() =>
    (typeBreakdown.data?.breakdown ?? [])
      .find(t => t.movement_type === MOVEMENT_TYPES.PURCHASE)?.total_in ?? 0,
    [typeBreakdown.data]
  );

  const totalSales = useMemo(
    () => (summary.data?.summary ?? []).reduce((acc, row) => acc + (row.total_sales ?? 0), 0),
    [summary.data],
  );

  const currentStockValue = useMemo(
    () =>
      (branchStockSummary.data?.branches ?? []).reduce(
        (acc, row) => acc + (typeof row.total_value === 'number' ? row.total_value : 0),
        0,
      ),
    [branchStockSummary.data],
  );

  const totalReceivables = useMemo(
    () => agingBars.reduce((acc, b) => acc + (b.total ?? 0), 0),
    [agingBars],
  );

  const legendStyle = {
    fontSize:   12,
    color:      'hsl(var(--muted-foreground))',
    paddingTop: 8,
  };

  const branchPerfLoading = branchSales.loading || branchStockSummary.loading;
  const kpiLoading = summary.loading || typeBreakdown.loading || branchStockSummary.loading || agingDist.loading;

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
          Monitor your business performance and key metrics for {currentYear}
        </p>
      </div>

      {/* ── KPIs ── */}
      {kpiLoading ? (
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
          <KPI title="Total Sales"         value={formatCurrency(totalSales)}                     icon={TrendingUp}   accent={C.indigo} />
          <KPI title="Total Purchases"     value={formatCurrency(totalPurchases)}                 icon={ShoppingCart} accent={C.amber}  />
          <KPI title="Current Stock Value" value={formatCurrency(currentStockValue)}               icon={Package}      accent={C.cyan}   />
          <KPI title="Total Receivables"   value={formatCurrency(totalReceivables)}                icon={Wallet}       accent={C.violet} />
        </div>
      )}

      {/* ── Row 1: Sales Trend + Branch Performance ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                  16,
        marginBottom:         16,
      }}>

        {/* ── Sales vs Purchases ── */}
        <Panel title="Sales vs Purchases" sub={`Monthly comparison — ${currentYear}`}>
          {summary.loading ? <Loader label="Loading…" /> :
           trendData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {/* 3-stop gradients: rich fill at top, fades to transparent */}
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.indigo} stopOpacity={0.28} />
                    <stop offset="55%"  stopColor={C.indigo} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={C.indigo} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.amber} stopOpacity={0.28} />
                    <stop offset="55%"  stopColor={C.amber} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={C.amber} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                {/* Solid single-pixel grid line — cleaner than dashes */}
                <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  tickCount={5}
                  width={36}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 3' }}
                />
                <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={18} />
                {/* natural curve → smoother than monotone */}
                {/* activeDot: white center + colored ring */}
                <Area
                  type="natural"
                  dataKey="sales"
                  stroke={C.indigo}
                  strokeWidth={2.5}
                  fill="url(#gS)"
                  name="Sales"
                  dot={false}
                  activeDot={{ r: 5, fill: css.card, stroke: C.indigo, strokeWidth: 2.5 }}
                />
                <Area
                  type="natural"
                  dataKey="purchases"
                  stroke={C.amber}
                  strokeWidth={2.5}
                  fill="url(#gP)"
                  name="Purchases"
                  dot={false}
                  activeDot={{ r: 5, fill: css.card, stroke: C.amber, strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* ── Branch Performance ── */}
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
                    barCategoryGap="30%"
                    barGap={4}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <defs>
                      {/* Per-series top→bottom gradients */}
                      <linearGradient id="bSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.indigo} stopOpacity={1}    />
                        <stop offset="100%" stopColor={C.indigo} stopOpacity={0.55} />
                      </linearGradient>
                      <linearGradient id="bStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.cyan} stopOpacity={1}    />
                        <stop offset="100%" stopColor={C.cyan} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
                    <XAxis
                      dataKey="_idx"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                      dy={4}
                    />
                    <YAxis
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`}
                      tickCount={5}
                      width={36}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as typeof indexed[number];
                        const isRtl = /[\u0600-\u06FF]/.test(row.branch);
                        return (
                          <div style={{
                            background:   css.card,
                            border:       `1px solid ${css.border}`,
                            borderRadius: 12,
                            padding:      '12px 16px',
                            boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
                            fontSize:     12,
                            minWidth:     220,
                          }}>
                            <p style={{
                              fontWeight:    700,
                              color:         css.cardFg,
                              direction:     isRtl ? 'rtl' : 'ltr',
                              textAlign:     isRtl ? 'right' : 'left',
                              wordBreak:     'break-word',
                              whiteSpace:    'normal',
                              borderBottom:  `1px solid ${css.border}`,
                              paddingBottom: 8,
                              margin:        '0 0 8px',
                            }}>
                              {row._idx}. {row.branch}
                            </p>
                            {payload.map((p: any, i: number) => (
                              <div key={i} style={{
                                display:    'flex',
                                alignItems: 'center',
                                gap:         8,
                                marginTop:   i > 0 ? 6 : 0,
                              }}>
                                <span style={{
                                  width: 10, height: 10, borderRadius: 3,
                                  background: p.fill ?? p.color,
                                  display: 'inline-block', flexShrink: 0,
                                }} />
                                <span style={{ color: css.mutedFg, flex: 1 }}>{p.name}</span>
                                <span style={{ fontWeight: 700, color: css.cardFg }}>
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
                      iconType="plainline"
                      iconSize={18}
                    />
                    <Bar dataKey="sales" fill="url(#bSales)" name="Sales"       radius={[5, 5, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="stock" fill="url(#bStock)" name="Stock Value" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Numbered legend */}
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
           topRiskCustomers.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topRiskCustomers.map(item => {
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
        sub={`Monthly sales revenue (${currentYear}) — one line per branch`}
      >
        {branchMonthly.loading ? <Loader label="Loading…" /> :
         !branchMonthly.data || branchMonthly.data.monthly_data.length === 0
           ? <Empty />
           : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={branchMonthly.data.monthly_data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                {branchMonthly.data.branches.map((branch, i) => (
                  <linearGradient key={branch} id={`gb-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0.22} />
                    <stop offset="55%"  stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0.06} />
                    <stop offset="100%" stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="month"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                tickCount={5}
                width={36}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 3' }}
              />
              <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={18} />
              {branchMonthly.data.branches.map((branch, i) => (
                <Area
                  key={branch}
                  type="natural"
                  dataKey={branch}
                  stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#gb-${i})`}
                  dot={false}
                  activeDot={{
                    r:           5,
                    fill:        css.card,
                    stroke:      BRANCH_COLORS[i % BRANCH_COLORS.length],
                    strokeWidth: 2,
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