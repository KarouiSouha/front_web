import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Sparkles, CheckCircle2, RefreshCw, Loader2, TrendingDown,
  AlertTriangle, Users, RotateCcw, ShieldAlert, DollarSign,
  Clock, BarChart3, ChevronDown, ChevronUp, Target, Zap,
  TrendingUp, CreditCard, Package, Activity, Search,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DataTable } from '../components/DataTable';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  useAgingRisk, useInventorySnapshots, useInventoryLines,
  useTransactionSummary, useAgingList,
} from '../lib/dataHooks';
import { formatCurrency, formatDate, toNum } from '../lib/utils';
import { api } from '../lib/api';
import { notificationsApi, type AlertSyncItem } from '../lib/notificationsApi';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AlertSeverity = 'low' | 'medium' | 'critical';
type AlertType = 'overdue' | 'risk' | 'low_stock' | 'sales_drop' | 'high_receivables' | 'dso' | 'concentration';

interface SmartAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  detail: string;
  date: string;
  status: 'pending' | 'resolved';
  metadata: Record<string, unknown>;
}

interface AIExplanation {
  summary: string;
  root_cause: string;
  urgency_reason: string;
  recommended_actions: string[];
  risk_level_justification: string;
  confidence: 'high' | 'medium' | 'low';
  cached: boolean;
  _ai_unavailable?: boolean;
}

interface ChurnPrediction {
  customer_id: string | null;
  account_code: string;
  customer_name: string;
  churn_score: number;
  churn_label: 'low' | 'medium' | 'high' | 'critical';
  days_since_last_purchase: number;
  purchase_count_12m: number;
  avg_monthly_revenue_lyd: number;
  avg_order_value_lyd: number;
  revenue_trend: number;
  aging_risk_score: string;
  overdue_ratio: number;
  total_receivable_lyd: number;
  ai_explanation: string;
  recommended_actions: string[];
  key_risk_factors: string[];
  confidence: string;
}

interface ChurnSummary {
  total: number; critical: number; high: number; medium: number;
  low: number; avg_churn_score: number;
}
interface ChurnResponse {
  predictions: ChurnPrediction[];
  summary: ChurnSummary;
  ai_success_rate: number;
  ai_used: boolean;
  cached: boolean;
}

interface InventoryLine {
  product_code: string; product_name: string; product_category: string;
  quantity: string | number; line_value: string | number;
}

interface PredictedOutcome {
  scenario: string; probability: number; description: string;
  revenue_impact_lyd: number; time_to_materialize: string;
}

interface PlaybookAction {
  priority: number; action: string; rationale: string;
  owner: string; deadline_days: number; success_metric: string;
}

interface HVCustomer {
  customer_id: string | null; account_code: string; customer_name?: string;
  annual_revenue_lyd: number; monthly_revenue_lyd: number;
  churn_score: number; churn_label: 'medium' | 'high' | 'critical';
  days_since_last_purchase: number; purchase_count_12m: number;
  avg_order_value_lyd: number; revenue_trend: number;
  aging_risk_score: string; overdue_ratio: number; total_receivable_lyd: number;
  risk_summary: string; early_warning_signals: string[];
  predicted_outcomes: PredictedOutcome[]; retention_playbook: PlaybookAction[];
  estimated_revenue_at_risk: number; confidence: string;
}

interface HVChurnResponse {
  company_id: string; threshold_lyd: number; total_hv_customers: number;
  at_risk_count: number; total_revenue_at_risk: number;
  ai_used: boolean; cached: boolean; customers: HVCustomer[];
}

interface ApiResponse<T> { data: T; }

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<AlertType, string> = {
  overdue: 'OVD', risk: 'RISK', low_stock: 'STK', sales_drop: 'REV', high_receivables: 'REC',
  dso: 'DSO', concentration: 'CONC',
};
const TYPE_LABELS: Record<AlertType, string> = {
  overdue: 'Overdue Payment', risk: 'Credit Risk', low_stock: 'Low Stock',
  sales_drop: 'Sales Drop', high_receivables: 'High Receivables',
  dso: 'DSO Alert', concentration: 'Client Concentration',
};
const today = new Date().toISOString().split('T')[0];

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────

