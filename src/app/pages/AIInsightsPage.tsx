/**
 * AIInsightsPage.tsx — Redesigned to match DashboardPage aesthetic
 *
 * Design system extracted from DashboardPage:
 *  - cardStyle: borderRadius 16, boxShadow, border, background css vars
 *  - Brand palette: indigo, violet, cyan, teal, emerald, amber, orange, rose
 *  - Typography: uppercase labels 10px/700, values 22px/800, body 13px
 *  - Accent top-border on KPI cards (3px solid)
 *  - CSS variable colors: hsl(var(--card)), hsl(var(--muted-foreground)), etc.
 *  - Panel component with title + sub header
 *  - Gradient fills on bars and lines
 */

import {
  Sparkles, TrendingUp, AlertTriangle, Package, Users, Zap,
  BarChart3, ShieldAlert, Brain, ArrowUpRight, ArrowDownRight,
  Minus, RefreshCw, Clock, ChevronDown, ChevronRight, Target,
  AlertCircle, TrendingDown, CheckCircle2, XCircle, Flame,
  Calendar, DollarSign, GitMerge, Building2, Layers, Filter,
  Activity, Eye,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import {
  aiInsightsApi,
  type CriticalDetectionResult, type CriticalSituation,
  type KPIResult, type KPIValue,
  type AnomalyResult, type Anomaly,
  type SeasonalResult,
  type ChurnResult, type ChurnPrediction,
  type StockResult, type StockItem,
  type PredictorResult,
  type Severity, type Confidence, type TrafficLight,
} from '../lib/aiInsightsApi';
import { formatCurrency } from '../lib/utils';
import { AIChat } from '../components/AIChat';
import type { SeasonalResultV3 } from '@/app/lib/aiInsightsApi';
// ─────────────────────────────────────────────────────────────────────────────
// Design system — mirrors DashboardPage exactly
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  cyan:    '#0ea5e9',
  teal:    '#14b8a6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  orange:  '#f97316',
  rose:    '#f43f5e',
  red:     '#ef4444',
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

// ─────────────────────────────────────────────────────────────────────────────
// Extended types for branch-aware stock
// ─────────────────────────────────────────────────────────────────────────────

export interface BranchStockItem extends StockItem {
  branch_id?: string;
  sibling_branches?: Array<{
    branch_name: string; current_stock: number;
    urgency: 'immediate' | 'soon' | 'watch' | 'ok';
  }>;
  transfer_suggestion?: { from_branch: string; qty: number; rationale: string; };
}
export interface BranchStockResult extends StockResult {
  branches: string[];
  branch_summaries?: Record<string, { total_items: number; immediate_reorders: number; soon_reorders: number; total_stock_value: number; }>;
  items: BranchStockItem[];
  snapshot_date?: string;
  validation?: { passed: boolean; total_qty: number; branches_found: number; warnings: string[]; };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic async hook
// ─────────────────────────────────────────────────────────────────────────────

function useAnalyzer<T>(fetchFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetchFn();
      if (mounted.current) { setData(res); setLoadedAt(new Date()); }
    } catch (e: any) {
      if (mounted.current) setError(e.message ?? 'Error loading data');
    } finally {
      if (mounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true; load();
    return () => { mounted.current = false; };
  }, [load]);

  return { data, loading, error, loadedAt, reload: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI atoms — Dashboard style
// ─────────────────────────────────────────────────────────────────────────────

function Panel({ title, sub, accent, icon: Icon, children, onRefresh, loading, loadedAt }: {
  title: string; sub?: string; accent?: string; icon?: React.ElementType;
  children: React.ReactNode; onRefresh?: () => void; loading?: boolean; loadedAt?: Date | null;
}) {
  return (
    <div style={{ ...cardStyle, ...(accent ? { borderTop: `3px solid ${accent}` } : {}) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {Icon && <Icon size={15} style={{ color: accent ?? css.mutedFg }} />}
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>{title}</h3>
            {/* AI badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10,
              fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', letterSpacing: '0.04em',
            }}>
              <Sparkles size={9} />AI
            </span>
          </div>
          {sub && <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{sub}</p>}
          {loadedAt && (
            <p style={{ fontSize: 10, color: css.mutedFg, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />{loadedAt.toLocaleTimeString()}
            </p>
          )}
        </div>
        {onRefresh && (
          <button onClick={onRefresh} disabled={loading} style={{
            background: 'none', border: `1px solid ${css.border}`, borderRadius: 8,
            padding: '5px 8px', cursor: 'pointer', color: css.mutedFg, display: 'flex', alignItems: 'center',
          }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string | number; sub?: string; accent: string; icon: React.ElementType;
}) {
  return (
    <div style={{
      ...cardStyle, position: 'relative', overflow: 'hidden',
      borderTop: `3px solid ${accent}`, paddingTop: 20,
    }}>
      <div style={{
        position: 'absolute', bottom: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: accent, opacity: 0.06, pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${accent}15`,
          border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, color: css.cardFg, marginTop: 5, marginBottom: sub ? 4 : 12, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: css.mutedFg, marginBottom: 12 }}>{sub}</p>}
      <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: '64%', background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, [string, string]> = {
    critical: [C.rose, '#fff0f3'],
    high:     [C.orange, '#fff7ed'],
    medium:   [C.amber, '#fffbeb'],
    low:      [C.emerald, '#f0fdf4'],
  };
  const [color, bg] = map[severity] ?? [css.mutedFg, css.muted];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 20, color, background: bg,
      border: `1px solid ${color}30`,
    }}>
      {severity}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const c = { green: C.emerald, amber: C.amber, red: C.rose };
  return <span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', background: c[status as keyof typeof c] ?? '#94a3b8', flexShrink: 0 }} />;
}

function ConfidencePill({ confidence }: { confidence: string }) {
  const map: Record<string, string> = { high: C.emerald, medium: C.amber, low: C.rose };
  const color = map[confidence] ?? css.mutedFg;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {confidence} confidence
    </span>
  );
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: 16, borderRadius: 12, border: `1px solid ${css.border}`, animation: 'pulse 2s infinite' }}>
          <div style={{ height: 14, width: '60%', background: css.muted, borderRadius: 6, marginBottom: 10 }} />
          <div style={{ height: 11, width: '90%', background: css.muted, borderRadius: 6, marginBottom: 6 }} />
          <div style={{ height: 11, width: '75%', background: css.muted, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <XCircle size={36} style={{ color: C.rose, margin: '0 auto 12px' }} />
      <p style={{ fontSize: 13, color: css.mutedFg, maxWidth: 280, margin: '0 auto 16px' }}>{message}</p>
      <button onClick={onRetry} style={{
        padding: '8px 20px', borderRadius: 10, border: `1px solid ${css.border}`,
        background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer',
      }}>Retry</button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: css.mutedFg }}>
      <CheckCircle2 size={32} style={{ color: C.emerald, margin: '0 auto 10px', opacity: 0.6 }} />
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}

const tooltipStyle = {
  background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
  borderRadius: 10, fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab navigation — styled like Dashboard
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'critical', label: 'Risk Briefing', icon: ShieldAlert, accent: C.rose },
  { key: 'kpis',     label: 'KPIs',          icon: BarChart3,   accent: C.indigo },
  { key: 'anomalies',label: 'Anomalies',      icon: Zap,         accent: C.amber },
  { key: 'seasonal', label: 'Seasonal',       icon: Calendar,    accent: C.teal },
  { key: 'churn',    label: 'Churn',          icon: Users,       accent: C.violet },
  { key: 'stock',    label: 'Stock',          icon: Package,     accent: C.cyan },
  { key: 'forecast', label: 'Forecast',       icon: Brain,       accent: C.emerald },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Critical Executive Briefing
// ─────────────────────────────────────────────────────────────────────────────

function CriticalSection() {
  const { data, loading, error, loadedAt, reload } = useAnalyzer(() => aiInsightsApi.critical(), []);

  const riskAccent: Record<string, string> = {
    critical: C.rose, high: C.orange, medium: C.amber, low: C.emerald,
  };

  return (
    <Panel icon={ShieldAlert} title="Executive Risk Briefing" accent={riskAccent[data?.risk_level ?? 'low']}
      sub="Cross-module critical situation aggregator — refreshes every 30 min"
      loadedAt={loadedAt} loading={loading} onRefresh={reload}>
      {loading && <LoadingSkeleton rows={2} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Risk overview banner */}
          <div style={{
            padding: 20, borderRadius: 14,
            background: `${riskAccent[data.risk_level]}10`,
            border: `1px solid ${riskAccent[data.risk_level]}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${riskAccent[data.risk_level]}, ${riskAccent[data.risk_level]}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Flame size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <SeverityBadge severity={data.risk_level} />
                  <span style={{ fontSize: 12, color: css.mutedFg }}>
                    {data.critical_count} critical · {data.total_situations} total situations
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.rose }}>
                    {formatCurrency(data.total_exposure_lyd)} at risk
                  </span>
                </div>
                <p style={{ fontSize: 13, color: css.cardFg, lineHeight: 1.6, margin: 0 }}>
                  {data.executive_briefing}
                </p>
                <div style={{ marginTop: 10 }}>
                  <ConfidencePill confidence={data.confidence} />
                </div>
              </div>
            </div>
          </div>

          {/* Situations list */}
          {data.situations.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, marginBottom: 12 }}>
                Situations ranked by risk × exposure
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.situations.map((s, i) => <SituationRow key={i} situation={s} rank={i + 1} />)}
              </div>
            </div>
          )}

          {/* Causal clusters */}
          {data.causal_clusters?.length > 0 && (
            <div style={{
              padding: 16, borderRadius: 12,
              background: `${C.violet}08`, border: `1px solid ${C.violet}25`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.violet, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={13} />Causal analysis — linked root causes
              </p>
              {data.causal_clusters.map((cluster, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 10, background: css.card, border: `1px solid ${css.border}`, marginBottom: i < data.causal_clusters.length - 1 ? 10 : 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.violet, marginBottom: 4 }}>{cluster.cluster_name}</p>
                  <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 10 }}>{cluster.common_cause}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {cluster.situations.map((s, j) => (
                      <span key={j} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${C.violet}15`, color: C.violet }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, background: `${C.violet}08` }}>
                    <Target size={13} style={{ color: C.violet, flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: C.violet, margin: 0 }}>{cluster.unified_action}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action plan */}
          {data.grouped_actions && <GroupedActionsPanel actions={data.grouped_actions} />}
        </div>
      )}
    </Panel>
  );
}

function SituationRow({ situation: s, rank }: { situation: CriticalSituation; rank: number }) {
  const [open, setOpen] = useState(false);
  const sourceIcon: Record<string, React.ElementType> = {
    churn: Users, anomaly: Zap, aging: AlertTriangle, stock: Package, kpi: BarChart3,
  };
  const Icon = sourceIcon[s.source] ?? AlertCircle;
  const entityName = s.customer_name || s.account_name || s.product_name;
  const accent = s.severity === 'critical' ? C.rose : s.severity === 'high' ? C.orange : C.amber;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${css.border}`, background: css.card, borderLeft: `4px solid ${accent}` }}>
      <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 11, fontWeight: 700, color: css.mutedFg, minWidth: 20 }}>#{rank}</span>
        <Icon size={15} style={{ color: css.mutedFg, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
          {entityName && <p style={{ fontSize: 11, color: C.indigo, margin: 0, fontWeight: 600 }}>{entityName}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <SeverityBadge severity={s.severity} />
          <span style={{ fontSize: 12, color: css.mutedFg }}>{formatCurrency(s.financial_exposure_lyd)}</span>
          {open ? <ChevronDown size={15} style={{ color: css.mutedFg }} /> : <ChevronRight size={15} style={{ color: css.mutedFg }} />}
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${css.border}`, paddingTop: 14 }}>
          <p style={{ fontSize: 13, color: css.mutedFg, marginBottom: 12 }}>{s.summary}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <DollarSign size={12} style={{ color: C.rose }} />
              <strong>Exposure:</strong> {formatCurrency(s.financial_exposure_lyd)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={12} style={{ color: C.orange }} />
              <strong>Act within:</strong> {s.urgency_hours}h
            </span>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: `${C.indigo}08`, border: `1px solid ${C.indigo}20` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>Recommended action</p>
            <p style={{ fontSize: 12, color: C.indigo, margin: 0 }}>{s.recommended_action}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupedActionsPanel({ actions }: { actions: CriticalDetectionResult['grouped_actions'] }) {
  const groups = [
    { key: 'act_within_24h' as const, label: 'Act within 24h', color: C.rose,   icon: Zap },
    { key: 'act_this_week'  as const, label: 'Act this week',  color: C.orange, icon: Calendar },
    { key: 'monitor'        as const, label: 'Monitor',         color: C.cyan,   icon: Eye },
  ];
  if (!groups.some(g => actions[g.key]?.length > 0)) return null;
  return (
    <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${css.border}` }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, marginBottom: 14 }}>Action Plan</p>
      {groups.map(g => actions[g.key]?.length > 0 && (
        <div key={g.key} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: g.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <g.icon size={13} style={{ color: g.color }} />{g.label}
          </p>
          {actions[g.key].map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: css.mutedFg, marginTop: 2 }}>·</span>
              <p style={{ margin: 0 }}>
                <strong>{a.situation}:</strong>{' '}
                <span style={{ color: css.mutedFg }}>{a.action}</span>
                <span style={{ color: C.indigo }}> → {a.owner}</span>
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KPI Analysis
// ─────────────────────────────────────────────────────────────────────────────

const KPI_LABELS: Record<string, string> = {
  dso_days: 'DSO (days)', overdue_ratio: 'Overdue Ratio',
  collection_efficiency_pct: 'Collection Efficiency %', total_receivable_lyd: 'Total Receivable',
  overdue_lyd: 'Overdue Amount (LYD)', taux_recouvrement_pct: 'Collection Rate %',
  total_revenue_lyd: 'Total Revenue', gross_margin_pct: 'Gross Margin %',
  avg_daily_revenue_lyd: 'Avg Daily Revenue', stock_rupture_pct: 'Out-of-Stock Rate %',
  critical_coverage_pct: 'Critical Coverage %', total_stock_value_lyd: 'Total Stock Value',
};

function KPISection() {
  const { data, loading, error, loadedAt, reload } = useAnalyzer(() => aiInsightsApi.kpis(), []);

  const healthColor = !data ? css.mutedFg : data.health_score >= 80 ? C.emerald : data.health_score >= 60 ? C.amber : C.rose;

  return (
    <Panel icon={BarChart3} title="KPI Analysis" accent={C.indigo}
      sub="Credit · Sales · Stock — reads from existing KPI modules"
      loadedAt={loadedAt} loading={loading} onRefresh={reload}>
      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Health score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 20, borderRadius: 14, background: css.muted + '50', border: `1px solid ${css.border}` }}>
            <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
              <svg width="72" height="72" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="28" fill="none" stroke={css.muted} strokeWidth="6" />
                <circle cx="32" cy="32" r="28" fill="none" stroke={healthColor} strokeWidth="6"
                  strokeDasharray={`${data.health_score * 1.759} 175.9`} strokeLinecap="round" />
              </svg>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 15, fontWeight: 800, color: healthColor }}>
                {data.health_score}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: css.cardFg, margin: 0, textTransform: 'capitalize' }}>{data.health_label} health</p>
                <ConfidencePill confidence={data.confidence} />
              </div>
              <p style={{ fontSize: 13, color: css.mutedFg, margin: 0, lineHeight: 1.5 }}>{data.executive_summary}</p>
            </div>
            <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
              {[
                { n: data.summary.green, label: 'Good',  color: C.emerald },
                { n: data.summary.amber, label: 'Watch', color: C.amber },
                { n: data.summary.red,   label: 'Alert', color: C.rose },
              ].map(({ n, label, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{n}</p>
                  <p style={{ fontSize: 10, color: css.mutedFg, margin: 0, marginTop: 3 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top insight */}
          {data.top_insight && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: `${C.indigo}08`, border: `1px solid ${C.indigo}20` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>Top insight</p>
              <p style={{ fontSize: 13, color: css.cardFg, margin: 0 }}>{data.top_insight}</p>
            </div>
          )}

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {Object.entries(data.kpis).map(([key, v]) => {
              const label = (v as any).label || KPI_LABELS[key] || key.replace(/_/g, ' ');
              return <KPIRow key={key} label={label} kpi={v} commentary={data.kpi_commentary?.[key]} />;
            })}
          </div>

          {/* Actions */}
          {data.recommended_actions?.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, marginBottom: 12 }}>Recommended Actions</p>
              {data.recommended_actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, fontSize: 13, marginBottom: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 8, background: `${C.indigo}15`, color: C.indigo, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.priority}</span>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0, marginBottom: 2 }}>{a.action}</p>
                    <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>
                      <span style={{ color: C.indigo }}>{a.owner}</span> · {a.impact}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function KPIRow({ label, kpi, commentary }: { label: string; kpi: KPIValue; commentary?: string }) {
  const [open, setOpen] = useState(false);
  const source = (kpi as any).source as string | undefined;
  const sourceMap: Record<string, [string, string]> = {
    credit_kpi: [C.orange, 'Credit'],
    sales_kpi:  [C.emerald, 'Sales'],
    stock_kpi:  [C.teal, 'Stock'],
  };
  const [srcColor, srcLabel] = source ? (sourceMap[source] ?? [css.mutedFg, source]) : [css.mutedFg, ''];

  const fmt = (v: number) => {
    if (label.includes('%') || label.toLowerCase().includes('ratio') || label.toLowerCase().includes('rate')) {
      if (v > 0 && v <= 1) return `${(v * 100).toFixed(1)}%`;
      if (v > 1 && v <= 100) return `${v.toFixed(1)}%`;
    }
    if (label.toLowerCase().includes('days') || label.toLowerCase().includes('dso'))
      return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} d`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M LYD`;
    if (v >= 1_000) return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} LYD`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const delta = kpi.delta_pct;
  const deltaEl = delta > 0
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: C.emerald }}><ArrowUpRight size={12} />{delta.toFixed(1)}%</span>
    : delta < 0
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: C.rose }}><ArrowDownRight size={12} />{Math.abs(delta).toFixed(1)}%</span>
    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: css.mutedFg }}><Minus size={12} />0%</span>;

  return (
    <button onClick={() => setOpen(o => !o)} style={{
      background: css.card, borderRadius: 12, padding: 14,
      border: `1px solid ${css.border}`, cursor: 'pointer', textAlign: 'left', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <StatusDot status={kpi.status} />
          <span style={{ fontSize: 12, fontWeight: 500, color: css.cardFg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          {srcLabel && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, color: srcColor, background: `${srcColor}15`, flexShrink: 0 }}>{srcLabel}</span>}
        </div>
        {deltaEl}
      </div>
      <p style={{ fontSize: 15, fontWeight: 800, margin: '6px 0 0 17px', color: css.cardFg }}>{fmt(kpi.current)}</p>
      {open && commentary && (
        <p style={{ fontSize: 11, color: css.mutedFg, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${css.border}` }}>{commentary}</p>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Anomaly Detection
// ─────────────────────────────────────────────────────────────────────────────

function AnomalySection() {
  const { data, loading, error, loadedAt, reload } = useAnalyzer(() => aiInsightsApi.anomalies(), []);
  return (
    <Panel icon={Zap} title="Anomaly Detection" accent={C.amber}
      sub="3-sigma rolling baseline · scans last 12 months of revenue, transactions & customers"
      loadedAt={loadedAt} loading={loading} onRefresh={reload}>
      {loading && <LoadingSkeleton rows={3} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        data.anomalies.length === 0
          ? <EmptyState text="No anomalies detected in the last 12 months." />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: 'Critical', n: data.summary.critical, color: C.rose },
                  { label: 'High',     n: data.summary.high,     color: C.orange },
                  { label: 'Medium',   n: data.summary.medium,   color: C.amber },
                  { label: 'Total',    n: data.summary.total,    color: css.mutedFg },
                ].filter(d => d.n > 0).map(({ label, n, color }) => (
                  <span key={label} style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, color, background: `${color}15`, border: `1px solid ${color}25` }}>
                    {n} {label}
                  </span>
                ))}
              </div>
              {data.anomalies.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
            </div>
          )
      )}
    </Panel>
  );
}

function AnomalyCard({ anomaly: a }: { anomaly: Anomaly }) {
  const [open, setOpen] = useState(false);
  const isSpike = a.direction === 'spike';
  const accent = a.severity === 'critical' ? C.rose : a.severity === 'high' ? C.orange : C.amber;
  const DirIcon = isSpike ? ArrowUpRight : ArrowDownRight;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${css.border}`, borderLeft: `4px solid ${accent}`, cursor: 'pointer' }}
      onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DirIcon size={16} style={{ color: isSpike ? C.emerald : C.rose, flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', color: css.cardFg }}>{a.stream.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: 11, color: css.mutedFg, marginLeft: 8 }}>{a.date}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SeverityBadge severity={a.severity} />
          {open ? <ChevronDown size={14} style={{ color: css.mutedFg }} /> : <ChevronRight size={14} style={{ color: css.mutedFg }} />}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '0 16px 14px', fontSize: 12 }}>
        <span><span style={{ color: css.mutedFg }}>Observed: </span><strong>{a.observed_value.toLocaleString()}</strong></span>
        <span><span style={{ color: css.mutedFg }}>Expected: </span>{a.expected_value.toLocaleString()}</span>
        <span style={{ fontWeight: 700, color: isSpike ? C.emerald : C.rose }}>
          {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct.toFixed(0)}% vs average
        </span>
      </div>
      <p style={{ fontSize: 12, color: css.mutedFg, padding: '0 16px 14px' }}>{a.ai_explanation}</p>
      {open && (
        <div style={{ borderTop: `1px solid ${css.border}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {a.likely_causes?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: css.cardFg }}>Likely causes</p>
              {a.likely_causes.map((c, i) => <p key={i} style={{ fontSize: 12, color: css.mutedFg, margin: '0 0 4px', display: 'flex', gap: 6 }}><span style={{ color: C.indigo }}>{i+1}.</span>{c}</p>)}
            </div>
          )}
          {a.business_impact && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: `${C.amber}10`, border: `1px solid ${C.amber}25` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 4 }}>Business impact</p>
              <p style={{ fontSize: 12, color: css.cardFg, margin: 0 }}>{a.business_impact}</p>
            </div>
          )}
          {a.recommended_actions?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: css.cardFg }}>Actions</p>
              {a.recommended_actions.map((act, i) => (
                <p key={i} style={{ fontSize: 12, color: css.mutedFg, margin: '0 0 4px', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <CheckCircle2 size={13} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />{act}
                </p>
              ))}
            </div>
          )}
          <ConfidencePill confidence={a.confidence} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Seasonal Analysis
// ─────────────────────────────────────────────────────────────────────────────

function SeasonalSection() {
  const { data, loading, error, loadedAt, reload } = useAnalyzer(
    () => aiInsightsApi.seasonal() as Promise<SeasonalResultV3>,
    []
  );
  return (
    <Panel
      icon={Calendar}
      title="Seasonal Trend Analysis"
      accent={C.teal}
      sub="12-month window · STL decomposition · Ramadan detection · LYD/USD rate"
      loadedAt={loadedAt}
      loading={loading}
      onRefresh={reload}
    >
      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (data.error ? <EmptyState text={data.error} /> : <SeasonalContent data={data} />)}
    </Panel>
  );
}
function SeasonalContent({ data }: { data: SeasonalResultV3 }) {
  const indices  = Object.values(data.seasonality_indices ?? {}).filter(
    v => v.seasonality_index !== null
  );
  const chartData = indices.map(v => ({
    name: v.month_name.slice(0, 3),
    si:   +(v.seasonality_index ?? 1).toFixed(3),
    label: v.label,
  }));
 
  const today     = new Date();
  const todayMonth = today.getMonth() + 1; // 1-12
 
  // ── Exchange rate pill ──────────────────────────────────────────────────────
  const fx = data.exchange_rate;
  const fxEl = fx && (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 20,
      background: `${C.amber}12`, border: `1px solid ${C.amber}30`,
      fontSize: 12, fontWeight: 700, color: C.amber,
    }}>
      <DollarSign size={13} style={{ color: C.amber }} />
      1 USD = {fx.usd_to_lyd.toFixed(2)} LYD
      {fx.source === 'default' && (
        <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>(default rate)</span>
      )}
    </span>
  );
 
  // ── Ramadan alert — only when relevant ─────────────────────────────────────
  const ramadan = data.relevant_ramadan;
  const ramadanEl = ramadan && (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px', borderRadius: 12,
      background: `${C.violet}10`, border: `1px solid ${C.violet}30`,
    }}>
      <span style={{
        fontSize: 18, lineHeight: 1, marginTop: 1,
        // crescent moon symbol, no emoji
      }}>☽</span>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 12, fontWeight: 700, color: C.violet,
          margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {ramadan.status === 'ongoing' ? 'Ramadan in progress' : 'Ramadan approaching'}
        </p>
        <p style={{ fontSize: 13, color: css.cardFg, margin: 0 }}>
          {ramadan.label}
          {ramadan.status === 'ongoing' && ramadan.days_remaining !== undefined && (
            <span style={{ color: css.mutedFg }}>
              {' '}· ends in {ramadan.days_remaining} days
            </span>
          )}
          {ramadan.status === 'upcoming' && ramadan.days_until !== undefined && (
            <span style={{ color: css.mutedFg }}>
              {' '}({ramadan.days_until} days — stock up now)
            </span>
          )}
        </p>
        {data.ramadan_analysis?.detected && (
          <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 4 }}>
            Historical impact: {data.ramadan_analysis.dominant_effect}
            {' · '}avg index {data.ramadan_analysis.avg_ramadan_index?.toFixed(3)}
          </p>
        )}
      </div>
    </div>
  );
 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
 
      {/* Top-row pills: current season + exchange rate + upcoming peak */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <span style={{
          padding: '6px 14px', borderRadius: 20,
          background: `${C.teal}15`, border: `1px solid ${C.teal}30`,
          fontSize: 13, fontWeight: 600, color: C.teal,
        }}>
          {data.current_season}
        </span>
 
        {fxEl}
 
        {data.upcoming_peak_alert && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            background: `${C.amber}15`, border: `1px solid ${C.amber}30`,
            fontSize: 12, fontWeight: 700, color: C.amber,
          }}>
            <AlertCircle size={13} />Peak season approaching — prepare stock now
          </span>
        )}
 
        {data.analysis_year && (
          <span style={{
            padding: '4px 10px', borderRadius: 20,
            background: css.muted, fontSize: 11, color: css.mutedFg,
          }}>
            {data.analysis_year} · 12-month window
          </span>
        )}
      </div>
 
      {/* Ramadan alert (only when relevant) */}
      {ramadanEl}
 
      {/* Trend pill */}
      {data.trend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 20, background: css.muted, fontSize: 12,
          }}>
            {data.trend.direction === 'growing'
              ? <TrendingUp size={13} style={{ color: C.emerald }} />
              : data.trend.direction === 'declining'
              ? <TrendingDown size={13} style={{ color: C.rose }} />
              : <Minus size={13} style={{ color: css.mutedFg }} />
            }
            Trend: <strong>{data.trend.direction}</strong>
            {' · '}
            {data.trend.slope_pct_per_month > 0 ? '+' : ''}
            {data.trend.slope_pct_per_month?.toFixed(2)}%/month
          </span>
        </div>
      )}
 
      {/* SI bar chart */}
      {chartData.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: css.mutedFg, marginBottom: 10 }}>
            Monthly demand index (1.0 = average month)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="siGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.teal} stopOpacity={1} />
                  <stop offset="100%" stopColor={C.teal} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={css.border} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: css.mutedFg }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: css.mutedFg }}
                domain={[0.5, 'auto']}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any) => [v, 'SI']}
              />
              <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="4 4" />
              <Bar dataKey="si" fill="url(#siGrad)" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => {
                  const isCurrentMonth = (i + 1) === todayMonth; // approximate
                  return (
                    <Cell
                      key={i}
                      fill={
                        entry.label === 'peak'   ? C.teal   :
                        entry.label === 'trough' ? C.amber  :
                        isCurrentMonth           ? C.indigo :
                        'url(#siGrad)'
                      }
                      opacity={isCurrentMonth ? 1 : 0.85}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            {[
              { color: C.teal,   label: 'Peak' },
              { color: C.amber,  label: 'Trough' },
              { color: C.indigo, label: 'Current month' },
            ].map(({ color, label }) => (
              <span key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: css.mutedFg,
              }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10,
                  borderRadius: 2, background: color,
                }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
 
      {/* Peak / Trough months */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{
          padding: 14, borderRadius: 12,
          background: `${C.indigo}08`, border: `1px solid ${C.indigo}20`,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: C.indigo, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <TrendingUp size={13} style={{ color: C.indigo }} />Peak months
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>
            {data.peak_month_names?.join(', ') || '—'}
          </p>
        </div>
        <div style={{
          padding: 14, borderRadius: 12,
          background: `${C.orange}08`, border: `1px solid ${C.orange}20`,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: C.orange, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <TrendingDown size={13} style={{ color: C.orange }} />Trough months
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>
            {data.trough_month_names?.join(', ') || '—'}
          </p>
        </div>
      </div>
 
      {/* Stock preparation calendar — upcoming peaks only */}
      {data.stock_preparation_calendar?.length > 0 && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: `${C.cyan}06`, border: `1px solid ${C.cyan}20`,
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: C.cyan, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Package size={13} />Stock preparation calendar — upcoming peaks
          </p>
          {data.stock_preparation_calendar.map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < data.stock_preparation_calendar.length - 1
                ? `1px solid ${css.border}` : 'none',
            }}>
              <div style={{
                minWidth: 48, textAlign: 'center', padding: '4px 8px',
                borderRadius: 8, background: `${C.teal}15`,
                fontSize: 11, fontWeight: 700, color: C.teal,
              }}>
                {item.month.slice(0, 3)}
                {item.prep_year ? (
                  <div style={{ fontSize: 9, fontWeight: 400, color: css.mutedFg }}>
                    {item.prep_year}
                  </div>
                ) : null}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: '0 0 3px' }}>
                  {item.action}
                </p>
                <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>
                  {item.rationale}
                </p>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: C.amber,
                padding: '3px 8px', borderRadius: 20,
                background: `${C.amber}12`, flexShrink: 0,
              }}>
                {item.lead_time_weeks}w lead
              </div>
            </div>
          ))}
        </div>
      )}
 
      {/* AI narrative */}
      {data.seasonal_narrative && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: css.muted + '50', border: `1px solid ${css.border}`,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: css.mutedFg, marginBottom: 6 }}>
            AI Narrative
          </p>
          <p style={{
            fontSize: 13, color: css.cardFg, margin: 0, lineHeight: 1.6,
          }}>
            {data.seasonal_narrative}
          </p>
        </div>
      )}
 
      {/* Recommendations — upcoming/current only */}
      {data.ai_recommendations?.length > 0 && (
        <div>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: css.mutedFg, marginBottom: 10,
          }}>
            Recommendations
          </p>
          {data.ai_recommendations.map((r, i) => (
            <p key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontSize: 13, marginBottom: 8,
            }}>
              <CheckCircle2
                size={15}
                style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }}
              />
              {r}
            </p>
          ))}
        </div>
      )}
 
      {/* Exchange rate disclaimer */}
      {fx?.source === 'default' && (
        <p style={{
          fontSize: 10, color: css.mutedFg,
          padding: '8px 12px', borderRadius: 8, background: css.muted + '50',
          border: `1px solid ${css.border}`,
        }}>
          ⚠️ Using default LYD/USD rate ({fx.usd_to_lyd.toFixed(2)}).
          Set <code>LYD_USD_RATE</code> in Django settings for the live Central Bank rate.
        </p>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// 5. Churn Prediction
// ─────────────────────────────────────────────────────────────────────────────

function ChurnSection() {
  const { data, loading, error, loadedAt, reload } = useAnalyzer(() => aiInsightsApi.churn({ top_n: 20 }), []);
  return (
    <Panel icon={Users} title="Customer Churn Prediction" accent={C.violet}
      sub="Rule-based pre-scoring + AI refinement for high-risk accounts"
      loadedAt={loadedAt} loading={loading} onRefresh={reload}>
      {loading && <LoadingSkeleton rows={3} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        !data.predictions?.length
          ? <EmptyState text="No churn risk detected in active customers." />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Critical',  n: data.summary.critical,                            color: C.rose },
                  { label: 'High',      n: data.summary.high,                                 color: C.orange },
                  { label: 'Medium',    n: data.summary.medium,                               color: C.amber },
                  { label: 'Avg Score', n: `${(data.summary.avg_churn_score * 100).toFixed(0)}%`, color: C.violet },
                ].map(({ label, n, color }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '14px 10px', borderRadius: 12, border: `1px solid ${css.border}`, background: css.muted + '30' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{n}</p>
                    <p style={{ fontSize: 10, color: css.mutedFg, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg }}>Top at-risk customers</p>
              {data.predictions.slice(0, 10).map((p, i) => <ChurnCard key={i} prediction={p} />)}
            </div>
          )
      )}
    </Panel>
  );
}

function ChurnCard({ prediction: p }: { prediction: ChurnPrediction }) {
  const [open, setOpen] = useState(false);
  const scoreAccent = p.churn_score >= 0.75 ? C.rose : p.churn_score >= 0.50 ? C.orange : p.churn_score >= 0.25 ? C.amber : C.emerald;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${css.border}`, marginBottom: 8, borderLeft: `4px solid ${scoreAccent}` }}>
      <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: css.cardFg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.customer_name || p.account_code}</span>
            <SeverityBadge severity={p.churn_label} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 100, height: 6, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, width: `${p.churn_score * 100}%`, background: `linear-gradient(90deg, ${scoreAccent}80, ${scoreAccent})` }} />
            </div>
            <span style={{ fontSize: 12, color: css.mutedFg }}>{(p.churn_score * 100).toFixed(0)}%</span>
            <span style={{ fontSize: 12, color: css.mutedFg }}>· {p.days_since_last_purchase}d inactive</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: css.mutedFg }}>{formatCurrency(p.avg_monthly_revenue_lyd)}/mo</span>
          {open ? <ChevronDown size={14} style={{ color: css.mutedFg }} /> : <ChevronRight size={14} style={{ color: css.mutedFg }} />}
        </div>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${css.border}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: css.mutedFg, margin: 0 }}>{p.ai_explanation}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Avg Monthly Rev', value: formatCurrency(p.avg_monthly_revenue_lyd) },
              { label: 'Revenue Trend',   value: `${(p.revenue_trend * 100).toFixed(0)}%` },
              { label: 'Overdue Ratio',   value: `${(p.overdue_ratio * 100).toFixed(0)}%` },
              { label: 'Aging Risk',      value: p.aging_risk_score },
              { label: 'Orders 12m',      value: String(p.purchase_count_12m) },
              { label: 'Receivable',      value: formatCurrency(p.total_receivable_lyd) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: css.muted + '40' }}>
                <p style={{ fontSize: 10, color: css.mutedFg, margin: '0 0 3px' }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: css.cardFg, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          {p.recommended_actions?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: css.cardFg, marginBottom: 8 }}>Actions</p>
              {p.recommended_actions.map((a, i) => (
                <p key={i} style={{ fontSize: 12, color: css.mutedFg, display: 'flex', alignItems: 'flex-start', gap: 6, margin: '0 0 6px' }}>
                  <CheckCircle2 size={13} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />{a}
                </p>
              ))}
            </div>
          )}
          <ConfidencePill confidence={p.confidence} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Stock Optimizer
