import { useEffect, useState } from 'react';
import {
  AlertTriangle, RefreshCw, Loader2, TrendingDown, DollarSign,
  ShieldAlert, ChevronDown, ChevronUp, Clock, CheckCircle2,
  Target, Zap, BarChart3, Users,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { formatCurrency } from '../lib/utils';
import { api } from '../lib/api';   // ← instance authentifiée du projet

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ApiResponse<T> { data: T; }
function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as ApiResponse<T>).data;
  return res as T;
}

interface PredictedOutcome {
  scenario: string;
  probability: number;
  description: string;
  revenue_impact_lyd: number;
  time_to_materialize: string;
}

interface PlaybookAction {
  priority: number;
  action: string;
  rationale: string;
  owner: string;
  deadline_days: number;
  success_metric: string;
}

interface HVCustomer {
  customer_id: string | null;
  account_code: string;
  customer_name: string;          // ← nom réel du client (affichage uniquement)
  annual_revenue_lyd: number;
  monthly_revenue_lyd: number;
  churn_score: number;
  churn_label: 'medium' | 'high' | 'critical';
  days_since_last_purchase: number;
  purchase_count_12m: number;
  avg_order_value_lyd: number;
  revenue_trend: number;
  aging_risk_score: string;
  overdue_ratio: number;
  total_receivable_lyd: number;
  risk_summary: string;
  early_warning_signals: string[];
  predicted_outcomes: PredictedOutcome[];
  retention_playbook: PlaybookAction[];
  estimated_revenue_at_risk: number;
  confidence: string;
}

