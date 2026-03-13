// src/app/components/CreditKPISection.tsx
// Design unified with DashboardPage — zero functional changes

import { useState, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Users, TrendingDown, AlertCircle, Clock,
  RefreshCw, Loader2, ShieldAlert, CreditCard,
  BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
  DollarSign, Wallet, Receipt, AlertTriangle, UserCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ── Gradient Bar shape (identical to DashboardPage AgingBarChart) ─────────────
function GradientBar(props: any) {
  const { x, y, width, height, fill, index } = props;
  if (!height || height <= 0) return null;
  const id = `bucket-grad-${index}`;
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
import { api } from '../lib/api';
import { formatCurrency, formatNumber } from '../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreditKPIItem {
  value: number;
  label: string;
  unit: string;
  description: string;
  numerator?: number;
  denominator?: number;
  ca_credit?: number;
  ca_total?: number;
  overdue_amount?: number;
  total_receivables?: number;
  recovered_amount?: number;
  total_credit?: number;
}

interface RiskyCustomer {
  id: string;
  account: string;
  account_code: string;
  customer_name: string;
  total: number;
  current: number;
  overdue_total: number;
  risk_score: 'low' | 'medium' | 'high' | 'critical';
  overdue_percentage: number;
  dmp_days: number;
  buckets: Record<string, number>;
}

interface BucketItem {
  bucket: string;
  label: string;
  amount: number;
  percentage: number;
  midpoint_days: number;
}

interface CreditKPIData {
  report_date: string | null;
  kpis: {
    taux_clients_credit: CreditKPIItem;
    taux_credit_total:   CreditKPIItem;
    taux_impayes:        CreditKPIItem;
    dmp:                 CreditKPIItem;
    taux_recouvrement:   CreditKPIItem;
  };
  top5_risky_customers: RiskyCustomer[];
  bucket_distribution:  BucketItem[];
  summary: {
    total_customers:         number;
    credit_customers:        number;
    grand_total_receivables: number;
    overdue_amount:          number;
    ca_credit:               number;
    ca_total:                number;
  };
}

// ── English overrides for KPI metadata ───────────────────────────────────────

const KPI_EN: Record<string, { label: string; description: string; unit: string }> = {
  taux_clients_credit: {
    label:       'Credit Customer Rate',
    description: 'Share of customers with an active credit balance',
    unit:        '%',
  },
  taux_credit_total: {
    label:       'Total Credit Rate',
    description: 'Share of revenue realized on credit terms',
    unit:        '%',
  },
  taux_impayes: {
    label:       'Overdue Rate',
    description: 'Overdue receivables as a percentage of total receivables',
    unit:        '%',
  },
  dmp: {
    label:       'DSO (Avg. Payment Days)',
    description: 'Average number of days customers take to pay',
    unit:        'days',
  },
  taux_recouvrement: {
    label:       'Collection Rate',
    description: 'Percentage of credit sales successfully collected',
    unit:        '%',
  },
};

function normalizeBucketLabel(raw: string): string {
  return raw
    .replace(/\s*يوم/g, 'd')
    .replace(/\s*[Jj](?=\b|$)/g, 'd')
    .replace(/أكثر من\s*/i, '>')
    .trim();
}

// ── Brand palette (identical to DashboardPage) ────────────────────────────────
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

// ── CSS variable helpers (identical to DashboardPage) ─────────────────────────
const css = {
  card:    'hsl(var(--card))',
  cardFg:  'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))',
  muted:   'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg:      'hsl(var(--background))',
  fg:      'hsl(var(--foreground))',
};

// ── Shared card style (identical to DashboardPage) ────────────────────────────
const cardStyle: React.CSSProperties = {
  background:   css.card,
  borderRadius: 16,
  padding:      24,
  boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border:       `1px solid ${css.border}`,
};

const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK_CONFIG: Record<string, { label: string; accent: string }> = {
  low:      { label: 'Low',      accent: C.emerald },
  medium:   { label: 'Medium',   accent: C.amber   },
  high:     { label: 'High',     accent: C.orange  },
  critical: { label: 'Critical', accent: C.rose    },
};

const BUCKET_COLORS = [
  '#10b981','#34d399','#fbbf24','#f59e0b',
  '#f97316','#ef4444','#dc2626','#b91c1c',
  '#991b1b','#7f1d1d','#6b21a8','#581c87','#3b0764',
];

// ── Custom Tooltip (identical to DashboardPage CustomTooltip) ────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const pct = payload[0]?.payload?.percentage;
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
        fontSize:      12,
        fontWeight:    700,
        color:         css.cardFg,
        paddingBottom: 8,
        borderBottom:  `1px solid ${css.border}`,
        margin:        '0 0 8px',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: payload[0].fill, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: css.mutedFg, flex: 1 }}>Amount</span>
        <span style={{ fontWeight: 700, color: css.cardFg }}>
          {formatCurrency(payload[0].value)}{pct != null ? ` (${pct.toFixed(1)}%)` : ''}
        </span>
      </div>
    </div>
  );
}

