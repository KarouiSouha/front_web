/**
 * HighValueChurnPage.tsx — Redesigned to match DashboardPage aesthetic
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle, RefreshCw, Loader2, TrendingDown, DollarSign,
  ShieldAlert, ChevronDown, ChevronUp, Clock, CheckCircle2,
  Target, Zap, BarChart3, Users, ArrowUpRight,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ApiResponse<T> { data: T; }
function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as ApiResponse<T>).data;
  return res as T;
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
  customer_id: string | null; account_code: string; customer_name: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const churnAccent = (label: string) =>
  ({ critical: C.rose, high: C.orange, medium: C.amber, low: C.emerald }[label] ?? css.mutedFg);

const trendDisplay = (trend: number) => {
  const pct = Math.abs((trend - 1) * 100).toFixed(0);
  if (trend < 0.95) return { label: `▼ ${pct}%`, color: C.rose };
  if (trend > 1.05) return { label: `▲ ${pct}%`, color: C.emerald };
  return { label: '→ Stable', color: css.mutedFg };
};

const priorityColors = ['', C.rose, C.orange, C.amber, C.cyan, '#94a3b8'];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function OutcomeBar({ outcome }: { outcome: PredictedOutcome }) {
  const isNeg = outcome.revenue_impact_lyd < 0;
  const color = isNeg ? C.rose : C.emerald;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: css.cardFg }}>{outcome.scenario}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: css.mutedFg }}>{outcome.time_to_materialize}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{isNeg ? `${formatCurrency(Math.abs(outcome.revenue_impact_lyd))} loss` : 'No loss'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg, minWidth: 36, textAlign: 'right' }}>{(outcome.probability * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${outcome.probability * 100}%`, background: `linear-gradient(90deg, ${color}60, ${color})`, transition: 'width 0.5s ease' }} />
      </div>
      <p style={{ fontSize: 12, color: css.mutedFg, margin: '6px 0 0' }}>{outcome.description}</p>
    </div>
  );
}

function PlaybookStep({ step, index, total }: { step: PlaybookAction; index: number; total: number }) {
  const color = priorityColors[step.priority] ?? '#94a3b8';
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: color, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {step.priority}
        </div>
        {index < total - 1 && <div style={{ width: 1, flex: 1, background: css.border, marginTop: 4, minHeight: 16 }} />}
      </div>
      <div style={{ paddingBottom: 20, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: 0, lineHeight: 1.4 }}>{step.action}</p>
          <span style={{ fontSize: 11, color: css.mutedFg, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />{step.deadline_days}d
          </span>
        </div>
        <p style={{ fontSize: 12, color: css.mutedFg, margin: '5px 0 10px' }}>{step.rationale}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: `1px solid ${css.border}`, color: css.mutedFg, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={11} />{step.owner}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.emerald}30`, color: C.emerald, background: `${C.emerald}10`, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Target size={11} />{step.success_metric}
          </span>
        </div>
      </div>
    </div>
  );
}

function HVCustomerCard({ customer, rank }: { customer: HVCustomer; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const trend    = trendDisplay(customer.revenue_trend);
  const accent   = churnAccent(customer.churn_label);
  const scorePct = customer.churn_score * 100;

  return (
    <div style={{ ...cardStyle, borderLeft: `4px solid ${accent}`, padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Rank badge */}
            <div style={{ width: 40, height: 40, borderRadius: 12, background: css.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: css.cardFg, flexShrink: 0 }}>
              #{rank}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: css.cardFg }}>
                  {customer.customer_name || customer.account_code || `HVC-${String(rank).padStart(3, '0')}`}
                </span>
                {customer.customer_name && (
                  <span style={{ fontSize: 12, color: css.mutedFg, fontFamily: 'monospace' }}>{customer.account_code}</span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase', color: accent, background: `${accent}15`, border: `1px solid ${accent}25` }}>
                  {customer.churn_label} risk
                </span>
                <span style={{ fontSize: 11, color: customer.confidence === 'high' ? C.emerald : customer.confidence === 'medium' ? C.amber : css.mutedFg }}>
                  AI confidence: {customer.confidence}
                </span>
              </div>
              <p style={{ fontSize: 13, color: css.mutedFg, margin: 0, maxWidth: 520, lineHeight: 1.5 }}>{customer.risk_summary}</p>
            </div>
          </div>
          {/* Revenue at risk */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: css.mutedFg, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estimated revenue at risk</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.rose, margin: 0, letterSpacing: '-0.03em' }}>{formatCurrency(customer.estimated_revenue_at_risk)}</p>
          </div>
        </div>

        {/* Churn probability bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: css.mutedFg, fontWeight: 600 }}>Churn probability</span>
            <span style={{ fontWeight: 800, color: accent }}>{scorePct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${scorePct}%`, background: `linear-gradient(90deg, ${accent}70, ${accent})`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, borderTop: `1px solid ${css.border}`, background: css.border }}>
        {[
          {
            icon: <DollarSign size={15} style={{ color: C.emerald }} />,
            label: 'Annual Revenue', value: formatCurrency(customer.annual_revenue_lyd),
            sub: `${formatCurrency(customer.monthly_revenue_lyd)}/mo`, color: '',
          },
          {
            icon: <Clock size={15} style={{ color: C.amber }} />,
            label: 'Last Purchase', value: `${customer.days_since_last_purchase}d ago`,
            sub: `${customer.purchase_count_12m} orders / 12m`,
            color: customer.days_since_last_purchase > 90 ? C.rose : customer.days_since_last_purchase > 60 ? C.orange : '',
          },
          {
            icon: <BarChart3 size={15} style={{ color: C.cyan }} />,
            label: 'Revenue Trend', value: trend.label,
            sub: 'Last 3m vs prior 3m', color: trend.color,
          },
          {
            icon: <ShieldAlert size={15} style={{ color: C.violet }} />,
            label: 'Payment Risk', value: customer.aging_risk_score,
            sub: `${(customer.overdue_ratio * 100).toFixed(0)}% overdue`,
            color: customer.aging_risk_score === 'critical' ? C.rose : customer.aging_risk_score === 'high' ? C.orange : '',
          },
        ].map((kpi, i) => (
          <div key={i} style={{ padding: '14px 18px', background: css.card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              {kpi.icon}
              <span style={{ fontSize: 11, color: css.mutedFg, fontWeight: 600 }}>{kpi.label}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, color: kpi.color || css.cardFg, margin: '0 0 3px', textTransform: 'capitalize', letterSpacing: '-0.02em' }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Warning signals */}
      {customer.early_warning_signals.length > 0 && (
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${css.border}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {customer.early_warning_signals.map((s, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.amber}30`, color: C.amber, background: `${C.amber}10`, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={11} />{s}
            </span>
          ))}
        </div>
      )}

      {/* Expand button */}
      <div style={{ padding: '0 24px 20px' }}>
        <button onClick={() => setExpanded(v => !v)} style={{
          width: '100%', padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', background: 'none', border: `1px dashed ${css.border}`,
          color: css.mutedFg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {expanded
            ? <><ChevronUp size={15} />Hide detailed analysis</>
            : <><ChevronDown size={15} />View outcome predictions & retention playbook</>}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${css.border}`, padding: '24px' }}>
          {/* Outcome predictions */}
          <div style={{ marginBottom: 28 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: css.cardFg, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={15} style={{ color: C.rose }} />
              Predicted Outcomes — if no action is taken
            </h4>
            {customer.predicted_outcomes.map((o, i) => <OutcomeBar key={i} outcome={o} />)}
          </div>

          {/* Retention playbook */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: css.cardFg, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} style={{ color: C.indigo }} />Retention Action Plan
            </h4>
            {customer.retention_playbook.map((step, i) => (
              <PlaybookStep key={i} step={step} index={i} total={customer.retention_playbook.length} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export function HighValueChurnPage() {
  const [data, setData]           = useState<HVChurnResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [threshold, setThreshold] = useState(100_000);

  const load = async (refresh = false) => {
    setLoading(true); setError(null);
    try {
      const raw  = await api.get(`/ai-insights/churn/high-value/?threshold=${threshold}&top_n=10&refresh=${refresh}`);
      setData(unwrap<HVChurnResponse>(raw));
    } catch (e) {
      setError('Failed to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { if (data) load(); }, [threshold]); // eslint-disable-line

  const criticalCount = data?.customers.filter(c => c.churn_label === 'critical').length ?? 0;
  const highCount     = data?.customers.filter(c => c.churn_label === 'high').length ?? 0;

  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.rose}, ${C.orange})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${C.rose}40` }}>
              <ShieldAlert size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>
                High-Value Customer Churn
              </h1>
              <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 3 }}>
                Customers ≥ <strong>{formatCurrency(threshold)}</strong>/year at risk · AI outcome predictions + retention playbooks
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select value={threshold} onChange={e => setThreshold(Number(e.target.value))} disabled={loading}
            style={{ height: 38, borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>
            <option value={10_000}>≥ 10K LYD / year</option>
            <option value={50_000}>≥ 50K LYD / year</option>
            <option value={100_000}>≥ 100K LYD / year</option>
            <option value={500_000}>≥ 500K LYD / year</option>
            <option value={1_000_000}>≥ 1M LYD / year</option>
          </select>
          <button onClick={() => load(false)} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 10,
            border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />Refresh
          </button>
          <button onClick={() => load(true)} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 10,
            border: 'none', background: C.rose, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Force Refresh
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ ...cardStyle, marginBottom: 24, borderTop: `3px solid ${C.rose}`, background: `linear-gradient(135deg, ${C.rose}08, ${C.orange}06)` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldAlert size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: css.cardFg, margin: '0 0 6px' }}>High-Value Customer Protection Engine</h3>
            <p style={{ fontSize: 13, color: css.mutedFg, margin: '0 0 14px', lineHeight: 1.6 }}>
              Monitors accounts above the revenue threshold for behavioral churn signals.
              AI generates outcome scenarios and a prioritized, role-assigned retention playbook.
              Customer names are shown for display — only anonymized behavioral data is sent to AI.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Revenue Screening', color: C.rose },
                { label: 'Outcome Prediction', color: C.orange },
                { label: 'Retention Playbooks', color: C.indigo },
                { label: 'Anonymized AI', color: css.mutedFg },
                { label: 'Cached 6h', color: css.mutedFg },
              ].map(({ label, color }) => (
                <span key={label} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, color, background: `${color}15`, border: `1px solid ${color}25` }}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={28} style={{ color: C.rose, animation: 'spin 1s linear infinite' }} />
          <div style={{ marginLeft: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: css.cardFg, margin: 0 }}>Analyzing high-value accounts…</p>
            <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>AI is generating outcome predictions and retention playbooks</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ ...cardStyle, borderTop: `3px solid ${C.rose}`, textAlign: 'center', padding: '40px 24px' }}>
          <AlertTriangle size={32} style={{ color: C.rose, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: css.cardFg, marginBottom: 16 }}>{error}</p>
          <button onClick={() => load()} style={{
            padding: '8px 20px', borderRadius: 10, border: `1px solid ${css.border}`,
            background: css.card, color: css.cardFg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            <RefreshCw size={14} />Retry
          </button>
        </div>
      )}

      {/* Results */}
      {data && !loading && !error && (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Accounts Above Threshold', value: data.total_hv_customers, sub: `Annual revenue ≥ ${formatCurrency(data.threshold_lyd)}`, icon: Users, accent: C.cyan },
              { label: 'At-Risk Accounts', value: data.at_risk_count, sub: `${criticalCount} critical · ${highCount} high risk`, icon: AlertTriangle, accent: data.at_risk_count > 0 ? C.orange : C.emerald },
              { label: 'Revenue at Risk', value: formatCurrency(data.total_revenue_at_risk), sub: 'Probability-weighted 12-month', icon: DollarSign, accent: C.rose },
              { label: 'Analysis Status', value: data.cached ? '⚡ Cached' : '🔄 Live', sub: data.ai_used ? 'AI outcome predictions active' : 'Rule-based scoring only', icon: CheckCircle2, accent: C.emerald },
            ].map((k, i) => (
              <div key={i} style={{ ...cardStyle, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${k.accent}`, paddingTop: 20 }}>
                <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: k.accent, opacity: 0.06 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.accent}15`, border: `1px solid ${k.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <k.icon size={15} style={{ color: k.accent }} />
                  </div>
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>{k.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: css.cardFg, margin: '5px 0 4px', letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
                <p style={{ fontSize: 11, color: css.mutedFg, margin: '0 0 12px' }}>{k.sub}</p>
                <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, width: '64%', background: `linear-gradient(90deg, ${k.accent}60, ${k.accent})` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Customer list or empty state */}
          {data.customers.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px' }}>
              <CheckCircle2 size={48} style={{ color: C.emerald, marginBottom: 14, opacity: 0.6 }} />
              <p style={{ fontSize: 18, fontWeight: 700, color: css.cardFg, margin: '0 0 8px' }}>No high-value accounts at churn risk</p>
              <p style={{ fontSize: 14, color: css.mutedFg, margin: 0 }}>All accounts above {formatCurrency(data.threshold_lyd)} / year show healthy engagement.</p>
              <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 6 }}>Try lowering the revenue threshold to include more accounts.</p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: css.fg, margin: 0, letterSpacing: '-0.02em' }}>
                  At-Risk Accounts ({data.customers.length})
                </h2>
                <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 4 }}>
                  Sorted by churn probability · Expand to view outcome predictions & action plan
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data.customers.map((customer, i) => (
                  <HVCustomerCard key={customer.account_code || i} customer={customer} rank={i + 1} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}