interface HVChurnResponse {
  company_id: string;
  threshold_lyd: number;
  total_hv_customers: number;
  at_risk_count: number;
  total_revenue_at_risk: number;
  ai_used: boolean;
  cached: boolean;
  customers: HVCustomer[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const churnColor = (label: string) => ({
  medium:   'bg-amber-100 text-amber-800',
  high:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  low:      'bg-emerald-100 text-emerald-800',
}[label] ?? 'bg-gray-100 text-gray-800');

const churnBorder = (label: string) => ({
  medium:   'border-l-amber-400',
  high:     'border-l-orange-500',
  critical: 'border-l-red-600',
  low:      'border-l-emerald-400',
}[label] ?? 'border-l-gray-300');

const confidenceColor = (c: string) =>
  ({ high: 'text-emerald-600', medium: 'text-amber-600', low: 'text-gray-400' }[c] ?? 'text-gray-400');

const trendDisplay = (trend: number) => {
  const pct = Math.abs((trend - 1) * 100).toFixed(0);
  if (trend < 0.95) return { label: `▼ ${pct}%`, cls: 'text-red-600 font-semibold' };
  if (trend > 1.05) return { label: `▲ ${pct}%`, cls: 'text-emerald-600 font-semibold' };
  return { label: '→ Stable', cls: 'text-gray-500' };
};

const priorityBg = (p: number) =>
  (['', 'bg-red-600', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'][p] ?? 'bg-gray-400');

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function OutcomeBar({ outcome }: { outcome: PredictedOutcome }) {
  const isNeg = outcome.revenue_impact_lyd < 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{outcome.scenario}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{outcome.time_to_materialize}</span>
          <span className={`font-bold ${isNeg ? 'text-red-600' : 'text-emerald-600'}`}>
            {isNeg ? `${formatCurrency(Math.abs(outcome.revenue_impact_lyd))} loss` : 'No loss'}
          </span>
          <span className="font-semibold w-10 text-right">{(outcome.probability * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
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
        {index < total - 1 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 16 }} />}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
              #{rank}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* ✅ Affiche le vrai nom du client */}
                <span className="font-semibold text-sm">
                  {customer.customer_name || customer.account_code || `HVC-${String(rank).padStart(3, '0')}`}
                </span>
                {customer.customer_name && (
                  <span className="font-mono text-xs text-muted-foreground">{customer.account_code}</span>
                )}
                <Badge className={`text-xs ${churnColor(customer.churn_label)}`}>
                  {customer.churn_label} risk
                </Badge>
                <span className={`text-xs ${confidenceColor(customer.confidence)}`}>
                  AI confidence: {customer.confidence}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
                {customer.risk_summary}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground mb-0.5">Estimated revenue at risk</div>
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(customer.estimated_revenue_at_risk)}
            </div>
          </div>
        </div>
        <div className="space-y-1 mt-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Churn probability</span>
            <span className="font-bold">{(customer.churn_score * 100).toFixed(0)}%</span>
          </div>
          <Progress value={customer.churn_score * 100} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: <DollarSign className="h-4 w-4 text-emerald-600" />,
              label: 'Annual Revenue',
              value: formatCurrency(customer.annual_revenue_lyd),
              sub: `${formatCurrency(customer.monthly_revenue_lyd)}/mo`,
              cls: '',
            },
            {
              icon: <Clock className="h-4 w-4 text-amber-600" />,
              label: 'Last Purchase',
              value: `${customer.days_since_last_purchase}d ago`,
              sub: `${customer.purchase_count_12m} orders / 12m`,
              cls: customer.days_since_last_purchase > 90 ? 'text-red-600'
                 : customer.days_since_last_purchase > 60 ? 'text-orange-500' : '',
            },
            {
              icon: <BarChart3 className="h-4 w-4 text-blue-600" />,
              label: 'Revenue Trend',
              value: trend.label,
              sub: 'Last 3m vs prior 3m',
              cls: trend.cls,
            },
            {
              icon: <ShieldAlert className="h-4 w-4 text-purple-600" />,
              label: 'Payment Risk',
              value: customer.aging_risk_score,
              sub: `${(customer.overdue_ratio * 100).toFixed(0)}% overdue`,
              cls: customer.aging_risk_score === 'critical' ? 'text-red-600'
                 : customer.aging_risk_score === 'high' ? 'text-orange-500' : '',
            },
          ].map((kpi, i) => (
            <div key={i} className="rounded-lg border bg-muted/40 px-3 py-2.5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {kpi.icon}{kpi.label}
              </div>
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

        <Button variant="ghost" size="sm" className="w-full text-xs border border-dashed"
          onClick={() => setExpanded(v => !v)}>
          {expanded
            ? <><ChevronUp className="h-4 w-4 mr-1" />Hide detailed analysis</>
            : <><ChevronDown className="h-4 w-4 mr-1" />View outcome predictions & retention playbook</>}
        </Button>

        {expanded && (
          <div className="space-y-6 pt-3 border-t">
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Predicted Outcomes — if no action is taken
              </h4>
              <div className="space-y-3">
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
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export function HighValueChurnPage() {
  const [data, setData]           = useState<HVChurnResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [threshold, setThreshold] = useState(100_000);  // 100K LYD/an — adapté aux données réelles

  const load = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw  = await api.get(
        `/ai-insights/churn/high-value/?threshold=${threshold}&top_n=10&refresh=${refresh}`
      );
      const data = unwrap<HVChurnResponse>(raw);
      setData(data);
    } catch (e) {
      console.error('[HighValueChurnPage] Load error:', e);
      setError('Failed to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when threshold changes
  useEffect(() => { if (data) load(); }, [threshold]);  // eslint-disable-line react-hooks/exhaustive-deps

  const criticalCount = data?.customers.filter(c => c.churn_label === 'critical').length ?? 0;
  const highCount     = data?.customers.filter(c => c.churn_label === 'high').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            High-Value Customer Churn
          </h1>
          <p className="text-muted-foreground mt-1">
            Customers with annual revenue ≥{' '}
            <span className="font-semibold">{formatCurrency(threshold)}</span>{' '}
            at risk of churning · AI outcome predictions + retention playbooks
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            disabled={loading}
          >
            <option value={10_000}>≥ 10K LYD / year</option>
            <option value={50_000}>≥ 50K LYD / year</option>
            <option value={100_000}>≥ 100K LYD / year</option>
            <option value={500_000}>≥ 500K LYD / year</option>
            <option value={1_000_000}>≥ 1M LYD / year</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => load(true)} disabled={loading}>
            Force Refresh
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 shrink-0">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">High-Value Customer Protection Engine</h3>
              <p className="text-sm text-muted-foreground">
                Monitors accounts above the revenue threshold for behavioral churn signals.
                AI generates outcome scenarios and a prioritized, role-assigned retention playbook.
                Customer names are shown for display — only anonymized behavioral data is sent to AI.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge className="bg-red-600">Revenue Screening</Badge>
                <Badge className="bg-orange-600">Outcome Prediction</Badge>
                <Badge className="bg-indigo-600">Retention Playbooks</Badge>
                <Badge variant="outline">Anonymized AI</Badge>
                <Badge variant="outline">Cached 6h</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          <div className="ml-4">
            <p className="font-semibold">Analyzing high-value accounts…</p>
            <p className="text-sm text-muted-foreground">
              AI is generating outcome predictions and retention playbooks
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 text-center text-red-700">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={() => load()}>
              <RefreshCw className="h-4 w-4 mr-2" />Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && !loading && !error && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                label: 'Accounts Above Threshold',
                value: data.total_hv_customers,
                sub: `Annual revenue ≥ ${formatCurrency(data.threshold_lyd)}`,
                icon: <Users className="h-5 w-5 text-blue-600" />,
                cls: '',
              },
              {
                label: 'At-Risk Accounts',
                value: data.at_risk_count,
                sub: `${criticalCount} critical · ${highCount} high risk`,
                icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
                cls: data.at_risk_count > 0 ? 'text-orange-600' : 'text-emerald-600',
              },
              {
                label: 'Estimated Revenue at Risk',
                value: formatCurrency(data.total_revenue_at_risk),
                sub: 'Probability-weighted 12-month estimate',
                icon: <DollarSign className="h-5 w-5 text-red-600" />,
                cls: 'text-red-600',
              },
              {
                label: 'Analysis Status',
                value: data.cached ? '⚡ Cached' : '🔄 Live',
                sub: data.ai_used ? 'AI outcome predictions active' : 'Rule-based scoring only',
                icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
                cls: '',
              },
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

          {/* Customer list or empty state */}
          {data.customers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-60" />
                <p className="font-semibold text-lg">No high-value accounts at churn risk</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All accounts above {formatCurrency(data.threshold_lyd)} / year show healthy engagement.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Try lowering the revenue threshold to include more accounts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">
                    At-Risk Accounts ({data.customers.length})
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sorted by churn probability · Expand to view outcome predictions & action plan
                  </p>
                </div>
              </div>
              {data.customers.map((customer, i) => (
                <HVCustomerCard
                  key={customer.account_code || i}
                  customer={customer}
                  rank={i + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}