// ─────────────────────────────────────────────────────────────────────────────

function useBranchFilteredItems(items: BranchStockItem[], selectedBranch: string | null, urgencyFilter: 'all' | 'immediate' | 'soon') {
  return useMemo(() => {
    let filtered = selectedBranch ? items.filter(i => i.branch_name === selectedBranch) : items;
    if (urgencyFilter !== 'all') filtered = filtered.filter(i => i.urgency === urgencyFilter);
    return filtered;
  }, [items, selectedBranch, urgencyFilter]);
}

function useBranchSummaries(items: BranchStockItem[]) {
  return useMemo(() => {
    const map: Record<string, { total_items: number; immediate_reorders: number; soon_reorders: number }> = {};
    for (const item of items) {
      const b = item.branch_name;
      if (!map[b]) map[b] = { total_items: 0, immediate_reorders: 0, soon_reorders: 0 };
      map[b].total_items++;
      if (item.urgency === 'immediate') map[b].immediate_reorders++;
      if (item.urgency === 'soon') map[b].soon_reorders++;
    }
    return map;
  }, [items]);
}

export function StockSection() {
  const { data, loading, error, loadedAt, reload } = useAnalyzer(() => aiInsightsApi.stock(), []);
  const stockData = data as BranchStockResult | null;
  return (
    <Panel icon={Package} title="Stock Optimization" accent={C.cyan}
      sub="ABC Pareto + EOQ + ROP · per-branch stock · AI recommendations Class A"
      loadedAt={loadedAt} loading={loading} onRefresh={reload}>
      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {stockData && <StockContent data={stockData} />}
    </Panel>
  );
}