// ── Loader / Empty (same as DashboardPage) ────────────────────────────────────
function Loader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 8, color: css.mutedFg }}>
      <Loader2 size={15} className="animate-spin" />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 13 }}>
      No data available
    </div>
  );
}

// ── Panel wrapper (same as DashboardPage) ─────────────────────────────────────
function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>{title}</h3>
        {sub && <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Summary KPI card (matches DashboardPage KPI card style) ───────────────────
function SummaryCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string;
  icon: LucideIcon; accent: string;
}) {
  return (
    <div style={{
      ...cardStyle,
      position:    'relative',
      overflow:    'hidden',
      borderTop:   `3px solid ${accent}`,
      paddingTop:  20,
      padding:     '20px 16px 16px',
    }}>
      {/* Background watermark */}
      <div style={{
        position:     'absolute', bottom: -20, right: -20,
        width: 90, height: 90, borderRadius: '50%',
        background: accent, opacity: 0.06, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: `${accent}15`, border: `1px solid ${accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>

      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 800, color: css.cardFg, marginTop: 5, marginBottom: sub ? 2 : 14, letterSpacing: '-0.03em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 10, color: css.mutedFg, margin: '0 0 12px' }}>{sub}</p>}

      {/* Mini progress bar */}
      <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: '64%', background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
      </div>
    </div>
  );
}

// ── KPI Metric Card (redesigned to match DashboardPage KPI style) ─────────────
function KPIMetricCard({
  kpi, kpiKey, icon: Icon, accent, isGood, subline,
}: {
  kpi: CreditKPIItem;
  kpiKey: string;
  icon: LucideIcon;
  accent: string;
  isGood?: (v: number) => boolean;
  subline?: React.ReactNode;
}) {
  const en          = KPI_EN[kpiKey] ?? { label: kpi.label, description: kpi.description, unit: kpi.unit };
  const good        = isGood ? isGood(kpi.value) : true;
  const TrendIcon   = good ? ArrowUpRight : ArrowDownRight;
  const trendAccent = good ? C.emerald : C.rose;
  const displayVal  = en.unit === 'days' ? kpi.value.toFixed(0) : kpi.value.toFixed(1);

  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${accent}` }}>
      {/* Background watermark */}
      <div style={{
        position: 'absolute', bottom: -20, right: -20,
        width: 90, height: 90, borderRadius: '50%',
        background: accent, opacity: 0.06, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: `${accent}15`, border: `1px solid ${accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: `${trendAccent}12`, color: trendAccent,
          border: `1px solid ${trendAccent}25`,
        }}>
          <TrendIcon size={10} />
          {good ? 'Good' : 'Alert'}
        </span>
      </div>

      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>
        {en.label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '5px 0 4px' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: css.cardFg, letterSpacing: '-0.03em' }}>{displayVal}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: accent }}>{en.unit}</span>
      </div>
      <p style={{ fontSize: 12, color: css.mutedFg, lineHeight: 1.5, margin: '0 0 4px' }}>
        {en.description}
      </p>

      {subline && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${css.border}` }}>
          {subline}
        </div>
      )}

      {/* Mini progress bar */}
      <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden', marginTop: 14 }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(100, kpi.value)}%`, background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
      </div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({
  loading = false, onRefresh, reportDate,
}: {
  loading?: boolean; onRefresh: () => void; reportDate?: string | null;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, background: `${C.indigo}15`,
            border: `1px solid ${C.indigo}25`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CreditCard size={18} style={{ color: C.indigo }} />
          </span>
          Customer &amp; Credit KPIs
        </h1>
        <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          Credit risk analysis and customer payment behavior
          {reportDate && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
              background: `${C.indigo}12`, color: C.indigo, border: `1px solid ${C.indigo}25`,
            }}>
              Report: {reportDate}
            </span>
          )}
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'transparent', border: `1px solid ${css.border}`,
          color: css.mutedFg, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Refresh
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CreditKPISection() {
  const [data, setData]       = useState<CreditKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CreditKPIData>('/kpi/credit/');
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load credit KPIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading skeleton (matches DashboardPage skeleton style) ──
  if (loading) {
    return (
      <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>
        <SectionHeader loading onRefresh={fetchData} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 110, borderRadius: 16, background: css.muted, opacity: 0.5 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 170, borderRadius: 16, background: css.muted, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>
        <SectionHeader onRefresh={fetchData} />
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 48 }}>
          <AlertCircle size={36} style={{ color: C.rose }} />
          <p style={{ fontSize: 14, color: C.rose, fontWeight: 600 }}>{error || 'No data available'}</p>
          <button
            onClick={fetchData}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'transparent', border: `1px solid ${css.border}`,
              color: css.mutedFg, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpis, top5_risky_customers, bucket_distribution, summary } = data;

  const chartData = [...bucket_distribution]
    .sort((a, b) => (a.midpoint_days ?? 0) - (b.midpoint_days ?? 0))
    .map((b, i) => ({
      name:       normalizeBucketLabel(b.label),
      amount:     b.amount,
      percentage: b.percentage,
      fill:       BUCKET_COLORS[i % BUCKET_COLORS.length],
    }))
    .filter(b => b.amount > 0);

  const pctActive = summary.total_customers > 0
    ? ((summary.credit_customers / summary.total_customers) * 100).toFixed(1)
    : '0';

  const summaryCards: { label: string; value: string; sub?: string; icon: LucideIcon; accent: string }[] = [
    { label: 'Total Accounts',    value: formatNumber(summary.total_customers),                              sub: 'All accounts in imported file',        icon: Users,         accent: C.indigo  },
    { label: 'Active Clients',    value: formatNumber(summary.credit_customers),                             sub: `${pctActive}% of total · balance > 0`, icon: UserCheck,     accent: C.emerald },
    { label: 'Total Receivables', value: formatCurrency(summary.grand_total_receivables),                    icon: BarChart3,      accent: C.cyan    },
    { label: 'Overdue >60d',      value: formatCurrency(summary.overdue_amount),                             icon: AlertTriangle,  accent: C.amber   },
    { label: 'Credit Revenue',    value: formatCurrency(summary.ca_total - summary.grand_total_receivables), icon: TrendingUp,     accent: C.emerald },
    { label: 'Total Revenue',     value: formatCurrency(summary.ca_total),                                   icon: DollarSign,     accent: C.orange  },
  ];

  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>

      <SectionHeader onRefresh={fetchData} reportDate={data.report_date} />

      {/* ── Summary ribbon (6 KPI cards matching DashboardPage style) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 16, marginBottom: 24 }}>
        {summaryCards.map((card, i) => <SummaryCard key={i} {...card} />)}
      </div>

      {/* ── 5 KPI Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>

        <KPIMetricCard
          kpi={kpis.taux_clients_credit}
          kpiKey="taux_clients_credit"
          icon={Users}
          accent={C.indigo}
          isGood={v => v >= 50}
          subline={
            <p style={{ fontSize: 12, color: css.mutedFg, margin: 0 }}>
              <span style={{ fontWeight: 700, color: C.emerald }}>{formatNumber(summary.credit_customers)}</span>
              {' '}active of{' '}
              <span style={{ fontWeight: 600, color: css.cardFg }}>{formatNumber(summary.total_customers)}</span>
              {' '}total accounts
            </p>
          }
        />

        <KPIMetricCard
          kpi={kpis.taux_credit_total}
          kpiKey="taux_credit_total"
          icon={CreditCard}
          accent={C.violet}
          isGood={v => v <= 85}
          subline={
            <p style={{ fontSize: 12, color: css.mutedFg, margin: 0 }}>
              <span style={{ fontWeight: 700, color: C.violet }}>{formatCurrency(summary.ca_total - summary.grand_total_receivables)}</span>
              {' '}<span style={{ opacity: 0.6 }}>of</span>{' '}
              <span style={{ fontWeight: 600, color: css.cardFg }}>{formatCurrency(kpis.taux_credit_total.ca_total ?? 0)}</span>
            </p>
          }
        />

        <KPIMetricCard
          kpi={kpis.taux_impayes}
          kpiKey="taux_impayes"
          icon={TrendingDown}
          accent={C.rose}
          isGood={v => v <= 20}
          subline={
            <p style={{ fontSize: 12, color: css.mutedFg, margin: 0 }}>
              <span style={{ fontWeight: 700, color: C.rose }}>{formatCurrency(kpis.taux_impayes.overdue_amount ?? 0)}</span>
              {' '}<span style={{ opacity: 0.6 }}>of</span>{' '}
              <span style={{ fontWeight: 600, color: css.cardFg }}>{formatCurrency(kpis.taux_impayes.total_receivables ?? 0)}</span>
            </p>
          }
        />

        <KPIMetricCard
          kpi={kpis.dmp}
          kpiKey="dmp"
          icon={Clock}
          accent={C.amber}
          isGood={v => v <= 90}
          subline={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[
                { range: '< 30d',  accent: C.emerald, match: kpis.dmp.value < 30 },
                { range: '30–90d', accent: C.amber,   match: kpis.dmp.value >= 30 && kpis.dmp.value <= 90 },
                { range: '> 90d',  accent: C.rose,    match: kpis.dmp.value > 90 },
              ].map(s => (
                <span key={s.range} style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: s.match ? `${s.accent}12` : css.muted,
                  color: s.match ? s.accent : css.mutedFg,
                  border: `1px solid ${s.match ? s.accent + '25' : 'transparent'}`,
                }}>
                  {s.range}
                </span>
              ))}
            </div>
          }
        />

        <KPIMetricCard
          kpi={kpis.taux_recouvrement}
          kpiKey="taux_recouvrement"
          icon={BarChart3}
          accent={C.emerald}
          isGood={v => v >= 70}
          subline={
            <p style={{ fontSize: 12, color: css.mutedFg, margin: 0 }}>
              <span style={{ fontWeight: 700, color: C.emerald }}>{formatCurrency(kpis.taux_recouvrement.recovered_amount ?? 0)}</span>
              {' '}<span style={{ opacity: 0.6 }}>recovered of</span>{' '}
              <span style={{ fontWeight: 600, color: css.cardFg }}>{formatCurrency(kpis.taux_recouvrement.total_credit ?? 0)}</span>
            </p>
          }
        />

        {/* Reference thresholds card — styled as a Panel */}
        <div style={{ ...cardStyle, borderTop: `3px solid ${css.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: css.muted, border: `1px solid ${css.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Receipt size={15} style={{ color: css.mutedFg }} />
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>
              Reference Thresholds
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total credit rate', threshold: '< 85%',  accent: C.violet  },
              { label: 'Overdue rate',       threshold: '< 20%',  accent: C.rose    },
              { label: 'DSO',                threshold: '< 30d',  accent: C.amber   },
              { label: 'Collection rate',    threshold: '> 70%',  accent: C.emerald },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: css.mutedFg }}>{t.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg }}>{t.threshold}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: css.mutedFg, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${css.border}` }}>
            As of {data.report_date || 'latest'}
          </p>
        </div>
      </div>

      {/* ── Bucket Distribution Chart (identical structure to DashboardPage AgingBarChart) ── */}
      <Panel
        title="Receivables Breakdown by Age Bucket"
        sub={`Amounts distributed by aging period (LYD) · ${formatNumber(summary.credit_customers)} active / ${formatNumber(summary.total_customers)} total accounts`}
      >
        {chartData.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 4, left: 0, bottom: 44 }}
              barCategoryGap="24%"
            >
              <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="name"
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
              <Bar dataKey="amount" name="Amount" shape={<GradientBar />} isAnimationActive>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* ── Top 5 At-Risk Customers (wrapped in Panel) ── */}
      <div style={{ marginTop: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={16} style={{ color: C.rose }} />
                Top 5 At-Risk Customers
              </h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>
                Customers with the highest receivables, ranked by risk level
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
                <span key={key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                  background: `${cfg.accent}12`, color: cfg.accent, border: `1px solid ${cfg.accent}25`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.accent }} />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>

          {top5_risky_customers.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top5_risky_customers.map((customer, index) => {
                const cfg        = RISK_CONFIG[customer.risk_score] ?? RISK_CONFIG.medium;
                const rankAccent = index === 0 ? C.rose : index === 1 ? C.orange : css.mutedFg;
                return (
                  <div key={customer.id} style={{ padding: 16, borderRadius: 12, border: `1px solid ${css.border}` }}>
                    {/* top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${rankAccent}12`, border: `1px solid ${rankAccent}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: rankAccent,
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {customer.customer_name || customer.account_code}
                        </p>
                        <p style={{ fontSize: 11, color: css.mutedFg, fontFamily: 'monospace', margin: 0 }}>#{customer.account_code}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: C.rose, margin: 0 }}>{formatCurrency(customer.total)}</p>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: `${cfg.accent}12`, color: cfg.accent, border: `1px solid ${cfg.accent}25`,
                          textTransform: 'uppercase',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.accent }} />
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* stat chips */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                      {[
                        { label: 'Current', value: formatCurrency(customer.current),       accent: C.emerald },
                        { label: 'Overdue', value: formatCurrency(customer.overdue_total),  accent: C.rose    },
                        {
                          label: 'DSO',
                          value: `${customer.dmp_days.toFixed(0)} days`,
                          accent: customer.dmp_days > 90 ? C.rose : customer.dmp_days > 30 ? C.amber : C.emerald,
                        },
                      ].map(stat => (
                        <div key={stat.label} style={{
                          padding: 8, borderRadius: 8, textAlign: 'center',
                          background: `${stat.accent}08`, border: `1px solid ${stat.accent}20`,
                        }}>
                          <p style={{ fontSize: 10, color: css.mutedFg, margin: '0 0 2px' }}>{stat.label}</p>
                          <p style={{ fontSize: 12, fontWeight: 800, color: stat.accent, margin: 0 }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* progress bar */}
                    <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        width: `${Math.min(100, customer.overdue_percentage)}%`,
                        background: `linear-gradient(90deg, ${cfg.accent}55, ${cfg.accent})`,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 10, color: css.mutedFg }}>
                        Overdue: <span style={{ fontWeight: 700, color: C.rose }}>{customer.overdue_percentage.toFixed(1)}%</span>
                      </span>
                      <span style={{ fontSize: 10, color: css.mutedFg }}>
                        Current: <span style={{ fontWeight: 700, color: C.emerald }}>{(100 - customer.overdue_percentage).toFixed(1)}%</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}