/**
 * AIInsightsPage.tsx  —  Full redesign: Phase 1-4
 *
 * Changes vs original:
 *  - Phase 1: Updated StockResult / StockItem types to be fully branch-aware
 *  - Phase 2: All calculations use per-branch stock; branch attribution fixed
 *  - Phase 3: Branch filter added to StockSection (global vs per-branch view)
 *  - Phase 4: AI insights labelled per branch; transfer suggestions surfaced
 *
 * Drop-in replacement for the original file.
 * Requires the same imports (lucide-react, recharts, shadcn/ui, etc.).
 */

import {
  Sparkles, TrendingUp, AlertTriangle, Package, Users, Zap,
  BarChart3, ShieldAlert, Brain, ArrowUpRight,
  ArrowDownRight, Minus, RefreshCw, Clock, ChevronDown,
  ChevronRight, Target, AlertCircle, TrendingDown, CheckCircle2,
  XCircle, Flame, Calendar, DollarSign, GitMerge, Building2,
  Layers, Filter,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  BarChart, Bar, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
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

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Extended types for branch-aware stock
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extended StockItem that adds branch-level fields.
 * Backward-compatible: all original fields retained.
 */
export interface BranchStockItem extends StockItem {
  branch_id?:             string;
  // Per-branch aggregated siblings (other branches holding same product)
  sibling_branches?: Array<{
    branch_name:   string;
    current_stock: number;
    urgency:       'immediate' | 'soon' | 'watch' | 'ok';
  }>;
  // AI cross-branch transfer suggestion (Phase 4)
  transfer_suggestion?: {
    from_branch: string;
    qty:         number;
    rationale:   string;
  };
}

export interface BranchStockResult extends StockResult {
  // All unique branches detected in this snapshot
  branches: string[];
  // Per-branch summary breakdown
  branch_summaries?: Record<string, {
    total_items:        number;
    immediate_reorders: number;
    soon_reorders:      number;
    total_stock_value:  number;
  }>;
  // Override items with richer type
  items: BranchStockItem[];
  // Data quality
  snapshot_date?:  string;
  validation?: {
    passed:          boolean;
    total_qty:       number;
    branches_found:  number;
    warnings:        string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic async hook
// ─────────────────────────────────────────────────────────────────────────────

function useAnalyzer<T>(fetchFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData]         = useState<T | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  return { data, loading, error, loadedAt, reload: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI atoms
// ─────────────────────────────────────────────────────────────────────────────

const AIBadge = () => (
  <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs gap-1 shrink-0">
    <Sparkles className="h-3 w-3" />AI
  </Badge>
);

function SectionHeader({
  icon: Icon, iconColor = 'text-indigo-600', title, description,
  loadedAt, loading, onRefresh,
}: {
  icon: React.ElementType; iconColor?: string; title: string; description: string;
  loadedAt?: Date | null; loading?: boolean; onRefresh?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
          <span className="truncate">{title}</span>
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
        {loadedAt && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {loadedAt.toLocaleTimeString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <AIBadge />
        {onRefresh && (
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border space-y-2.5">
          <div className="h-4 w-2/3 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-4/5 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center gap-3">
      <XCircle className="h-9 w-9 text-red-400" />
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function StatusDot({ status }: { status: TrafficLight | string }) {
  const c = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return <span className={`h-2.5 w-2.5 rounded-full shrink-0 inline-block ${c[status as TrafficLight] ?? 'bg-gray-400'}`} />;
}

function SeverityPill({ severity }: { severity: Severity | string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800',
    high:     'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
    medium:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    low:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[severity] ?? 'bg-muted'}`}>
      {severity}
    </span>
  );
}

function ConfidencePill({ confidence }: { confidence: Confidence | string }) {
  const map: Record<string, string> = {
    high:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    low:    'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${map[confidence] ?? ''}`}>
      {confidence} confidence
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <ArrowUpRight className="h-3 w-3" />{delta.toFixed(1)}%
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-600">
      <ArrowDownRight className="h-3 w-3" />{Math.abs(delta).toFixed(1)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border:          '1px solid hsl(var(--border))',
  borderRadius:    '8px',
  fontSize:        '12px',
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — Branch Selector component (reusable)
// ─────────────────────────────────────────────────────────────────────────────

function BranchSelector({
  branches,
  selected,
  onChange,
}: {
  branches: string[];
  selected: string | null;   // null = all branches
  onChange: (branch: string | null) => void;
}) {
  if (branches.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0">
        <Building2 className="h-3.5 w-3.5" />Branch:
      </span>
      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
          selected === null
            ? 'bg-indigo-600 text-white'
            : 'bg-muted text-muted-foreground hover:bg-muted/70'
        }`}
      >
        All ({branches.length})
      </button>
      {branches.map(b => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors max-w-[160px] truncate ${
            selected === b
              ? 'bg-indigo-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
          title={b}
        >
          {b}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Validation Banner (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

function DataValidationBanner({ validation, snapshotDate }: {
  validation?: BranchStockResult['validation'];
  snapshotDate?: string;
}) {
  if (!validation) return null;

  if (!validation.passed) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-red-700 dark:text-red-300">
            Snapshot validation failed — data may be unreliable
          </p>
          {validation.warnings.map((w, i) => (
            <p key={i} className="text-red-600 dark:text-red-400">· {w}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Snapshot validated · {validation.branches_found} branches · {validation.total_qty.toLocaleString()} units
      </span>
      {snapshotDate && (
        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
          Snapshot: {snapshotDate}
        </span>
      )}
      {validation.warnings.length > 0 && validation.warnings.map((w, i) => (
        <span key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />{w}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Critical Executive Briefing
// ─────────────────────────────────────────────────────────────────────────────

function CriticalSection() {
  const { data, loading, error, loadedAt, reload } =
    useAnalyzer(() => aiInsightsApi.critical(), []);

  const riskColors: Record<string, string> = {
    critical: 'from-red-600 to-rose-600',
    high:     'from-orange-500 to-amber-500',
    medium:   'from-amber-500 to-yellow-500',
    low:      'from-emerald-500 to-teal-500',
  };
  const riskBorder: Record<string, string> = {
    critical: 'border-red-200 dark:border-red-800',
    high:     'border-orange-200 dark:border-orange-800',
    medium:   'border-amber-200 dark:border-amber-800',
    low:      'border-emerald-200 dark:border-emerald-800',
  };

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={ShieldAlert} iconColor="text-red-600"
          title="Executive Risk Briefing"
          description="Cross-module critical situation aggregator — refreshes every 30 min"
          loadedAt={loadedAt} loading={loading} onRefresh={reload}
        />
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton rows={2} />}
        {error  && <ErrorState message={error} onRetry={reload} />}
        {data   && (
          <div className="space-y-4">
            <div className={`rounded-xl border-2 ${riskBorder[data.risk_level]} p-4 bg-gradient-to-br ${riskColors[data.risk_level]}/5`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${riskColors[data.risk_level]}`}>
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SeverityPill severity={data.risk_level} />
                    <span className="text-xs text-muted-foreground">
                      {data.critical_count} critical · {data.total_situations} total situations
                    </span>
                    <span className="text-xs font-semibold text-red-600">
                      {formatCurrency(data.total_exposure_lyd)} at risk
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{data.executive_briefing}</p>
                  <ConfidencePill confidence={data.confidence} />
                </div>
              </div>
            </div>

            {data.situations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Situations ranked by risk × exposure
                </p>
                {data.situations.map((s, i) => (
                  <SituationRow key={i} situation={s} rank={i + 1} />
                ))}
              </div>
            )}

            {data.causal_clusters?.length > 0 && (
              <div className="rounded-xl border border-violet-100 dark:border-violet-900 p-4 space-y-3 bg-violet-50/30 dark:bg-violet-950/20">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5" />Causal analysis — linked root causes
                </p>
                {data.causal_clusters.map((cluster, i) => (
                  <div key={i} className="rounded-lg border border-violet-200 dark:border-violet-800 p-3 bg-white dark:bg-slate-900">
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-1">{cluster.cluster_name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{cluster.common_cause}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {cluster.situations.map((s, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">{s}</span>
                      ))}
                    </div>
                    <div className="flex items-start gap-1.5 p-2 rounded bg-violet-50 dark:bg-violet-950">
                      <Target className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-violet-600 dark:text-violet-400">{cluster.unified_action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.grouped_actions && (
              <GroupedActionsPanel actions={data.grouped_actions} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SituationRow({ situation: s, rank }: { situation: CriticalSituation; rank: number }) {
  const [open, setOpen] = useState(false);
  const sourceIcon: Record<string, React.ElementType> = {
    churn: Users, anomaly: Zap, aging: AlertTriangle,
    stock: Package, kpi: BarChart3,
  };
  const Icon = sourceIcon[s.source] ?? AlertCircle;
  const entityName = s.customer_name || s.account_name || s.product_name;

  return (
    <div className="rounded-lg border bg-card">
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors rounded-lg"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{rank}</span>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">{s.title}</span>
          {entityName && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{entityName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SeverityPill severity={s.severity} />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {formatCurrency(s.financial_exposure_lyd)}
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t pt-3">
          <p className="text-sm text-muted-foreground">{s.summary}</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-red-500" />
              <strong>Exposure:</strong> {formatCurrency(s.financial_exposure_lyd)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-orange-500" />
              <strong>Act within:</strong> {s.urgency_hours}h
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">Recommended action</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">{s.recommended_action}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupedActionsPanel({ actions }: { actions: CriticalDetectionResult['grouped_actions'] }) {
  const groups = [
    { key: 'act_within_24h' as const, label: '⚡ Act within 24h', color: 'text-red-600' },
    { key: 'act_this_week'  as const, label: '📅 Act this week',  color: 'text-orange-600' },
    { key: 'monitor'        as const, label: '👁 Monitor',         color: 'text-blue-600' },
  ];
  const hasActions = groups.some(g => actions[g.key]?.length > 0);
  if (!hasActions) return null;

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action Plan</p>
      {groups.map(g => (
        actions[g.key]?.length > 0 && (
          <div key={g.key}>
            <p className={`text-xs font-bold mb-1.5 ${g.color}`}>{g.label}</p>
            <div className="space-y-1.5">
              {actions[g.key].map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground mt-0.5">·</span>
                  <div>
                    <span className="font-medium">{a.situation}:</span>{' '}
                    <span className="text-muted-foreground">{a.action}</span>
                    <span className="text-indigo-600 ml-1">→ {a.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KPI Analysis
// ─────────────────────────────────────────────────────────────────────────────

const KPI_LABELS: Record<string, string> = {
  dso_days:                    'DSO (days)',
  overdue_ratio:               'Overdue Ratio',
  collection_efficiency_pct:   'Collection Efficiency %',
  total_receivable_lyd:        'Total Receivable',
  overdue_lyd:                 'Overdue Amount (LYD)',
  taux_recouvrement_pct:       'Collection Rate %',
  total_revenue_lyd:           'Total Revenue',
  gross_margin_pct:            'Gross Margin %',
  avg_daily_revenue_lyd:       'Avg Daily Revenue',
  stock_rupture_pct:           'Out-of-Stock Rate %',
  critical_coverage_pct:       'Critical Coverage %',
  total_stock_value_lyd:       'Total Stock Value',
  total_transactions:          'Transactions',
  avg_order_value_lyd:         'Avg Order Value',
  active_customers:            'Active Customers',
  order_frequency:             'Order Frequency',
  revenue_per_transaction_lyd: 'Rev / Transaction',
  transactions_per_day:        'Txns / Day',
  top3_concentration_pct:      'Top-3 Concentration %',
  new_customer_pct:            'New Customer %',
};

function resolveKpiLabel(key: string, kpi: KPIValue): string {
  if ((kpi as any).label) return (kpi as any).label;
  if (KPI_LABELS[key]) return KPI_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function KPISection() {
  const { data, loading, error, loadedAt, reload } =
    useAnalyzer(() => aiInsightsApi.kpis(), []);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={BarChart3} title="KPI Analysis"
          description="Credit · Sales · Stock — reads from existing KPI modules, no recomputation"
          loadedAt={loadedAt} loading={loading} onRefresh={reload}
        />
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton rows={4} />}
        {error   && <ErrorState message={error} onRetry={reload} />}
        {data    && <KPIContent data={data} />}
      </CardContent>
    </Card>
  );
}

function KPIContent({ data }: { data: KPIResult }) {
  const healthColor = data.health_score >= 80 ? 'text-emerald-600'
    : data.health_score >= 60 ? 'text-amber-600' : 'text-red-600';
  const kpiEntries = Object.entries(data.kpis);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={`${data.health_score * 1.759} 175.9`}
              className={healthColor} strokeLinecap="round" />
          </svg>
          <span className={`absolute text-sm font-bold ${healthColor}`}>{data.health_score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold capitalize">{data.health_label} health</span>
            <ConfidencePill confidence={data.confidence} />
          </div>
          <p className="text-sm text-muted-foreground leading-snug line-clamp-3">{data.executive_summary}</p>
        </div>
        <div className="hidden sm:flex gap-3 text-center shrink-0">
          {[
            { n: data.summary.green, label: 'Good',  color: 'text-emerald-600' },
            { n: data.summary.amber, label: 'Watch', color: 'text-amber-600' },
            { n: data.summary.red,   label: 'Alert', color: 'text-red-600' },
          ].map(({ n, label, color }) => (
            <div key={label}>
              <p className={`text-xl font-bold ${color}`}>{n}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {data.top_insight && (
        <div className="p-3 rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/50">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">Top insight</p>
          <p className="text-sm">{data.top_insight}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {kpiEntries.map(([key, v]) => (
          <KPIRow key={key} label={resolveKpiLabel(key, v)} kpi={v} commentary={data.kpi_commentary?.[key]} />
        ))}
      </div>

      {data.recommended_actions?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Actions</p>
          {data.recommended_actions.map((a, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border bg-card text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                {a.priority}
              </span>
              <div className="min-w-0">
                <p className="font-medium truncate">{a.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="text-indigo-600">{a.owner}</span> · {a.impact}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.risk_flags?.filter(f => !f.includes('No critical')).length > 0 && (
        <div className="space-y-1">
          {data.risk_flags.map((f, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{f}
            </p>
          ))}
        </div>
      )}

      {(data as any).extra_context && (() => {
        const ctx = (data as any).extra_context;
        const sales = ctx.sales;
        const credit = ctx.credit;
        const stock = ctx.stock;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {sales && (
              <div className="rounded-lg border p-3 bg-emerald-50/40 dark:bg-emerald-950/20">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wider">
                  📈 Sales {sales.year}
                </p>
                <p className="text-xs font-semibold">{(sales.ca_total || 0).toLocaleString(undefined,{maximumFractionDigits:0})} LYD</p>
                <p className="text-[10px] text-muted-foreground">
                  {sales.evolution_pct != null
                    ? `${sales.evolution_pct > 0 ? '+' : ''}${sales.evolution_pct?.toFixed(1)}% vs prev year`
                    : 'No prior year data'}
                </p>
                {sales.top_clients?.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Top clients</p>
                    {sales.top_clients.slice(0, 3).map((c: any, i: number) => (
                      <p key={i} className="text-[10px] text-foreground truncate">
                        {c.name}: <span className="font-medium">{(c.revenue||0).toLocaleString(undefined,{maximumFractionDigits:0})} LYD</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {credit && (
              <div className="rounded-lg border p-3 bg-orange-50/40 dark:bg-orange-950/20">
                <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 mb-2 uppercase tracking-wider">
                  💳 Receivables
                </p>
                <p className="text-xs font-semibold">{(credit.grand_total_receivables||0).toLocaleString(undefined,{maximumFractionDigits:0})} LYD</p>
                <p className="text-[10px] text-muted-foreground">
                  DSO: {(credit.dso_days||0).toFixed(0)}d
                  {credit.snapshot_date && ` · ${credit.snapshot_date}`}
                </p>
                {credit.top5_risky?.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Top overdue</p>
                    {credit.top5_risky.slice(0, 3).map((r: any, i: number) => {
                      const name = r.account?.split('-').pop()?.trim() || r.account_code;
                      const overdue = Math.max(0, (r.total||0) - (r.current||0));
                      return (
                        <p key={i} className="text-[10px] text-foreground truncate">
                          {name}: <span className="font-medium text-red-600">{overdue.toLocaleString(undefined,{maximumFractionDigits:0})} LYD</span>
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {stock && (
              <div className="rounded-lg border p-3 bg-teal-50/40 dark:bg-teal-950/20">
                <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400 mb-2 uppercase tracking-wider">
                  📦 Stock
                </p>
                <p className="text-xs font-semibold">{(stock.total_stock_value||0).toLocaleString(undefined,{maximumFractionDigits:0})} LYD</p>
                <p className="text-[10px] text-muted-foreground">
                  {stock.total_products} SKUs · {stock.zero_stock_count} out of stock
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Avg rotation: {(stock.avg_rotation||0).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function KPIRow({ label, kpi, commentary }: { label: string; kpi: KPIValue; commentary?: string }) {
  const [open, setOpen] = useState(false);
  const source = (kpi as any).source as string | undefined;
  const sourceBadge: Record<string, { label: string; color: string }> = {
    credit_kpi: { label: 'Credit', color: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400' },
    sales_kpi:  { label: 'Sales',  color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
    stock_kpi:  { label: 'Stock',  color: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400' },
  };
  const badge = source ? sourceBadge[source] : null;

  const fmt = (v: number) => {
    if (label.includes('%') || label.toLowerCase().includes('ratio') || label.toLowerCase().includes('rate')) {
      if (v > 0 && v <= 1) return `${(v * 100).toFixed(1)}%`;
      if (v > 1 && v <= 100) return `${v.toFixed(1)}%`;
    }
    if (label.toLowerCase().includes('days') || label.toLowerCase().includes('dso')) {
      return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} d`;
    }
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M LYD`;
    if (v >= 1_000)     return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} LYD`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={kpi.status} />
          <span className="text-xs font-medium truncate">{label}</span>
          {badge && (
            <span className={`hidden sm:inline text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
        <DeltaBadge delta={kpi.delta_pct} />
      </div>
      <p className="text-sm font-bold mt-1 pl-5">{fmt(kpi.current)}</p>
      {open && commentary && (
        <p className="text-xs text-muted-foreground mt-1.5 border-t pt-1.5">{commentary}</p>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Anomaly Detection
// ─────────────────────────────────────────────────────────────────────────────

function AnomalySection() {
  const { data, loading, error, loadedAt, reload } =
    useAnalyzer(() => aiInsightsApi.anomalies(), []);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={Zap} iconColor="text-yellow-500" title="Anomaly Detection"
          description="3-sigma rolling baseline · scans last 12 months of revenue, transactions & customers"
          loadedAt={loadedAt} loading={loading} onRefresh={reload}
        />
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton rows={3} />}
        {error   && <ErrorState message={error} onRetry={reload} />}
        {data    && <AnomalyContent data={data} />}
      </CardContent>
    </Card>
  );
}

function AnomalyContent({ data }: { data: AnomalyResult }) {
  if (data.anomalies.length === 0) return <EmptyState text="No anomalies detected in the last 12 months." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Critical', n: data.summary.critical, color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
          { label: 'High',     n: data.summary.high,     color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
          { label: 'Medium',   n: data.summary.medium,   color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
          { label: 'Total',    n: data.summary.total,    color: 'bg-muted text-muted-foreground' },
        ].map(({ label, n, color }) => n > 0 && (
          <span key={label} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
            {n} {label}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {data.anomalies.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
      </div>
    </div>
  );
}

function AnomalyCard({ anomaly: a }: { anomaly: Anomaly }) {
  const [open, setOpen] = useState(false);
  const isSpike = a.direction === 'spike';
  const isProductAnomaly = a.anomaly_type === 'product_level';
  const productName = a.product_name || null;
  const productCode = a.product_code || null;
  const Icon = isSpike ? ArrowUpRight : ArrowDownRight;
  const iconColor = isSpike ? 'text-emerald-600' : 'text-red-600';
  const borderMap: Record<string, string> = {
    critical: 'border-l-red-500', high: 'border-l-orange-500',
    medium:   'border-l-amber-400', low: 'border-l-blue-400',
  };

  return (
    <div className={`rounded-lg border-l-4 border border-border p-4 space-y-2 cursor-pointer transition-colors hover:bg-muted/40 ${borderMap[a.severity] ?? ''}`} onClick={() => setOpen(o => !o)}>
      <div className="flex items-start gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
          <span className="text-sm font-semibold capitalize">{a.stream.replace(/_/g, ' ')}</span>
          <span className="text-xs text-muted-foreground">{a.date}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SeverityPill severity={a.severity} />
          <div className="h-6 w-6 flex items-center justify-center">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
        </div>
      </div>

      {isProductAnomaly && (productName || productCode) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {productName && (
            <span className="px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Product: {productName}
            </span>
          )}
          {productCode && (
            <span className="px-2 py-0.5 rounded-full border border-muted-foreground/20 text-muted-foreground">
              Code: {productCode}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <span><span className="text-muted-foreground">Observed:</span> <strong>{a.observed_value.toLocaleString()}</strong></span>
        <span><span className="text-muted-foreground">Expected:</span> {a.expected_value.toLocaleString()}</span>
        <span className={`font-bold ${isSpike ? 'text-emerald-600' : 'text-red-600'}`}>
          {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct.toFixed(0)}% vs average
        </span>
        <span className="text-muted-foreground" title={`Statistical deviation: ${a.z_score.toFixed(2)} standard deviations from mean`}>
          {Math.abs(a.z_score) >= 3.5 ? 'Extreme' : Math.abs(a.z_score) >= 2.5 ? 'Strong' : 'Moderate'} signal
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{a.ai_explanation}</p>

      {open && (
        <div className="border-t pt-3 space-y-2.5">
          {a.likely_causes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">Likely causes</p>
              {a.likely_causes.map((c, i) => (
                <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-indigo-500">{i + 1}.</span>{c}
                </p>
              ))}
            </div>
          )}
          {a.business_impact && (
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">Business impact</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{a.business_impact}</p>
            </div>
          )}
          {a.recommended_actions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">Actions</p>
              {a.recommended_actions.map((act, i) => (
                <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />{act}
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
  const { data, loading, error, loadedAt, reload } =
    useAnalyzer(() => aiInsightsApi.seasonal(), []);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={Calendar} title="Seasonal Trend Analysis"
          description="Multiplicative decomposition · 24-month seasonality indices + trend model"
          loadedAt={loadedAt} loading={loading} onRefresh={reload}
        />
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton rows={4} />}
        {error   && <ErrorState message={error} onRetry={reload} />}
        {data    && <SeasonalContent data={data} />}
      </CardContent>
    </Card>
  );
}

function SeasonalContent({ data }: { data: SeasonalResult }) {
  if (data.error) return <EmptyState text={data.error} />;

  const indices = Object.values(data.seasonality_indices ?? {}).filter(v => v.seasonality_index !== null);
  const chartData = indices.map(v => ({
    name:  v.month_name.slice(0, 3),
    si:    +(v.seasonality_index ?? 1).toFixed(3),
    label: v.label,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-sm font-medium text-indigo-700 dark:text-indigo-300">
          {data.current_season}
        </div>
        {data.upcoming_peak_alert && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" />Peak season approaching — prepare stock now
          </div>
        )}
      </div>

      {data.trend && (
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
            {data.trend.direction === 'growing'   ? <TrendingUp className="h-3 w-3 text-emerald-500" /> :
             data.trend.direction === 'declining' ? <TrendingDown className="h-3 w-3 text-red-500" /> :
             <Minus className="h-3 w-3 text-muted-foreground" />}
            Overall trend: <strong>{data.trend.direction}</strong>
            {' · '}{data.trend.slope_pct_per_month > 0 ? '+' : ''}{data.trend.slope_pct_per_month.toFixed(2)}% per month
          </span>
          <span className="px-2 py-1 rounded-full bg-muted" title="Model fit quality: higher = more reliable">
            Reliability: {data.trend.r_squared >= 0.7 ? 'High' : data.trend.r_squared >= 0.4 ? 'Medium' : 'Low'} ({(data.trend.r_squared * 100).toFixed(0)}%)
          </span>
        </div>
      )}

      {chartData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Monthly demand index (1.0 = average month)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0.5, 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [v, 'SI']} />
                <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="4 4" />
                <Bar dataKey="si" radius={[4, 4, 0, 0]} fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-indigo-600 inline-block" /> Normal/Peak</span>
            <span className="flex items-center gap-1"><span className="h-2 w-8 border-t-2 border-dashed border-gray-400 inline-block" /> Baseline (SI=1.0)</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border bg-indigo-50/50 dark:bg-indigo-950/50">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">📈 Peak months</p>
          <p className="text-sm font-bold">{data.peak_month_names?.join(', ') || '—'}</p>
        </div>
        <div className="p-3 rounded-lg border bg-orange-50/50 dark:bg-orange-950/50">
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">📉 Trough months</p>
          <p className="text-sm font-bold">{data.trough_month_names?.join(', ') || '—'}</p>
        </div>
      </div>

      {data.ramadan_analysis?.detected && (
        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
            🌙 Ramadan / Islamic calendar effect
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
            {data.ramadan_analysis.dominant_effect} · avg index: {data.ramadan_analysis.avg_ramadan_index.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{data.ramadan_analysis.adjustment_note}</p>
        </div>
      )}

      {data.seasonal_narrative && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground mb-1">AI Narrative</p>
          <p className="text-sm leading-relaxed">{data.seasonal_narrative}</p>
        </div>
      )}

      {data.stock_preparation_calendar?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Preparation Calendar</p>
          {data.stock_preparation_calendar.map((item, i) => (
            <div key={i} className="flex gap-3 text-sm p-3 rounded-lg border">
              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">{item.month} · {item.lead_time_weeks}w lead time</p>
                <p className="text-xs text-muted-foreground">{item.action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.ai_recommendations?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommendations</p>
          {data.ai_recommendations.map((r, i) => (
            <p key={i} className="flex gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Churn Prediction
// ─────────────────────────────────────────────────────────────────────────────

function ChurnSection() {
  const { data, loading, error, loadedAt, reload } =
    useAnalyzer(() => aiInsightsApi.churn({ top_n: 20 }), []);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={Users} iconColor="text-violet-600" title="Customer Churn Prediction"
          description="Rule-based pre-scoring + AI refinement for high-risk accounts"
          loadedAt={loadedAt} loading={loading} onRefresh={reload}
        />
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton rows={3} />}
        {error   && <ErrorState message={error} onRetry={reload} />}
        {data    && <ChurnContent data={data} />}
      </CardContent>
    </Card>
  );
}

function ChurnContent({ data }: { data: ChurnResult }) {
  const { summary, predictions } = data;
  if (!predictions?.length) return <EmptyState text="No churn risk detected in active customers." />;

  const chartData = [
    { label: 'Critical', value: summary.critical, fill: '#dc2626' },
    { label: 'High',     value: summary.high,     fill: '#ea580c' },
    { label: 'Medium',   value: summary.medium,   fill: '#d97706' },
    { label: 'Low',      value: summary.low,      fill: '#16a34a' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Critical', n: summary.critical, color: 'text-red-600' },
          { label: 'High',     n: summary.high,     color: 'text-orange-600' },
          { label: 'Medium',   n: summary.medium,   color: 'text-amber-600' },
          { label: 'Avg Score',n: `${(summary.avg_churn_score * 100).toFixed(0)}%`, color: 'text-indigo-600' },
        ].map(({ label, n, color }) => (
          <div key={label} className="text-center p-3 rounded-lg border bg-muted/30">
            <p className={`text-xl font-bold ${color}`}>{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {summary.total > 0 && (
        <div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {chartData.map(d => (
              <div key={d.label} className="h-full rounded-full transition-all"
                style={{ width: `${(d.value / summary.total) * 100}%`, backgroundColor: d.fill }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5">
            {chartData.map(d => (
              <span key={d.label} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: d.fill }} />
                {d.label} ({d.value})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Top at-risk customers
        </p>
        {predictions.slice(0, 10).map((p, i) => (
          <ChurnCard key={i} prediction={p} />
        ))}
      </div>
    </div>
  );
}

function ChurnCard({ prediction: p }: { prediction: ChurnPrediction }) {
  const [open, setOpen] = useState(false);
  const scoreColor = p.churn_score >= 0.75 ? 'bg-red-500'
    : p.churn_score >= 0.50 ? 'bg-orange-500'
    : p.churn_score >= 0.25 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="rounded-lg border">
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors rounded-lg"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold truncate max-w-[180px]">{p.customer_name || p.account_code}</span>
            <SeverityPill severity={p.churn_label} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[100px]">
              <div className={`h-full rounded-full ${scoreColor}`} style={{ width: `${p.churn_score * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{(p.churn_score * 100).toFixed(0)}%</span>
            <span className="text-xs text-muted-foreground">· {p.days_since_last_purchase}d inactive</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            {formatCurrency(p.avg_monthly_revenue_lyd)}/mo
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-muted-foreground">{p.ai_explanation}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Avg Monthly Rev', value: formatCurrency(p.avg_monthly_revenue_lyd) },
              { label: 'Revenue Trend',   value: `${(p.revenue_trend * 100).toFixed(0)}%` },
              { label: 'Overdue Ratio',   value: `${(p.overdue_ratio * 100).toFixed(0)}%` },
              { label: 'Aging Risk',      value: p.aging_risk_score },
              { label: 'Orders 12m',      value: String(p.purchase_count_12m) },
              { label: 'Receivable',      value: formatCurrency(p.total_receivable_lyd) },
            ].map(({ label, value }) => (
              <div key={label} className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground mb-0.5">{label}</p>
                <p className="font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {p.key_risk_factors?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.key_risk_factors.map((f, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950">
                  {f}
                </span>
              ))}
            </div>
          )}

          {p.recommended_actions?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold">Actions</p>
              {p.recommended_actions.map((a, i) => (
                <p key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />{a}
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
// 6. Stock Optimizer — FULLY REDESIGNED (Phase 1-4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phase 2 fix: branch attribution helper.
 * When `selectedBranch` is set, filter items to that branch only.
 * When null, show all items (global view).
 */
function useBranchFilteredItems(
  items: BranchStockItem[],
  selectedBranch: string | null,
  urgencyFilter: 'all' | 'immediate' | 'soon',
) {
  return useMemo(() => {
    let filtered = selectedBranch
      ? items.filter(i => i.branch_name === selectedBranch)
      : items;

    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(i => i.urgency === urgencyFilter);
    }

    return filtered;
  }, [items, selectedBranch, urgencyFilter]);
}

/**
 * Phase 3 fix: per-branch summary computed client-side from items.
 * Used when backend doesn't provide branch_summaries.
 */
function useBranchSummaries(items: BranchStockItem[]) {
  return useMemo(() => {
    const map: Record<string, {
      total_items: number;
      immediate_reorders: number;
      soon_reorders: number;
    }> = {};

    for (const item of items) {
      const b = item.branch_name;
      if (!map[b]) map[b] = { total_items: 0, immediate_reorders: 0, soon_reorders: 0 };
      map[b].total_items++;
      if (item.urgency === 'immediate') map[b].immediate_reorders++;
      if (item.urgency === 'soon')      map[b].soon_reorders++;
    }
    return map;
  }, [items]);
}

export function StockSection() {
  const { data, loading, error, loadedAt, reload } =
    useAnalyzer(() => aiInsightsApi.stock(), []);

  // Cast to richer type (backward compatible)
  const stockData = data as BranchStockResult | null;

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={Package}
          iconColor="text-teal-600"
          title="Stock Optimization"
          description="ABC Pareto + EOQ + ROP · per-branch stock · AI recommendations Class A · real & estimated sources"
          loadedAt={loadedAt}
          loading={loading}
          onRefresh={reload}
        />
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton rows={4} />}
        {error   && <ErrorState message={error} onRetry={reload} />}
        {stockData && <StockContent data={stockData} />}
      </CardContent>
    </Card>
  );
}

function StockContent({ data }: { data: BranchStockResult }) {
  const { summary, items } = data;

  // Phase 3: branch filter state
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter]   = useState<'all' | 'immediate' | 'soon'>('immediate');

  // Phase 1: data source counts
  const realCount     = items.filter(i => i.stock_source === 'real').length;
  const estimateCount = items.filter(i => i.stock_source === 'estimate').length;

  // Phase 2: compute branches deterministically from items
  const branches = useMemo(
    () => Array.from(new Set(items.map(i => i.branch_name))).sort(),
    [items]
  );

  // Phase 3: client-side branch summaries fallback
  const branchSummaries = useBranchSummaries(items as BranchStockItem[]);

  // Phase 2: filtered items (branch + urgency)
  const filtered = useBranchFilteredItems(items as BranchStockItem[], selectedBranch, urgencyFilter);

  // Counts for selected branch (or global)
  const scopedSummary = selectedBranch && branchSummaries[selectedBranch]
    ? branchSummaries[selectedBranch]
    : { total_items: summary.total_items, immediate_reorders: summary.immediate_reorders, soon_reorders: summary.soon_reorders };

  return (
    <div className="space-y-5">

      {/* Phase 1: Data validation banner */}
      <DataValidationBanner
        validation={data.validation}
        snapshotDate={data.snapshot_date}
      />

      {/* Phase 1: Meta pills */}
      <div className="flex flex-wrap gap-2">
        {data.service_level && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium
            bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800
            text-indigo-700 dark:text-indigo-300">
            Service level · {data.service_level}
          </span>
        )}
        {data.analysis_window_days && (
          <span className="px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground">
            Analysis window: {data.analysis_window_days}d
          </span>
        )}
        {realCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium
            bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800
            text-emerald-700 dark:text-emerald-300">
            ✓ {realCount} SKUs from real snapshot
          </span>
        )}
        {estimateCount > 0 && (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium
              bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800
              text-amber-700 dark:text-amber-300"
            title="Stock estimated via purchases − sales. Upload a snapshot for exact values."
          >
            ⚠ {estimateCount} SKUs estimated (no snapshot)
          </span>
        )}
      </div>

      {/* Global KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Class A',    n: summary.class_a_count,      color: 'text-indigo-600' },
          { label: 'Class B',    n: summary.class_b_count,      color: 'text-amber-600' },
          { label: 'Class C',    n: summary.class_c_count,      color: 'text-muted-foreground' },
          { label: '⚠ Reorder', n: summary.immediate_reorders, color: 'text-red-600' },
        ].map(({ label, n, color }) => (
          <div key={label} className="text-center p-3 rounded-lg border bg-muted/30">
            <p className={`text-xl font-bold ${color}`}>{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Secondary summary */}
      {(summary.items_at_or_below_rop > 0 || summary.total_revenue_covered_lyd > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {summary.items_at_or_below_rop > 0 && (
            <div className="p-3 rounded-lg border bg-red-50/30 dark:bg-red-950/20">
              <p className="text-sm font-bold text-red-600">{summary.items_at_or_below_rop}</p>
              <p className="text-xs text-muted-foreground">SKUs at or below ROP</p>
            </div>
          )}
          {summary.total_revenue_covered_lyd > 0 && (
            <div className="p-3 rounded-lg border bg-teal-50/30 dark:bg-teal-950/20">
              <p className="text-sm font-bold text-teal-600">{formatCurrency(summary.total_revenue_covered_lyd)}</p>
              <p className="text-xs text-muted-foreground">Revenue covered ({data.analysis_window_days ?? 90}d)</p>
            </div>
          )}
        </div>
      )}

      {/* Phase 3: BRANCH SELECTOR — critical for multi-branch */}
      {branches.length > 1 && (
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900 p-4 space-y-3 bg-indigo-50/30 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Branch View — {selectedBranch ? selectedBranch : `All ${branches.length} branches`}
            </p>
          </div>
          <BranchSelector
            branches={branches}
            selected={selectedBranch}
            onChange={setSelectedBranch}
          />

          {/* Phase 3: per-branch breakdown table */}
          {selectedBranch === null && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 pr-3 font-semibold text-muted-foreground">Branch</th>
                    <th className="text-right py-1.5 pr-3 font-semibold text-muted-foreground">SKUs</th>
                    <th className="text-right py-1.5 pr-3 font-semibold text-red-600">Immediate</th>
                    <th className="text-right py-1.5 font-semibold text-amber-600">Soon</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => {
                    const s = branchSummaries[b];
                    return (
                      <tr key={b}
                        className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedBranch(b)}
                      >
                        <td className="py-1.5 pr-3 font-medium flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {b}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{s.total_items}</td>
                        <td className="py-1.5 pr-3 text-right text-red-600 font-semibold">{s.immediate_reorders || '—'}</td>
                        <td className="py-1.5 text-right text-amber-600 font-semibold">{s.soon_reorders || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Urgency filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="flex items-center text-xs text-muted-foreground mr-1">
          <Filter className="h-3 w-3 mr-1" />Urgency:
        </span>
        {([
          { key: 'immediate', label: `Immediate (${scopedSummary.immediate_reorders})` },
          { key: 'soon',      label: `Soon (${scopedSummary.soon_reorders})` },
          { key: 'all',       label: `All (${scopedSummary.total_items})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setUrgencyFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              urgencyFilter === key
                ? 'bg-indigo-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Item list */}
      {filtered.length === 0
        ? <EmptyState text="No items match this filter." />
        : (
          <div className="space-y-2">
            {filtered.slice(0, 20).map((item, i) => (
              <StockItemCard key={`${item.product_code}-${item.branch_name}-${i}`} item={item} />
            ))}
            {filtered.length > 20 && (
              <p className="text-center text-xs text-muted-foreground py-2">
                Showing 20 of {filtered.length} items · use branch filter to narrow down
              </p>
            )}
          </div>
        )
      }
    </div>
  );
}

function StockItemCard({ item }: { item: BranchStockItem }) {
  const [open, setOpen] = useState(false);

  const urgencyColor = {
    immediate: 'border-l-red-500 bg-red-50/30 dark:bg-red-950/20',
    soon:      'border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20',
    watch:     'border-l-blue-400',
    ok:        '',
  }[item.urgency] ?? '';

  const classBg: Record<string, string> = {
    A: 'bg-indigo-600',
    B: 'bg-amber-500',
    C: 'bg-gray-400',
  };

  // Phase 1: estimate vs real
  const isEstimate     = item.stock_source === 'estimate';
  // Phase 2 / seasonal
  const hasSeasonBoost = (item.season_multiplier ?? 1) > 1 && item.safety_stock_raw != null;

  return (
    <div className={`rounded-lg border-l-4 border border-border p-3 ${urgencyColor}`}>

      {/* Header row */}
      <button className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`h-5 w-5 rounded-full text-[10px] font-bold text-white
            flex items-center justify-center shrink-0 ${classBg[item.abc_class] ?? 'bg-gray-400'}`}>
            {item.abc_class}
          </span>

          <span className="text-sm font-medium flex-1 truncate min-w-0">{item.product_name}</span>

          {/* Phase 1: estimation badge */}
          {isEstimate && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0
                bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              title="Estimated stock (purchases − sales). No real snapshot available."
            >
              EST.
            </span>
          )}

          {/* Phase 3: branch badge — always visible */}
          <span className="px-2 py-0.5 rounded text-xs font-medium shrink-0
            bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
            <Building2 className="h-3 w-3" />{item.branch_name}
          </span>

          <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
            item.urgency === 'immediate'
              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
              : item.urgency === 'soon'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-muted text-muted-foreground'
          }`}>
            {item.urgency}
          </span>

          {open
            ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </div>

        {/* Quick metrics */}
        <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-muted-foreground">
          <span>
            Stock:{' '}
            <strong className={isEstimate ? 'text-amber-600' : 'text-foreground'}>
              {item.current_stock.toFixed(0)}
              {isEstimate && <span className="ml-0.5 opacity-70">~</span>}
            </strong>
          </span>
          <span>ROP: {item.reorder_point.toFixed(0)}</span>
          <span>EOQ: {item.eoq}</span>
          {item.estimated_days_to_stockout !== null && (
            <span className={item.estimated_days_to_stockout < 7 ? 'text-red-600 font-semibold' : ''}>
              {item.estimated_days_to_stockout.toFixed(0)}d to stockout
            </span>
          )}
        </div>
      </button>

      {/* Phase 4: sibling branches strip — visible in header (collapsed) */}
      {!open && item.sibling_branches && item.sibling_branches.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {item.sibling_branches.slice(0, 4).map((s, i) => (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
              s.urgency === 'ok' || s.urgency === 'watch'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Building2 className="h-2.5 w-2.5" />
              {s.branch_name}: {s.current_stock.toFixed(0)} u
            </span>
          ))}
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="border-t mt-3 pt-3 space-y-3">

          {/* Phase 1: estimation disclaimer */}
          {isEstimate && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg
              bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Estimated</strong> stock via purchases − sales over {item.active_days}d.
                Values may be inaccurate. Upload an inventory snapshot for exact data.
              </p>
            </div>
          )}

          {/* Phase 4: Cross-branch availability panel */}
          {item.sibling_branches && item.sibling_branches.length > 0 && (
            <div className="rounded-lg border border-indigo-100 dark:border-indigo-900 p-3 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <GitMerge className="h-3.5 w-3.5" />Same product in other branches
              </p>
              <div className="flex flex-wrap gap-2">
                {item.sibling_branches.map((s, i) => (
                  <div key={i} className={`px-2.5 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 ${
                    s.urgency === 'ok' || s.urgency === 'watch'
                      ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : s.urgency === 'immediate'
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}>
                    <Building2 className="h-3 w-3" />
                    <span className="font-medium">{s.branch_name}</span>
                    <span>· {s.current_stock.toFixed(0)} u</span>
                    <span className="uppercase font-bold text-[9px]">({s.urgency})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 4: Transfer suggestion */}
          {item.transfer_suggestion && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950">
              <GitMerge className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  AI Transfer Suggestion: move {item.transfer_suggestion.qty} units from {item.transfer_suggestion.from_branch}
                </p>
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                  {item.transfer_suggestion.rationale}
                </p>
              </div>
            </div>
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              {
                label: 'Avg Daily Demand',
                value: `${item.avg_daily_demand.toFixed(2)} u/d`,
              },
              {
                label: 'Safety Stock',
                value: hasSeasonBoost
                  ? `${item.safety_stock.toFixed(0)} u (×${item.season_multiplier!.toFixed(2)} season)`
                  : `${item.safety_stock.toFixed(0)} u`,
              },
              {
                label: `Revenue ${item.active_days ?? 90}d`,
                value: formatCurrency(item.total_revenue_lyd),
              },
              {
                label: 'Revenue/Unit',
                value: formatCurrency(item.revenue_per_unit_lyd),
              },
              {
                label: 'Revenue Share',
                value: `${item.revenue_pct.toFixed(2)}% (cum. ${item.cumulative_pct.toFixed(1)}%)`,
              },
              {
                label: 'Revenue at Risk',
                value: item.revenue_at_risk_lyd > 0 ? formatCurrency(item.revenue_at_risk_lyd) : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground mb-0.5">{label}</p>
                <p className="font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {/* Seasonal safety stock breakdown */}
          {hasSeasonBoost && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg
              bg-indigo-50/50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-xs">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-indigo-600 dark:text-indigo-400">
                Seasonal safety stock adjustment:{' '}
                {item.safety_stock_raw!.toFixed(0)} u (base){' '}
                → <strong>{item.safety_stock.toFixed(0)} u</strong>{' '}
                (×{item.season_multiplier!.toFixed(2)} current month SI)
              </p>
            </div>
          )}

          {/* Phase 4: AI recommendation — now branch-scoped */}
          {item.ai_recommendation && (
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Recommendation — {item.branch_name}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">{item.ai_recommendation}</p>
            </div>
          )}

          {/* Order suggestion */}
          {item.order_suggestion?.quantity && (
            <div className="flex gap-2 p-2.5 rounded-lg border bg-muted/30 text-xs">
              <Target className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Order {item.order_suggestion.quantity} units · {item.order_suggestion.timing}
                </p>
                <p className="text-muted-foreground">{item.order_suggestion.rationale}</p>
              </div>
            </div>
          )}

          {/* Confidence */}
          {item.confidence && (
            <div className="flex justify-end">
              <ConfidencePill confidence={item.confidence} />
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
  const { data, loading, error, loadedAt, reload } =
    useAnalyzer(() => aiInsightsApi.predict(), []);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={Brain} iconColor="text-purple-600" title="Revenue & Demand Forecast"
          description="3-month outlook · best case / expected / worst case · based on your last 12 months of data"
          loadedAt={loadedAt} loading={loading} onRefresh={reload}
        />
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton rows={3} />}
        {error   && <ErrorState message={error} onRetry={reload} />}
        {data    && <PredictorContent data={data} />}
      </CardContent>
    </Card>
  );
}

function PredictorContent({ data }: { data: PredictorResult }) {
  if (!data.revenue_forecast?.length) return <EmptyState text={data.error ?? 'Insufficient data for forecasting.'} />;

  const { trend_model: tm, revenue_forecast: fc } = data;
  const trendColor = tm.direction === 'growing' ? 'text-emerald-600'
    : tm.direction === 'declining' ? 'text-red-600' : 'text-muted-foreground';

  const chartData = fc.map(m => ({
    name:        m.period.replace(/\s\d{4}/, ''),
    base:        Math.round(m.base_lyd),
    optimistic:  Math.round(m.optimistic_lyd),
    pessimistic: Math.round(m.pessimistic_lyd),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted">
          {tm.direction === 'growing'   ? <TrendingUp  className="h-4 w-4 text-emerald-500" /> :
           tm.direction === 'declining' ? <TrendingDown className="h-4 w-4 text-red-500" /> :
           <Minus className="h-4 w-4 text-muted-foreground" />}
          <span className={`font-semibold capitalize ${trendColor}`}>{tm.direction}</span>
          <span className="text-muted-foreground text-xs">
            {(tm as any).slope_pct > 0 ? '+' : ''}{((tm as any).slope_pct ?? 0).toFixed(1)}%/month
            {(tm as any).mape ? ` · ${(tm as any).mape.toFixed(0)}% avg error` : ''}
          </span>
        </div>
        {(data as any).model_type === 'holt_winters' && (
          <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-medium"
            title="Holt-Winters triple exponential smoothing with Monte Carlo simulations">
            AI forecast model · {(data as any).monte_carlo_runs ?? 1000} simulations
          </span>
        )}
        <ConfidencePill confidence={data.confidence} />
      </div>

      {data.forecast_narrative && (
        <p className="text-sm text-muted-foreground leading-relaxed">{data.forecast_narrative}</p>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">3-Month Revenue Forecast (LYD)</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatCurrency(v), '']} />
              <Area type="monotone" dataKey="optimistic"  fill="none" stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="base"        fill="url(#gradBase)" stroke="#4f46e5" strokeWidth={2.5} />
              <Area type="monotone" dataKey="pessimistic" fill="none" stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-0.5 w-6 bg-emerald-500 inline-block" /> Best case</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-6 bg-indigo-600 inline-block" /> Expected</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-6 bg-red-500 inline-block" /> Worst case</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1.5 pr-3 font-semibold text-muted-foreground">Month</th>
              <th className="text-right py-1.5 pr-3 font-semibold text-muted-foreground">Expected</th>
              <th className="text-right py-1.5 pr-3 font-semibold text-emerald-600">Best case</th>
              <th className="text-right py-1.5 font-semibold text-red-600">Worst case</th>
            </tr>
          </thead>
          <tbody>
            {fc.map((m, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                <td className="py-2 pr-3 font-medium">{m.period}</td>
                <td className="py-2 pr-3 text-right font-bold">{formatCurrency(m.base_lyd)}</td>
                <td className="py-2 pr-3 text-right text-emerald-600">+{m.upside_pct.toFixed(1)}%</td>
                <td className="py-2 text-right text-red-600">-{m.downside_pct.toFixed(1)}%</td>
              </tr>
            ))}
            <tr className="font-bold bg-muted/30">
              <td className="py-2 pr-3">3-Month total</td>
              <td className="py-2 pr-3 text-right">{formatCurrency(data.forecast_total_base_lyd)}</td>
              <td className="py-2 pr-3 text-right text-emerald-600">{formatCurrency(data.forecast_total_optimistic_lyd)}</td>
              <td className="py-2 text-right text-red-600">{formatCurrency(data.forecast_total_pessimistic_lyd)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {data.primary_risk && (
        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/50">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />Primary Risk
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{data.primary_risk}</p>
        </div>
      )}

      {data.cash_flow_forecast?.monthly_projections?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cash Flow Forecast · Collection rate {data.cash_flow_forecast.collection_rate_pct.toFixed(0)}%
          </p>
          {data.cash_flow_forecast.monthly_projections.map((m, i) => (
            <div key={i} className="flex items-center gap-3 text-xs p-2.5 rounded-lg border">
              <span className="font-medium w-24 shrink-0">{m.period}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${m.collection_rate_pct}%` }} />
              </div>
              <span className="text-emerald-600 font-semibold w-28 text-right shrink-0">
                {formatCurrency(m.expected_cash_collected_lyd)}
              </span>
              {m.collection_gap_lyd > 0 && (
                <span className="text-red-500 w-24 text-right shrink-0">
                  -{formatCurrency(m.collection_gap_lyd)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {data.recommendations?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strategic Recommendations</p>
          {data.recommendations.map((r, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{r.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="text-purple-600">{r.owner}</span>
                  {r.month_target && <> · Target: {r.month_target}</>}
                  {r.expected_impact_lyd > 0 && <> · {formatCurrency(r.expected_impact_lyd)} impact</>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function AIInsightsPage() {
  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Intelligent Analysis</h1>
            <p className="text-sm text-muted-foreground">AI-powered insights across all business dimensions</p>
          </div>
        </div>
      </div>

      {/* Critical briefing always at top */}
      <CriticalSection />

      {/* Tabbed modules */}
      <Tabs defaultValue="kpis" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-10 min-w-max">
            <TabsTrigger value="kpis"      className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />KPIs
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="gap-1.5 text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5" />Anomalies
            </TabsTrigger>
            <TabsTrigger value="seasonal"  className="gap-1.5 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5" />Seasonal
            </TabsTrigger>
            <TabsTrigger value="churn"     className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />Churn
            </TabsTrigger>
            <TabsTrigger value="stock"     className="gap-1.5 text-xs sm:text-sm">
              <Package className="h-3.5 w-3.5" />Stock
            </TabsTrigger>
            <TabsTrigger value="forecast"  className="gap-1.5 text-xs sm:text-sm">
              <Brain className="h-3.5 w-3.5" />Forecast
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kpis">      <KPISection />       </TabsContent>
        <TabsContent value="anomalies"> <AnomalySection />   </TabsContent>
        <TabsContent value="seasonal">  <SeasonalSection />  </TabsContent>
        <TabsContent value="churn">     <ChurnSection />     </TabsContent>
        <TabsContent value="stock">     <StockSection />     </TabsContent>
        <TabsContent value="forecast">  <PredictorSection /> </TabsContent>
      </Tabs>

      {/* Chat — always visible at the bottom */}
      <AIChat />
    </div>
  );
}