function StockContent({ data }: { data: BranchStockResult }) {
  const { summary, items } = data;
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'immediate' | 'soon'>('immediate');
  const branches = useMemo(() => Array.from(new Set(items.map(i => i.branch_name))).sort(), [items]);
  const branchSummaries = useBranchSummaries(items as BranchStockItem[]);
  const filtered = useBranchFilteredItems(items as BranchStockItem[], selectedBranch, urgencyFilter);
  const scopedSummary = selectedBranch && branchSummaries[selectedBranch]
    ? branchSummaries[selectedBranch]
    : { total_items: summary.total_items, immediate_reorders: summary.immediate_reorders, soon_reorders: summary.soon_reorders };

  const realCount = items.filter(i => i.stock_source === 'real').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Meta pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {realCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, color: C.emerald, background: `${C.emerald}12`, border: `1px solid ${C.emerald}25`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={12} style={{ color: C.emerald }} />{realCount} SKUs from real snapshot
          </span>
        )}
        {data.service_level && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, color: C.indigo, background: `${C.indigo}10`, border: `1px solid ${C.indigo}20` }}>
            Service level · {data.service_level}
          </span>
        )}
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Class A',   n: summary.class_a_count,      color: C.indigo, icon: null },
          { label: 'Class B',   n: summary.class_b_count,      color: C.amber,  icon: null },
          { label: 'Class C',   n: summary.class_c_count,      color: css.mutedFg, icon: null },
          { label: 'Reorder',   n: summary.immediate_reorders, color: C.rose,   icon: AlertTriangle },
        ].map(({ label, n, color, icon: Icon }) => (
          <div key={label} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, border: `1px solid ${css.border}`, background: css.muted + '30' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{n}</p>
            <p style={{ fontSize: 10, color: css.mutedFg, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {Icon && <Icon size={10} style={{ color }} />}{label}
            </p>
          </div>
        ))}
      </div>

      {/* Branch selector */}
      {branches.length > 1 && (
        <div style={{ padding: 16, borderRadius: 12, background: `${C.indigo}06`, border: `1px solid ${C.indigo}20` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.indigo, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={13} />Branch View — {selectedBranch ?? `All ${branches.length} branches`}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={() => setSelectedBranch(null)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: selectedBranch === null ? C.indigo : css.muted,
              color: selectedBranch === null ? '#fff' : css.mutedFg, border: 'none',
            }}>All ({branches.length})</button>
            {branches.map(b => (
              <button key={b} onClick={() => setSelectedBranch(b)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: selectedBranch === b ? C.indigo : css.muted,
                color: selectedBranch === b ? '#fff' : css.mutedFg, border: 'none',
              }}>{b}</button>
            ))}
          </div>
        </div>
      )}

      {/* Urgency filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: css.mutedFg }}>
          <Filter size={12} />Urgency:
        </span>
        {([
          { key: 'immediate', label: `Immediate (${scopedSummary.immediate_reorders})` },
          { key: 'soon',      label: `Soon (${scopedSummary.soon_reorders})` },
          { key: 'all',       label: `All (${scopedSummary.total_items})` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setUrgencyFilter(key)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: urgencyFilter === key ? C.indigo : css.muted,
            color: urgencyFilter === key ? '#fff' : css.mutedFg, border: 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* Item list */}
      {filtered.length === 0
        ? <EmptyState text="No items match this filter." />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.slice(0, 20).map((item, i) => <StockItemCard key={`${item.product_code}-${i}`} item={item} />)}
          </div>
      }
    </div>
  );
}