const severityBadge = (s: AlertSeverity) => ({
  low:      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium:   'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}[s]);

const riskBadge = (label: string) => ({
  low: 'bg-emerald-100 text-emerald-800', medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800',
}[label] ?? 'bg-gray-100 text-gray-700');

const confidenceColor = (c: string) =>
  ({ high: 'text-emerald-600', medium: 'text-amber-600', low: 'text-gray-400' }[c] ?? 'text-gray-400');

const churnBorder = (label: string) => ({
  medium: 'border-l-amber-400', high: 'border-l-orange-500',
  critical: 'border-l-red-600', low: 'border-l-emerald-400',
}[label] ?? 'border-l-gray-300');

const trendDisplay = (trend: number) => {
  const pct = Math.abs((trend - 1) * 100).toFixed(0);
  if (trend < 0.95) return { label: `▼ ${pct}%`, cls: 'text-red-600 font-semibold' };
  if (trend > 1.05) return { label: `▲ ${pct}%`, cls: 'text-emerald-600 font-semibold' };
  return { label: '→ Stable', cls: 'text-gray-500' };
};

const priorityBg = (p: number) =>
  (['', 'bg-red-600', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'][p] ?? 'bg-gray-400');

// ─────────────────────────────────────────────────────────────────────────────
// HV sub-components
// ─────────────────────────────────────────────────────────────────────────────

function OutcomeBar({ outcome }: { outcome: PredictedOutcome }) {
  const isNeg = outcome.revenue_impact_lyd < 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{outcome.scenario}</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{outcome.time_to_materialize}</span>
          <span className={`font-bold ${isNeg ? 'text-red-600' : 'text-emerald-600'}`}>
            {isNeg ? `${formatCurrency(Math.abs(outcome.revenue_impact_lyd))} loss` : 'No impact'}
          </span>
          <span className="font-bold w-9 text-right">{(outcome.probability * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${isNeg ? 'bg-red-400' : 'bg-emerald-400'}`}
          style={{ width: `${outcome.probability * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{outcome.description}</p>
    </div>
  );
}

function PlaybookStep({ step, index, total }: { step: PlaybookAction; index: number; total: number }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${priorityBg(step.priority)}`}>
          {step.priority}
        </div>
        {index < total - 1 && <div className="w-px flex-1 bg-border mt-1 mb-0" style={{ minHeight: 12 }} />}
      </div>
      <div className="pb-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{step.action}</p>
          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
            <Clock className="h-3 w-3" />{step.deadline_days}d
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{step.rationale}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" />{step.owner}</Badge>
          <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50">
            <Target className="h-3 w-3 mr-1" />{step.success_metric}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function HVCustomerCard({ customer, rank }: { customer: HVCustomer; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const trend = trendDisplay(customer.revenue_trend);
  return (
    <Card className={`border-l-4 ${churnBorder(customer.churn_label)} transition-shadow hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">#{rank}</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {customer.customer_name || customer.account_code || `ACC-${String(rank).padStart(3, '0')}`}
                </span>
                {customer.customer_name && (
                  <span className="font-mono text-xs text-muted-foreground">{customer.account_code}</span>
                )}
                <Badge className={`text-xs ${riskBadge(customer.churn_label)}`}>{customer.churn_label} risk</Badge>
                <span className={`text-xs ${confidenceColor(customer.confidence)}`}>
                  AI confidence: {customer.confidence}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">{customer.risk_summary}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground mb-0.5">Estimated revenue at risk</div>
            <div className="text-lg font-bold text-red-600">{formatCurrency(customer.estimated_revenue_at_risk)}</div>
          </div>
        </div>
        <div className="space-y-1 mt-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Churn probability score</span>
            <span className="font-bold">{(customer.churn_score * 100).toFixed(0)}%</span>
          </div>
          <Progress value={customer.churn_score * 100} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <DollarSign className="h-4 w-4 text-emerald-600" />, label: 'Annual Revenue', value: formatCurrency(customer.annual_revenue_lyd), sub: `${formatCurrency(customer.monthly_revenue_lyd)}/mo`, cls: '' },
            { icon: <Clock className="h-4 w-4 text-amber-600" />, label: 'Last Purchase', value: `${customer.days_since_last_purchase}d ago`, sub: `${customer.purchase_count_12m} orders / 12 months`, cls: customer.days_since_last_purchase > 90 ? 'text-red-600' : customer.days_since_last_purchase > 60 ? 'text-orange-500' : '' },
            { icon: <BarChart3 className="h-4 w-4 text-blue-600" />, label: 'Revenue Trend', value: trend.label, sub: 'Last 3 months vs prior 3 months', cls: trend.cls },
            { icon: <ShieldAlert className="h-4 w-4 text-purple-600" />, label: 'Payment Risk', value: customer.aging_risk_score, sub: `${(customer.overdue_ratio * 100).toFixed(0)}% of receivables overdue`, cls: customer.aging_risk_score === 'critical' ? 'text-red-600' : customer.aging_risk_score === 'high' ? 'text-orange-500' : '' },
          ].map((kpi, i) => (
            <div key={i} className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{kpi.icon}{kpi.label}</div>
              <div className={`text-sm font-bold capitalize ${kpi.cls}`}>{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.sub}</div>
            </div>
          ))}
        </div>
        {customer.early_warning_signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {customer.early_warning_signals.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />{s}
              </Badge>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full text-xs border border-dashed" onClick={() => setExpanded(v => !v)}>
          {expanded ? <><ChevronUp className="h-4 w-4 mr-1" />Hide detailed analysis</> : <><ChevronDown className="h-4 w-4 mr-1" />View outcome predictions & retention playbook</>}
        </Button>
        {expanded && (
          <div className="space-y-6 pt-3 border-t">
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />Predicted Outcomes — if no action is taken
              </h4>
              <div className="space-y-4">
                {customer.predicted_outcomes.map((o, i) => <OutcomeBar key={i} outcome={o} />)}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-500" />Retention Action Plan
              </h4>
              {customer.retention_playbook.map((step, i) => (
                <PlaybookStep key={i} step={step} index={i} total={customer.retention_playbook.length} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(null);
  const [aiLoading, setAiLoading]         = useState(false);
  const [resolvedIds, setResolvedIds]     = useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId]     = useState<string | null>(null);
  const [alertFilter, setAlertFilter]     = useState<'all' | 'pending' | 'resolved'>('all');
  const [alertSearch, setAlertSearch]     = useState('');

  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [churnSummary, setChurnSummary]         = useState<ChurnSummary | null>(null);
  const [churnAiRate, setChurnAiRate]           = useState<number | null>(null);
  const [churnLoading, setChurnLoading]         = useState(false);
  const [churnLoaded, setChurnLoaded]           = useState(false);
  const [churnError, setChurnError]             = useState<string | null>(null);

  const [hvData, setHvData]           = useState<HVChurnResponse | null>(null);
  const [hvLoading, setHvLoading]     = useState(false);
  const [hvLoaded, setHvLoaded]       = useState(false);
  const [hvError, setHvError]         = useState<string | null>(null);
  const [hvThreshold, setHvThreshold] = useState(100_000);

  const [mainTab, setMainTab] = useState<'alerts' | 'churn' | 'hv-churn'>('alerts');

  // ── FIX: Ref pour éviter les syncs redondants ─────────────────────────────
  // syncAlerts ne sera appelé que si le set d'IDs d'alertes a réellement changé.
  // Sans ce guard, le useEffect se déclenchait à chaque render/poll (12s),
  // créant des centaines de doublons en DB.
  const lastSyncHashRef = useRef<string>('');

  const { data: agingRiskRes, loading: riskLoading, refetch: refetchRisk } = useAgingRisk({ limit: 10 });
  const { data: agingListRes, loading: agingLoading }  = useAgingList({ page_size: 100 });
  const { data: snapshotsRes }                         = useInventorySnapshots({ page_size: 1 });
  const latestSnapId   = snapshotsRes?.items?.[0]?.id ?? null;
  const latestSnapDate = snapshotsRes?.items?.[0]?.uploaded_at?.split('T')[0] ?? today;
  const { data: inventoryRes, loading: invLoading }    = useInventoryLines(latestSnapId, { page_size: 500 });
  const { data: summaryRes, loading: summaryLoading }  = useTransactionSummary();
  const isLoading = riskLoading || agingLoading || invLoading || summaryLoading;

  useEffect(() => {
    (api.get('/ai-insights/alerts/resolutions/') as Promise<ApiResponse<{ resolved_ids: string[] }>>)
      .then(res => setResolvedIds(new Set(res.data?.resolved_ids ?? [])))
      .catch(() => {});
  }, []);

  // ── Alert generation ──────────────────────────────────────────────────────
  const rawAlerts = useMemo<SmartAlert[]>(() => {
    const out: SmartAlert[] = [];
    const topRisk = agingRiskRes?.top_risk ?? [];

    topRisk.forEach(r => {
      const sev: AlertSeverity = ['critical', 'high'].includes(r.risk_score) ? 'critical' : 'medium';
      const hasOverdue = r.overdue_total > 0;
      const isCritical = ['critical', 'high'].includes(r.risk_score);

      if (hasOverdue && isCritical) {
        const overduePct = r.total > 0 ? ((r.overdue_total / r.total) * 100).toFixed(0) : '0';
        out.push({
          id: `combined-${r.id}`,
          type: 'risk',
          severity: sev,
          message: `${r.customer_name || r.account} — ${formatCurrency(r.overdue_total)} overdue (${overduePct}% of total receivable)`,
          detail:  `Credit risk: ${r.risk_score.toUpperCase()} · Total exposure: ${formatCurrency(r.total)} · Account: ${r.account_code}`,
          date: today, status: 'pending',
          metadata: { ...r, _merged: true },
        });
      } else if (hasOverdue) {
        out.push({
          id: `overdue-${r.id}`, type: 'overdue', severity: sev,
          message: `${r.customer_name || r.account} — Overdue balance of ${formatCurrency(r.overdue_total)}`,
          detail:  `Account ${r.account_code} · Total exposure: ${formatCurrency(r.total)}`,
          date: today, status: 'pending', metadata: { ...r },
        });
      } else if (isCritical) {
        out.push({
          id: `risk-${r.id}`, type: 'risk', severity: sev,
          message: `${r.customer_name || r.account} — Credit risk classified as "${r.risk_score}"`,
          detail:  `Total receivable: ${formatCurrency(r.total)} · No overdue balance currently`,
          date: today, status: 'pending', metadata: { ...r },
        });
      }
    });

    const records = agingListRes?.records ?? [];
    records
      .filter(r => r.d181_210 + r.d211_240 + r.d241_270 + r.d271_300 + r.d301_330 + r.over_330 > 0)
      .slice(0, 3)
      .forEach(r => {
        const veryOld = r.d181_210 + r.d211_240 + r.d241_270 + r.d271_300 + r.d301_330 + r.over_330;
        out.push({
          id: `old-overdue-${r.id}`, type: 'high_receivables', severity: 'critical',
          message: `${r.customer_name || r.account} — ${formatCurrency(veryOld)} overdue for more than 6 months`,
          detail:  `Total receivable: ${formatCurrency(r.total)} · Requires immediate collection action`,
          date: r.report_date ?? today, status: 'pending', metadata: { ...r },
        });
      });

    const rawLines: InventoryLine[] = inventoryRes?.lines ?? [];
    const byProduct = rawLines.reduce<Record<string, { product_code: string; product_name: string; product_category: string; total_qty: number; total_value: number }>>((acc, line) => {
      const k = line.product_code;
      if (!acc[k]) acc[k] = { product_code: line.product_code, product_name: line.product_name, product_category: line.product_category, total_qty: 0, total_value: 0 };
      acc[k].total_qty   += toNum(line.quantity);
      acc[k].total_value += toNum(line.line_value);
      return acc;
    }, {});
    Object.values(byProduct).filter(p => p.total_qty === 0).slice(0, 5).forEach(p =>
      out.push({
        id: `zero-stock-${p.product_code}`, type: 'low_stock', severity: 'critical',
        message: `${p.product_name} — Out of stock across all branches`,
        detail:  `Product: ${p.product_code}${p.product_category ? ` · Category: ${p.product_category}` : ''} · Reorder required`,
        date: latestSnapDate, status: 'pending', metadata: { ...p },
      })
    );
    Object.values(byProduct).filter(p => p.total_qty > 0 && p.total_qty < 5).slice(0, 3).forEach(p =>
      out.push({
        id: `low-stock-${p.product_code}`, type: 'low_stock', severity: 'medium',
        message: `${p.product_name} — Critically low stock: ${p.total_qty} units remaining`,
        detail:  `Product: ${p.product_code} · Stock value: ${formatCurrency(p.total_value)}`,
        date: latestSnapDate, status: 'pending', metadata: { ...p },
      })
    );

    const summary = summaryRes?.summary ?? [];
    if (summary.length >= 2) {
      const sorted = [...summary].sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));
      const prev = sorted[sorted.length - 2];
      const curr = sorted[sorted.length - 1];
      if (prev.total_sales > 0) {
        const pct = ((curr.total_sales - prev.total_sales) / prev.total_sales) * 100;
        if (pct < -15) {
          out.push({
            id: `sales-drop-${curr.year}-${curr.month}`, type: 'sales_drop',
            severity: Math.abs(pct) > 30 ? 'critical' : 'medium',
            message: `Revenue declined ${Math.abs(pct).toFixed(1)}% — from ${prev.month_label} to ${curr.month_label}`,
            detail:  `${prev.month_label}: ${formatCurrency(prev.total_sales)} → ${curr.month_label}: ${formatCurrency(curr.total_sales)} (−${formatCurrency(prev.total_sales - curr.total_sales)})`,
            date: today, status: 'pending', metadata: { prev, curr, pctChange: pct },
          });
        }
      }
    }

    const allRecords = agingListRes?.records ?? [];
    if (allRecords.length > 0) {
      const getBucket = (r: typeof allRecords[0], key: string): number => {
        const map: Record<string, number> = {
          d1_30:   Number(r.d1_30   ?? 0), d31_60:  Number(r.d31_60  ?? 0),
          d61_90:  Number(r.d61_90  ?? 0), d91_120: Number(r.d91_120 ?? 0),
          d121_150:Number(r.d121_150?? 0), d151_180:Number(r.d151_180?? 0),
          d181_210:Number(r.d181_210?? 0), d211_240:Number(r.d211_240?? 0),
          d241_270:Number(r.d241_270?? 0), d271_300:Number(r.d271_300?? 0),
          d301_330:Number(r.d301_330?? 0), over_330: Number(r.over_330?? 0),
        };
        return map[key] ?? 0;
      };
      const BUCKETS: Array<[string, number]> = [
        ['d1_30', 15], ['d31_60', 45], ['d61_90', 75],
        ['d91_120', 105], ['d121_150', 135], ['d151_180', 165],
        ['d181_210', 195], ['d211_240', 225], ['d241_270', 255],
        ['d271_300', 285], ['d301_330', 315], ['over_330', 360],
      ];
      let weightedSum = 0;
      let totalOverdue = 0;
      allRecords.forEach(r => {
        BUCKETS.forEach(([key, midpoint]) => {
          const val = getBucket(r, key);
          weightedSum  += val * midpoint;
          totalOverdue += val;
        });
      });
      const dso = totalOverdue > 0 ? Math.round(weightedSum / totalOverdue) : 0;
      if (dso > 60) {
        out.push({
          id:       `dso-${today}`,
          type:     'dso',
          severity: dso > 90 ? 'critical' : 'medium',
          message:  `DSO at ${dso} days — average collection period exceeds target`,
          detail:   `Current DSO: ${dso}d · Target: ≤60d · Overdue portfolio: ${formatCurrency(totalOverdue)} LYD`,
          date:     today,
          status:   'pending',
          metadata: { dso, totalOverdue, target: 60 },
        });
      }
    }

    const allAging = agingListRes?.records ?? [];
    if (allAging.length >= 4) {
      const sorted = [...allAging].sort((a, b) => Number(b.total) - Number(a.total));
      const grandTotal = sorted.reduce((sum, r) => sum + Number(r.total), 0);
      const top3Total  = sorted.slice(0, 3).reduce((sum, r) => sum + Number(r.total), 0);
      const top3Pct    = grandTotal > 0 ? (top3Total / grandTotal) * 100 : 0;
      if (top3Pct > 50) {
        const top3Names = sorted.slice(0, 3)
          .map(r => r.customer_name || r.account || r.account_code)
          .filter(Boolean)
          .join(', ');
        out.push({
          id:       `concentration-${today}`,
          type:     'concentration',
          severity: top3Pct > 70 ? 'critical' : 'medium',
          message:  `Client concentration risk — top 3 accounts hold ${top3Pct.toFixed(0)}% of receivables`,
          detail:   `${top3Names} · Combined: ${formatCurrency(top3Total)} of ${formatCurrency(grandTotal)} total`,
          date:     today,
          status:   'pending',
          metadata: { top3Pct, top3Total, grandTotal, top3Names },
        });
      }
    }

    return out;
  }, [agingRiskRes, agingListRes, inventoryRes, summaryRes, snapshotsRes, latestSnapDate]);

  // ── FIX: Sync alertes → backend avec protection contre les doublons ────────
  // Le useRef `lastSyncHashRef` stocke un hash des IDs d'alertes du dernier
  // sync. Si le hash n'a pas changé (même set d'alertes), on skip l'appel API.
  //
  // AVANT ce fix : syncAlerts était appelé à chaque render + chaque poll de
  // 12s de useNotifications → des centaines de doublons en DB par session.
  //
  // APRÈS ce fix : syncAlerts n'est appelé qu'une seule fois par changement
  // réel du set d'alertes (nouveau chargement de données, refresh manuel).
  useEffect(() => {
    if (rawAlerts.length === 0) return;

    const pendingAlerts = rawAlerts.filter(a => !resolvedIds.has(a.id));
    if (pendingAlerts.length === 0) return;

    // Hash stable basé sur les IDs triés — indépendant de l'ordre du tableau
    const hash = pendingAlerts.map(a => a.id).sort().join('|');
    if (hash === lastSyncHashRef.current) return; // rien de nouveau → skip
    lastSyncHashRef.current = hash;

    const payload: AlertSyncItem[] = pendingAlerts.map(a => ({
      frontend_id: a.id,
      alert_type:  a.type as AlertSyncItem['alert_type'],
      severity:    a.severity,
      title:       a.message.length > 90 ? a.message.slice(0, 87) + '…' : a.message,
      message:     a.message,
      detail:      a.detail,
      metadata:    { ...(a.metadata ?? {}), source: 'alerts_page' },
    }));

    notificationsApi.syncAlerts(payload).catch(() => {
      // Sync best-effort — ne bloque jamais l'UI
    });
  }, [rawAlerts, resolvedIds]);

  const alerts   = rawAlerts.map(a => ({ ...a, status: resolvedIds.has(a.id) ? ('resolved' as const) : ('pending' as const) }));
  const filtered = alerts.filter(a => alertFilter === 'all' ? true : a.status === alertFilter);
  const filteredSearched = alertSearch.trim()
    ? filtered.filter(a => {
        const q = alertSearch.toLowerCase();
        return (
          a.message.toLowerCase().includes(q) ||
          a.detail.toLowerCase().includes(q) ||
          TYPE_LABELS[a.type].toLowerCase().includes(q) ||
          a.severity.toLowerCase().includes(q)
        );
      })
    : filtered;
  const counts = {
    all: alerts.length, pending: alerts.filter(a => a.status === 'pending').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleResolve = async (alert: SmartAlert) => {
    setResolvingId(alert.id);
    try { await api.post('/ai-insights/alerts/resolve/', { alert_id: alert.id, alert_type: alert.type }); } catch { /* optimistic */ }
    setResolvedIds(prev => new Set([...prev, alert.id]));
    if (selectedAlert?.id === alert.id) setSelectedAlert(null);
    setResolvingId(null);
  };

  const handleReopen = async (alertId: string) => {
    try { await api.delete(`/ai-insights/alerts/resolve/${alertId}/`); } catch { /* ignore */ }
    setResolvedIds(prev => { const n = new Set(prev); n.delete(alertId); return n; });
  };

  const handleAiExplain = async (alert: SmartAlert) => {
    setSelectedAlert(alert);
    setAiExplanation(null);
    setAiLoading(true);
    try {
      const raw = await api.post('/ai-insights/alerts/explain/', {
        type: alert.type, severity: alert.severity,
        message: alert.message, detail: alert.detail, metadata: alert.metadata,
      });
      const data = unwrap<AIExplanation>(raw);
      if (data && (data.summary || data.root_cause)) {
        setAiExplanation(data);
      } else {
        throw new Error('empty_response');
      }
    } catch (err) {
      console.error('[AlertsPage] AI explain error:', err);
      const meta = alert.metadata as Record<string, number>;
      const total   = Number(meta?.total   ?? 0);
      const overdue = Number(meta?.overdue_total ?? 0);
      const pct     = total > 0 ? ((overdue / total) * 100).toFixed(0) : '0';
      const riskScore  = String(meta?.risk_score ?? alert.severity);
      const overdueRat = total > 0 ? overdue / total : 0;
      let trendLabel: string;
      let trendIcon: string;
      if (riskScore === 'critical' && overdueRat > 0.75) {
        trendLabel = 'Deteriorating rapidly'; trendIcon = '▼';
      } else if (riskScore === 'high' && overdueRat > 0.50) {
        trendLabel = 'Worsening';             trendIcon = '↘';
      } else if (overdueRat < 0.30) {
        trendLabel = 'Improving';             trendIcon = '↗';
      } else {
        trendLabel = 'Stable risk level';     trendIcon = '→';
      }
      let escalationMsg: string;
      if (overdueRat > 0.75) {
        const d = new Date(); d.setDate(d.getDate() + 30);
        escalationMsg = `Estimated escalation by ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} if no action taken (${(overdueRat*100).toFixed(0)}% overdue — critical threshold).`;
      } else if (overdueRat > 0.50) {
        const d = new Date(); d.setDate(d.getDate() + 60);
        escalationMsg = `Estimated escalation by ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} without intervention (${(overdueRat*100).toFixed(0)}% overdue — high risk).`;
      } else if (overdueRat > 0.25) {
        const d = new Date(); d.setDate(d.getDate() + 90);
        escalationMsg = `Monitor closely — escalation risk by ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} if trend continues (${(overdueRat*100).toFixed(0)}% overdue).`;
      } else {
        escalationMsg = 'No imminent escalation risk based on current overdue ratio.';
      }
      setAiExplanation({
        summary: `${trendIcon} ${trendLabel} — ${alert.message}`,
        root_cause: `${overdue > 0 ? `Outstanding balance of ${formatCurrency(overdue)} (${pct}% of total receivable of ${formatCurrency(total)}) exceeds payment terms.` : alert.detail} ${escalationMsg}`,
        urgency_reason: escalationMsg,
        recommended_actions: [
          `Contact the account manager immediately to initiate a structured repayment plan for the ${formatCurrency(overdue)} outstanding balance.`,
          'Suspend new deliveries pending a formal payment commitment from the client.',
          'Escalate to the financial director if no written commitment is received within 48 hours.',
          'Document all communications in the CRM system for audit trail purposes.',
        ],
        risk_level_justification: `Alert classified as "${alert.severity}" · Severity trend: ${trendLabel} · Based on overdue ratio (${(overdueRat*100).toFixed(0)}%) and aging bucket distribution.`,
        confidence: 'medium', cached: false, _ai_unavailable: true,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleChurnTab = async () => {
    setMainTab('churn');
    if (churnLoaded) return;
    setChurnLoading(true);
    setChurnError(null);
    try {
      const raw = await api.get('/ai-insights/churn/?top_n=20');
      const data = unwrap<ChurnResponse>(raw);
      setChurnPredictions(data?.predictions ?? []);
      setChurnSummary(data?.summary ?? null);
      setChurnAiRate(data?.ai_success_rate ?? null);
      setChurnLoaded(true);
    } catch (err) {
      console.error('[AlertsPage] Churn load error:', err);
      setChurnError('Failed to load churn predictions. Please check the Django console for details.');
    } finally {
      setChurnLoading(false);
    }
  };

  const handleRefreshChurn = async () => {
    setChurnLoading(true);
    setChurnError(null);
    try {
      const raw = await api.get('/ai-insights/churn/?top_n=20&refresh=true');
      const data = unwrap<ChurnResponse>(raw);
      setChurnPredictions(data?.predictions ?? []);
      setChurnSummary(data?.summary ?? null);
      setChurnAiRate(data?.ai_success_rate ?? null);
      setChurnLoaded(true);
    } catch (err) {
      console.error('[AlertsPage] Churn refresh error:', err);
      setChurnError('Refresh failed. Please try again.');
    } finally {
      setChurnLoading(false);
    }
  };

  const loadHvChurn = async (refresh = false) => {
    setHvLoading(true);
    setHvError(null);
    try {
      const raw = await api.get(`/ai-insights/churn/high-value/?threshold=${hvThreshold}&top_n=10&refresh=${refresh}`);
      const data = unwrap<HVChurnResponse>(raw);
      setHvData(data);
      setHvLoaded(true);
    } catch (err) {
      console.error('[AlertsPage] HV churn error:', err);
      setHvError('Failed to load high-value churn data. Please check the Django console for details.');
      setHvData(null);
    } finally {
      setHvLoading(false);
    }
  };

  const handleHvChurnTab = () => {
    setMainTab('hv-churn');
    if (!hvLoaded) loadHvChurn();
  };

  useEffect(() => {
    if (mainTab === 'hv-churn') { setHvLoaded(false); loadHvChurn(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hvThreshold]);

  // ── Columns ───────────────────────────────────────────────────────────────

  const alertColumns = [
    { key: 'type', label: 'Type',
      render: (row: SmartAlert) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{TYPE_ICONS[row.type]}</span>
          <span className="font-medium text-sm">{TYPE_LABELS[row.type]}</span>
        </div>
      )},
    { key: 'message', label: 'Alert',
      render: (row: SmartAlert) => (
        <div>
          <p className="font-medium text-sm leading-snug">{row.message}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{row.detail}</p>
        </div>
      )},
    { key: 'date', label: 'Date', render: (row: SmartAlert) => formatDate(row.date) },
    { key: 'severity', label: 'Severity',
      render: (row: SmartAlert) => <Badge className={severityBadge(row.severity)}>{row.severity}</Badge> },
    { key: 'status', label: 'Status',
      render: (row: SmartAlert) => (
        <Badge variant={row.status === 'pending' ? 'secondary' : 'default'}>
          {row.status === 'pending' ? 'Pending' : 'Resolved'}
        </Badge>
      )},
    { key: 'actions', label: 'Actions',
      render: (row: SmartAlert) => (
        <div className="flex gap-2 flex-wrap">
          {row.status === 'pending' ? (
            <Button variant="outline" size="sm" onClick={() => handleResolve(row)} disabled={resolvingId === row.id}>
              {resolvingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Resolve
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => handleReopen(row.id)}>
              <RotateCcw className="h-4 w-4 mr-1" />Re-open
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => handleAiExplain(row)}>
            <Sparkles className="h-4 w-4 mr-1" />AI Explain
          </Button>
        </div>
      )},
  ];

  const churnColumns = [
    { key: 'account_code', label: 'Customer',
      render: (row: ChurnPrediction) => (
        <div>
          <p className="font-medium text-sm">{row.customer_name || row.account_code || '—'}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.account_code}</p>
        </div>
      )},
    { key: 'churn_score', label: 'Churn Risk',
      render: (row: ChurnPrediction) => (
        <div className="space-y-1 min-w-[140px]">
          <div className="flex items-center justify-between">
            <Badge className={riskBadge(row.churn_label)}>{row.churn_label}</Badge>
            <span className="text-sm font-bold ml-2">{(row.churn_score * 100).toFixed(0)}%</span>
          </div>
          <Progress value={row.churn_score * 100} className="h-1.5" />
        </div>
      )},
    { key: 'days_since_last_purchase', label: 'Last Order',
      render: (row: ChurnPrediction) => (
        <div>
          <span className={`font-semibold text-sm ${row.days_since_last_purchase > 90 ? 'text-red-600' : row.days_since_last_purchase > 60 ? 'text-orange-500' : 'text-foreground'}`}>
            {row.days_since_last_purchase}d ago
          </span>
          <p className="text-xs text-muted-foreground">{row.purchase_count_12m} orders in 12m</p>
        </div>
      )},
    { key: 'revenue_trend', label: 'Revenue Trend',
      render: (row: ChurnPrediction) => {
        const td = trendDisplay(row.revenue_trend);
        return (
          <div>
            <span className={`text-sm font-semibold ${td.cls}`}>{td.label}</span>
            <p className="text-xs text-muted-foreground">vs prior quarter</p>
          </div>
        );
      }},
    { key: 'aging_risk_score', label: 'Payment Risk',
      render: (row: ChurnPrediction) => (
        <div>
          <Badge className={riskBadge(row.aging_risk_score)}>{row.aging_risk_score}</Badge>
          <p className="text-xs text-muted-foreground mt-0.5">{(row.overdue_ratio * 100).toFixed(0)}% overdue</p>
        </div>
      )},
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Smart Alerts & Churn Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Real-time risk alerts · Persistent resolutions · AI-powered churn prediction
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchRisk(); }} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh Data</span>
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Activity className="h-4 w-4" />, label: 'Active Alerts', value: counts.pending, color: 'text-foreground', bg: 'bg-muted/50' },
          { icon: <AlertTriangle className="h-4 w-4" />, label: 'Critical', value: counts.critical, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Resolved', value: counts.resolved, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { icon: <CreditCard className="h-4 w-4" />, label: 'Total Monitored', value: counts.all, color: 'text-foreground', bg: 'bg-muted/50' },
        ].map(s => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.color} opacity-70`}>{s.icon}</div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={mainTab} onValueChange={v => {
        if (v === 'churn') handleChurnTab();
        else if (v === 'hv-churn') handleHvChurnTab();
        else setMainTab('alerts');
      }}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="alerts"><AlertTriangle className="h-4 w-4 mr-2" />Alerts ({counts.all})</TabsTrigger>
          <TabsTrigger value="churn"><TrendingDown className="h-4 w-4 mr-2" />Churn Prediction</TabsTrigger>
          <TabsTrigger value="hv-churn"><ShieldAlert className="h-4 w-4 mr-2" />High-Value Churn</TabsTrigger>
        </TabsList>

        {/* ── ALERTS TAB ── */}
        <TabsContent value="alerts" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-muted-foreground">Loading alert data…</span>
            </div>
          ) : (
            <>
              <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                    <p className="text-sm font-semibold text-foreground">What are Smart Alerts?</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Alerts are generated automatically from your live data — no manual input required.
                    Each alert is triggered by a specific financial signal detected across aging, inventory and sales data.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { code: 'OVD',  label: 'Overdue Payment',    desc: 'Client has unpaid balance past due date',           color: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' },
                      { code: 'RISK', label: 'Credit Risk',         desc: 'More than 50% of receivables are overdue',          color: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' },
                      { code: 'REC',  label: 'High Receivables',    desc: 'Amounts overdue for more than 6 months',            color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' },
                      { code: 'DSO',  label: 'DSO Alert',           desc: 'Average collection period exceeds 60 days',         color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' },
                      { code: 'CONC', label: 'Concentration Risk',  desc: 'Top 3 clients hold more than 50% of exposure',      color: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800' },
                      { code: 'STK',  label: 'Low Stock',           desc: 'Product out of stock or fewer than 5 units',        color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' },
                      { code: 'REV',  label: 'Sales Drop',          desc: 'Revenue declined more than 15% month-over-month',   color: 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800' },
                      { code: 'AI',   label: 'AI Explain',          desc: 'Click any alert for deep analysis with trend & escalation forecast', color: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800' },
                    ].map(item => (
                      <div key={item.code} className={`rounded-lg border p-3 space-y-1.5 ${item.color}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded text-foreground">{item.code}</span>
                          <span className="text-xs font-semibold text-foreground">{item.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Alert Management</CardTitle>
                      <CardDescription>
                        Alerts generated from live aging, inventory and sales data ·
                        Resolutions persist across sessions
                      </CardDescription>
                    </div>
                    <Tabs value={alertFilter} onValueChange={v => setAlertFilter(v as typeof alertFilter)}>
                      <TabsList>
                        <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                        <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                        <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4 w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Search alerts…"
                      value={alertSearch}
                      onChange={e => setAlertSearch(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  {filteredSearched.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-60" />
                      <p className="font-medium">{alertSearch ? 'No alerts match your search' : 'No alerts in this category'}</p>
                    </div>
                  ) : (
                    <DataTable data={filteredSearched} columns={alertColumns} searchable={false} exportable={false} pageSize={10} />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── CHURN TAB ── */}
        <TabsContent value="churn" className="space-y-6 mt-6">
          {churnLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <div className="ml-4">
                <p className="font-semibold">Running churn analysis…</p>
                <p className="text-sm text-muted-foreground">AI is evaluating behavioral signals for each customer</p>
              </div>
            </div>
          ) : churnError ? (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500" />
                <p className="font-semibold text-red-700 mb-1">Failed to load churn predictions</p>
                <p className="text-sm text-red-600 mb-4">{churnError}</p>
                <Button variant="outline" size="sm" onClick={() => { setChurnError(null); setChurnLoaded(false); handleChurnTab(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />Retry
                </Button>
              </CardContent>
            </Card>
          ) : churnLoaded ? (
            <>
              <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">What is churn prediction? </span>
                    This analysis identifies customers who are reducing or stopping their purchases
                    based on recency, revenue trend, order frequency and payment behavior.
                    Each customer is scored 0–100% — the higher the score, the more urgent the intervention.
                    Customer names are never sent to AI; only anonymized behavioral metrics are processed.
                  </div>
                </CardContent>
              </Card>

              {churnSummary && (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                  {[
                    { label: 'Customers Analyzed', value: churnSummary.total, color: '', icon: <Users className="h-4 w-4" /> },
                    { label: 'Critical Risk', value: churnSummary.critical, color: 'text-red-600', icon: <AlertTriangle className="h-4 w-4" /> },
                    { label: 'High Risk', value: churnSummary.high, color: 'text-orange-600', icon: <TrendingDown className="h-4 w-4" /> },
                    { label: 'Medium Risk', value: churnSummary.medium, color: 'text-amber-600', icon: <Activity className="h-4 w-4" /> },
                    { label: 'AI Analysis Rate', value: churnAiRate !== null ? `${churnAiRate}%` : `${(churnSummary.avg_churn_score * 100).toFixed(0)}% avg`, color: churnAiRate !== null && churnAiRate >= 80 ? 'text-emerald-600' : 'text-amber-600', icon: <Sparkles className="h-4 w-4" /> },
                  ].map(s => (
                    <Card key={s.label}>
                      <CardContent className="p-4 flex items-center gap-2">
                        <div className={`${s.color || 'text-muted-foreground'} opacity-70`}>{s.icon}</div>
                        <div>
                          <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                          <div className="text-xs text-muted-foreground">{s.label}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />Customer Churn Risk — All Accounts
                      </CardTitle>
                      <CardDescription>
                        Sorted by churn score · AI confidence reflects data completeness per customer
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefreshChurn} disabled={churnLoading}>
                      <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {churnPredictions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No customers with sufficient purchase history</p>
                      <p className="text-sm mt-1">Minimum 3 orders required for churn analysis</p>
                    </div>
                  ) : (
                    <DataTable data={churnPredictions} columns={churnColumns} searchable={false} exportable={false} pageSize={10} />
                  )}
                </CardContent>
              </Card>

              {churnPredictions.filter(c => ['high', 'critical'].includes(c.churn_label)).length > 0 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">Priority Accounts — Detailed AI Analysis</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      High and critical risk customers with personalized retention recommendations
                    </p>
                  </div>
                  {churnPredictions.filter(c => ['high', 'critical'].includes(c.churn_label)).map((c, i) => (
                    <Card key={c.account_code || i} className={`border-l-4 ${churnBorder(c.churn_label)}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={riskBadge(c.churn_label)}>{c.churn_label}</Badge>
                              <span className="font-medium text-sm">{c.customer_name || c.account_code}</span>
                              <span className="font-mono text-xs text-muted-foreground">{c.account_code}</span>
                              <span className="text-sm font-bold">{(c.churn_score * 100).toFixed(0)}% churn probability</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{c.ai_explanation}</p>
                            {c.key_risk_factors.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Risk Factors</p>
                                <div className="flex gap-1.5 flex-wrap">
                                  {c.key_risk_factors.map((f, j) => (
                                    <Badge key={j} variant="outline" className="text-xs">{f}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {c.recommended_actions.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">Recommended Actions</p>
                                <ul className="space-y-1">
                                  {c.recommended_actions.map((a, j) => (
                                    <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                      <span className="text-indigo-500 font-bold shrink-0 mt-0.5">{j + 1}.</span>
                                      <span>{a}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-xs text-muted-foreground shrink-0 space-y-2 min-w-[130px]">
                            <div>
                              <div className="font-semibold text-foreground text-sm">{c.days_since_last_purchase} days</div>
                              <div>since last order</div>
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm">{formatCurrency(c.avg_monthly_revenue_lyd)}</div>
                              <div>monthly avg revenue</div>
                            </div>
                            <div>
                              <div className={`font-semibold text-sm ${c.overdue_ratio > 0.5 ? 'text-red-600' : 'text-foreground'}`}>
                                {(c.overdue_ratio * 100).toFixed(0)}%
                              </div>
                              <div>overdue ratio</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-lg">Churn Prediction</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">
                Click this tab to run the churn analysis. Results are cached for 6 hours to minimize API costs.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── HIGH-VALUE CHURN TAB ── */}
        <TabsContent value="hv-churn" className="space-y-6 mt-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />High-Value Account Protection
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Monitors accounts above the selected revenue threshold for churn risk ·
                gpt-4o-mini generates outcome scenarios and a personalized retention action plan per account
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select className="h-9 rounded-md border bg-background px-3 text-sm"
                value={hvThreshold} onChange={e => setHvThreshold(Number(e.target.value))} disabled={hvLoading}>
                <option value={10_000}>≥ 10K LYD / year</option>
                <option value={50_000}>≥ 50K LYD / year</option>
                <option value={100_000}>≥ 100K LYD / year</option>
                <option value={500_000}>≥ 500K LYD / year</option>
                <option value={1_000_000}>≥ 1M LYD / year</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => loadHvChurn(true)} disabled={hvLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${hvLoading ? 'animate-spin' : ''}`} />Force Refresh
              </Button>
            </div>
          </div>

          {hvLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <div className="ml-4">
                <p className="font-semibold">Analyzing high-value accounts…</p>
                <p className="text-sm text-muted-foreground">AI is generating outcome predictions and action plans</p>
              </div>
            </div>
          )}

          {hvError && !hvLoading && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500" />
                <p className="font-semibold text-red-700 mb-1">Failed to load data</p>
                <p className="text-sm text-red-600 mb-4">{hvError}</p>
                <Button variant="outline" size="sm" onClick={() => { setHvError(null); loadHvChurn(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {hvData && !hvLoading && !hvError && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Accounts Above Threshold', value: hvData.total_hv_customers, sub: `Annual revenue ≥ ${formatCurrency(hvData.threshold_lyd)}`, icon: <TrendingUp className="h-5 w-5 text-blue-600" />, cls: '' },
                  { label: 'At-Risk Accounts', value: hvData.at_risk_count, sub: `${hvData.customers.filter(c => c.churn_label === 'critical').length} critical · ${hvData.customers.filter(c => c.churn_label === 'high').length} high risk`, icon: <AlertTriangle className="h-5 w-5 text-orange-500" />, cls: hvData.at_risk_count > 0 ? 'text-orange-600' : 'text-emerald-600' },
                  { label: 'Estimated Revenue at Risk', value: formatCurrency(hvData.total_revenue_at_risk), sub: 'Probability-weighted 12-month estimate', icon: <DollarSign className="h-5 w-5 text-red-600" />, cls: 'text-red-600' },
                  { label: 'Analysis Status', value: hvData.cached ? 'Cached' : 'Live', sub: hvData.ai_used ? 'AI outcome predictions active' : 'Rule-based scoring only', icon: <Sparkles className="h-5 w-5 text-indigo-600" />, cls: '' },
                ].map((k, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        {k.icon}{k.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-xl font-bold ${k.cls}`}>{k.value}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {hvData.customers.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-60" />
                    <p className="font-semibold text-lg">No high-value accounts at churn risk</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All accounts above {formatCurrency(hvData.threshold_lyd)} / year show healthy engagement.
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Try lowering the revenue threshold to include more accounts in the analysis.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">At-Risk Accounts ({hvData.customers.length})</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Sorted by churn probability — expand to view outcome predictions and action plan</p>
                  </div>
                  {hvData.customers.map((customer, i) => (
                    <HVCustomerCard key={customer.account_code || i} customer={customer} rank={i + 1} />
                  ))}
                </div>
              )}
            </>
          )}

          {!hvData && !hvLoading && !hvError && (
            <div className="text-center py-20 text-muted-foreground">
              <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-lg">High-Value Account Protection</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">
                Select a revenue threshold above and click an account to run the analysis.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── AI EXPLANATION DIALOG ── */}
      <Dialog open={!!selectedAlert} onOpenChange={() => { setSelectedAlert(null); setAiExplanation(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />AI Alert Analysis
            </DialogTitle>
            <DialogDescription>
              In-depth analysis powered by AI · All data anonymized before processing
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground font-medium">{TYPE_ICONS[selectedAlert.type]}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm leading-snug mb-1">{selectedAlert.message}</h4>
                    <p className="text-xs text-muted-foreground">{selectedAlert.detail}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className={severityBadge(selectedAlert.severity)}>{selectedAlert.severity}</Badge>
                      <Badge variant="outline">{TYPE_LABELS[selectedAlert.type]}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {aiLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  <span className="ml-2 text-muted-foreground">Analyzing with AI…</span>
                </div>
              ) : aiExplanation ? (
                <div className="space-y-4">
                  {aiExplanation._ai_unavailable && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>AI service temporarily unavailable — displaying rule-based analysis using real account data</span>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />Summary
                    </p>
                    <p className="text-sm leading-relaxed">{aiExplanation.summary}</p>
                  </div>

                  {selectedAlert.type !== 'low_stock' && selectedAlert.type !== 'sales_drop' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                        <Activity className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Severity Trend</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            {aiExplanation.risk_level_justification.includes('Deteriorating') ? '▼ Deteriorating rapidly'
                             : aiExplanation.risk_level_justification.includes('Worsening') ? '↘ Worsening'
                             : aiExplanation.risk_level_justification.includes('Improving') ? '↗ Improving'
                             : '→ Stable risk level'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Root Cause</p>
                      <p className="text-sm leading-relaxed">{aiExplanation.root_cause}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Why Act Now</p>
                      <p className="text-sm leading-relaxed">{aiExplanation.urgency_reason}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recommended Actions</p>
                    <div className="space-y-2">
                      {aiExplanation.recommended_actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 rounded-md bg-muted/30 border">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                    <span>
                      AI Confidence:{' '}
                      <span className={`font-semibold ${confidenceColor(aiExplanation.confidence)}`}>
                        {aiExplanation.confidence}
                      </span>
                    </span>
                    <span>{aiExplanation.cached ? 'Cached result' : 'Fresh analysis'}</span>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 pt-1">
                {selectedAlert.status === 'pending' && (
                  <Button className="flex-1" onClick={() => handleResolve(selectedAlert)} disabled={resolvingId === selectedAlert.id}>
                    {resolvingId === selectedAlert.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Mark as Resolved
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setSelectedAlert(null); setAiExplanation(null); }}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}