function StockItemCard({ item }: { item: BranchStockItem }) {
  const [open, setOpen] = useState(false);
  const urgencyAccent = { immediate: C.rose, soon: C.amber, watch: C.cyan, ok: css.mutedFg }[item.urgency] ?? css.mutedFg;
  const classBg: Record<string, string> = { A: C.indigo, B: C.amber, C: '#94a3b8' };

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${css.border}`, borderLeft: `4px solid ${urgencyAccent}`, background: css.card }}>
      <button style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 14 }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ width: 22, height: 22, borderRadius: 8, fontSize: 10, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: classBg[item.abc_class] ?? '#94a3b8', flexShrink: 0 }}>
            {item.abc_class}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: C.cyan, background: `${C.cyan}12`, border: `1px solid ${C.cyan}25`, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Building2 size={11} />{item.branch_name}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, color: urgencyAccent, background: `${urgencyAccent}15`, border: `1px solid ${urgencyAccent}25`, flexShrink: 0 }}>
            {item.urgency}
          </span>
          {open ? <ChevronDown size={14} style={{ color: css.mutedFg, flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: css.mutedFg, flexShrink: 0 }} />}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8, fontSize: 12, color: css.mutedFg }}>
          <span>Stock: <strong style={{ color: css.cardFg }}>{item.current_stock.toFixed(0)}</strong></span>
          <span>ROP: {item.reorder_point.toFixed(0)}</span>
          <span>EOQ: {item.eoq}</span>
          {item.estimated_days_to_stockout !== null && (
            <span style={{ color: item.estimated_days_to_stockout < 7 ? C.rose : css.mutedFg, fontWeight: item.estimated_days_to_stockout < 7 ? 700 : 400 }}>
              {item.estimated_days_to_stockout.toFixed(0)}d to stockout
            </span>
          )}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${css.border}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Avg Daily Demand', value: `${item.avg_daily_demand.toFixed(2)} u/d` },
              { label: 'Safety Stock',     value: `${item.safety_stock.toFixed(0)} u` },
              { label: 'Revenue',          value: formatCurrency(item.total_revenue_lyd) },
              { label: 'Revenue/Unit',     value: formatCurrency(item.revenue_per_unit_lyd) },
              { label: 'Revenue Share',    value: `${item.revenue_pct.toFixed(2)}%` },
              { label: 'Revenue at Risk',  value: item.revenue_at_risk_lyd > 0 ? formatCurrency(item.revenue_at_risk_lyd) : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: css.muted + '40' }}>
                <p style={{ fontSize: 10, color: css.mutedFg, margin: '0 0 3px' }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: css.cardFg, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          {item.ai_recommendation && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: `${C.indigo}08`, border: `1px solid ${C.indigo}20` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.indigo, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={12} />AI Recommendation — {item.branch_name}
              </p>
              <p style={{ fontSize: 12, color: css.cardFg, margin: 0 }}>{item.ai_recommendation}</p>
            </div>
          )}
          {item.order_suggestion?.quantity && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.muted + '30' }}>
              <Target size={15} style={{ color: C.teal, flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px' }}>Order {item.order_suggestion.quantity} units · {item.order_suggestion.timing}</p>
                <p style={{ fontSize: 12, color: css.mutedFg, margin: 0 }}>{item.order_suggestion.rationale}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Revenue Predictor
// ─────────────────────────────────────────────────────────────────────────────

function PredictorSection() {
  const { data, loading, error, loadedAt, reload } = useAnalyzer(() => aiInsightsApi.predict(), []);
  return (
    <Panel icon={Brain} title="Revenue & Demand Forecast" accent={C.emerald}
      sub="3-month outlook · best case / expected / worst case · Holt-Winters + Monte Carlo"
      loadedAt={loadedAt} loading={loading} onRefresh={reload}>
      {loading && <LoadingSkeleton rows={3} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (!data.revenue_forecast?.length ? <EmptyState text={data.error ?? 'Insufficient data for forecasting.'} /> : <PredictorContent data={data} />)}
    </Panel>
  );
}

function PredictorContent({ data }: { data: PredictorResult }) {
  const { trend_model: tm, revenue_forecast: fc } = data;
  const trendColor = tm.direction === 'growing' ? C.emerald : tm.direction === 'declining' ? C.rose : css.mutedFg;

  const chartData = fc.map(m => ({
    name: m.period.replace(/\s\d{4}/, ''),
    base: Math.round(m.base_lyd),
    optimistic: Math.round(m.optimistic_lyd),
    pessimistic: Math.round(m.pessimistic_lyd),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, background: css.muted }}>
          {tm.direction === 'growing' ? <TrendingUp size={14} style={{ color: C.emerald }} /> : tm.direction === 'declining' ? <TrendingDown size={14} style={{ color: C.rose }} /> : <Minus size={14} />}
          <span style={{ fontSize: 13, fontWeight: 700, color: trendColor, textTransform: 'capitalize' }}>{tm.direction}</span>
          <span style={{ fontSize: 12, color: css.mutedFg }}>
            {(tm as any).slope_pct > 0 ? '+' : ''}{((tm as any).slope_pct ?? 0).toFixed(1)}%/month
            {(tm as any).mape ? ` · ${(tm as any).mape.toFixed(0)}% avg error` : ''}
          </span>
        </span>
        <ConfidencePill confidence={data.confidence} />
      </div>

      {data.forecast_narrative && (
        <p style={{ fontSize: 13, color: css.mutedFg, lineHeight: 1.6, margin: 0 }}>{data.forecast_narrative}</p>
      )}

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: css.mutedFg, marginBottom: 12 }}>3-Month Revenue Forecast (LYD)</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.indigo} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={css.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: css.mutedFg }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: css.mutedFg }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [formatCurrency(v), '']} />
            <Area type="monotone" dataKey="optimistic"  fill="none" stroke={C.emerald} strokeDasharray="4 4" strokeWidth={1.5} />
            <Area type="monotone" dataKey="base"        fill="url(#gradBase)" stroke={C.indigo} strokeWidth={2.5} />
            <Area type="monotone" dataKey="pessimistic" fill="none" stroke={C.rose}    strokeDasharray="4 4" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          {[
            { color: C.emerald, label: 'Best case' },
            { color: C.indigo,  label: 'Expected' },
            { color: C.rose,    label: 'Worst case' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: css.mutedFg }}>
              <span style={{ display: 'inline-block', width: 24, height: 2, background: color, borderRadius: 2 }} />{label}
            </span>
          ))}
        </div>
      </div>

      {/* Forecast table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${css.border}` }}>
              {['Month', 'Expected', 'Best case', 'Worst case'].map((h, i) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: i === 2 ? C.emerald : i === 3 ? C.rose : css.mutedFg }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fc.map((m, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${css.border}` }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: css.cardFg }}>{m.period}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: css.cardFg }}>{formatCurrency(m.base_lyd)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: C.emerald, fontWeight: 600 }}>+{m.upside_pct.toFixed(1)}%</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: C.rose, fontWeight: 600 }}>-{m.downside_pct.toFixed(1)}%</td>
              </tr>
            ))}
            <tr style={{ background: css.muted + '50', fontWeight: 800 }}>
              <td style={{ padding: '10px 12px', fontWeight: 800, color: css.cardFg }}>3-Month total</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: css.cardFg }}>{formatCurrency(data.forecast_total_base_lyd)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: C.emerald, fontWeight: 700 }}>{formatCurrency(data.forecast_total_optimistic_lyd)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: C.rose, fontWeight: 700 }}>{formatCurrency(data.forecast_total_pessimistic_lyd)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {data.primary_risk && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: `${C.amber}08`, border: `1px solid ${C.amber}25` }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={13} />Primary Risk
          </p>
          <p style={{ fontSize: 13, color: css.cardFg, margin: 0 }}>{data.primary_risk}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState('critical');

  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>
              Intelligent Analysis
            </h1>
            <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 3 }}>AI-powered insights across all business dimensions</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24,
        padding: '6px 8px', borderRadius: 14, background: css.muted + '60',
        border: `1px solid ${css.border}`, width: 'fit-content',
      }}>
        {TABS.map(({ key, label, icon: Icon, accent }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
            border: activeTab === key ? `1px solid ${accent}30` : '1px solid transparent',
            background: activeTab === key ? css.card : 'transparent',
            color: activeTab === key ? accent : css.mutedFg,
            boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'critical'  && <CriticalSection />}
        {activeTab === 'kpis'      && <KPISection />}
        {activeTab === 'anomalies' && <AnomalySection />}
        {activeTab === 'seasonal'  && <SeasonalSection />}
        {activeTab === 'churn'     && <ChurnSection />}
        {activeTab === 'stock'     && <StockSection />}
        {activeTab === 'forecast'  && <PredictorSection />}
      </div>

      {/* Chat */}
      <div style={{ marginTop: 32 }}>
        <AIChat />
      </div>
    </div>
  );
}