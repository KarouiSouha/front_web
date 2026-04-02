/**
 * SalesBehaviorReport.tsx
 * ──────────────────────────────────────────────────────────────────────────
 * Sales Behavior Report — built directly from AI Insights APIs.
 *
 * Modules consumed:
 *   /ai-insights/kpis/       → KPI health, sales context, top clients/products
 *   /ai-insights/anomalies/  → Revenue anomalies, spikes/drops
 *   /ai-insights/churn/      → Customer segment risk
 *   /ai-insights/stock/      → Product mix, reorder urgency
 *   /ai-insights/seasonal/   → Time & seasonal patterns
 *   /ai-insights/predict/    → 3-month forecast
 *   /ai-insights/critical/   → Executive briefing, action plan, exposure
 *
 * NO chat API. NO raw JSON rendering.
 * Clean, structured, print-ready.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Printer, Loader2, AlertCircle,
  Sparkles, TrendingUp, TrendingDown, Users, Package,
  Calendar, ShieldAlert, BarChart3, Target, Zap,
  ArrowUpRight, ArrowDownRight, Minus, Clock, Activity,
  ChevronRight, AlertTriangle, CheckCircle2, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, Cell,
  AreaChart, Area,
} from 'recharts';
import {
  aiInsightsApi,
  type KPIResult, type AnomalyResult, type ChurnResult,
  type StockResult, type SeasonalResult, type PredictorResult,
  type CriticalDetectionResult,
} from '../lib/aiInsightsApi';
import { formatCurrency } from '../lib/utils';

// ─── Design tokens (consistent with sibling reports) ────────────────────────
const C = {
  indigo:  '#6366f1', violet: '#8b5cf6', cyan:    '#0ea5e9',
  teal:    '#14b8a6', emerald:'#10b981', amber:   '#f59e0b',
  orange:  '#f97316', rose:   '#f43f5e', sky:     '#38bdf8',
};
const css = {
  card:    'hsl(var(--card))',    cardFg: 'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))', muted:  'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg:      'hsl(var(--background))', fg: 'hsl(var(--foreground))',
};
const card: React.CSSProperties = {
  background: css.card, borderRadius: 14, padding: 22,
  boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 18px rgba(0,0,0,0.05)',
  border: `1px solid ${css.border}`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fc   = (v: number | undefined | null) => formatCurrency(v ?? 0);
const fn   = (v: number | undefined | null) => (v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const pct  = (v: number)  => `${(v * 100).toFixed(1)}%`;
const sign = (v: number)  => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

function hColor(s?: number) {
  if (!s) return '#94a3b8';
  if (s >= 75) return C.emerald;
  if (s >= 55) return C.amber;
  return C.rose;
}

// ─── Tiny atoms ─────────────────────────────────────────────────────────────
function Spin() {
  return <Loader2 size={18} className="animate-spin" style={{ color: C.indigo }} />;
}
function Empty({ text = 'No data available', h = 80 }: { text?: string; h?: number }) {
  return (
    <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 12, gap: 6 }}>
      <AlertCircle size={13} style={{ opacity: 0.4 }} />{text}
    </div>
  );
}
function SeverityDot({ s }: { s: string }) {
  const c = { critical: C.rose, high: C.orange, medium: C.amber, low: C.emerald }[s] ?? '#94a3b8';
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />;
}
function SeverityBadge({ s }: { s: string }) {
  const cfg: Record<string, [string, string]> = {
    critical: [C.rose,    '#fee2e2'],
    high:     [C.orange,  '#ffedd5'],
    medium:   [C.amber,   '#fef3c7'],
    low:      [C.emerald, '#d1fae5'],
  };
  const [fg, bg] = cfg[s] ?? ['#64748b', '#f1f5f9'];
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.06em', border: `1px solid ${fg}25` }}>
      {s}
    </span>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SecHead({ letter, title, sub, color }: { letter: string; title: string; sub: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${color}20` }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0, border: `1px solid ${color}30` }}>
        {letter}
      </div>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: css.fg, margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
        <p style={{ fontSize: 11, color: css.mutedFg, margin: '2px 0 0' }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── KPI chip ────────────────────────────────────────────────────────────────
function KChip({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ border: `1px solid ${css.border}`, borderRadius: 12, padding: '13px 15px', background: `${color}06`, borderLeft: `3px solid ${color}` }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: css.mutedFg }}>{label}</p>
      <p style={{ margin: '5px 0 0', fontSize: 20, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 10, color: css.mutedFg, lineHeight: 1.3 }}>{sub}</p>}
    </div>
  );
}

// ─── Bar row ─────────────────────────────────────────────────────────────────
function BarRow({ label, value, max, accent, sub }: { label: string; value: number; max: number; accent: string; sub?: string }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: css.cardFg, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexShrink: 0, marginLeft: 10 }}>
          {sub && <span style={{ fontSize: 10, color: css.mutedFg }}>{sub}</span>}
          <span style={{ fontSize: 12, fontWeight: 800, color: accent }}>{fc(value)}</span>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${w}%`, background: `linear-gradient(90deg,${accent}70,${accent})` }} />
      </div>
    </div>
  );
}

// ─── All data type ────────────────────────────────────────────────────────────
interface ReportData {
  kpi:      KPIResult | null;
  anomaly:  AnomalyResult | null;
  churn:    ChurnResult | null;
  stock:    StockResult | null;
  seasonal: SeasonalResult | null;
  forecast: PredictorResult | null;
  critical: CriticalDetectionResult | null;
}

// ─── Section A — Executive Summary ───────────────────────────────────────────
function SectionExecutive({ d }: { d: ReportData }) {
  const kpi = d.kpi;
  const crit = d.critical;
  if (!kpi && !crit) return <Empty />;
  const hs = kpi?.health_score;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Health gauge + briefing */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Radial gauge */}
        <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: css.muted }}>
          <svg viewBox="0 0 80 80" width="72" height="72" style={{ display: 'block', margin: '0 auto' }}>
            <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="7" />
            <circle cx="40" cy="40" r="32" fill="none" stroke={hColor(hs)} strokeWidth="7"
              strokeDasharray={`${(hs ?? 0) * 2.01} 201`} strokeLinecap="round"
              transform="rotate(-90 40 40)" />
            <text x="40" y="44" textAnchor="middle" fontSize="15" fontWeight="800" fill={hColor(hs)}>{hs ?? '—'}</text>
          </svg>
          <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase' }}>KPI Health</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: hColor(hs), textTransform: 'capitalize' }}>{kpi?.health_label ?? 'n/a'}</p>
        </div>

        <div>
          {crit?.executive_briefing && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: `${C.indigo}06`, border: `1px solid ${C.indigo}20`, marginBottom: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.indigo, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldAlert size={10} />Executive Briefing
              </p>
              <p style={{ margin: 0, fontSize: 12.5, color: css.cardFg, lineHeight: 1.65 }}>{crit.executive_briefing}</p>
            </div>
          )}
          {kpi?.top_insight && (
            <div style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card }}>
              <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top Insight</p>
              <p style={{ margin: 0, fontSize: 12.5, color: css.cardFg, lineHeight: 1.6 }}>{kpi.top_insight}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary counts */}
      {kpi && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'KPIs Green',   v: kpi.summary.green,  color: C.emerald },
            { label: 'KPIs Amber',   v: kpi.summary.amber,  color: C.amber  },
            { label: 'KPIs Red',     v: kpi.summary.red,    color: C.rose   },
            { label: 'Total KPIs',   v: kpi.summary.total_kpis, color: C.indigo },
          ].map(({ label, v, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '10px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}20` }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{v}</p>
              <p style={{ margin: '3px 0 0', fontSize: 10, color: css.mutedFg }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risk flags */}
      {kpi?.risk_flags?.filter(f => !f.toLowerCase().includes('no critical')).slice(0, 4).map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 8, background: '#fee2e220', border: '1px solid #fca5a540' }}>
          <AlertTriangle size={12} style={{ color: C.rose, flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12, color: css.cardFg }}>{f}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Section B — Channel Behavior ────────────────────────────────────────────
function SectionChannel({ d }: { d: ReportData }) {
  const sales = (d.kpi as any)?.extra_context?.sales;
  const kpi = d.kpi;
  const totalRev = sales?.ca_total ?? 0;
  const topClients: { name: string; revenue: number }[] = sales?.top_clients ?? [];
  const topProducts: { code: string; name: string; revenue: number }[] = sales?.top_products ?? [];
  const maxClient = topClients[0]?.revenue ?? 1;
  const maxProduct = topProducts[0]?.revenue ?? 1;

  if (!sales) return <Empty text="Sales context not yet cached — refresh KPI module first" />;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Revenue summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ ...card, padding: '14px 16px', borderLeft: `3px solid ${C.indigo}` }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase' }}>Total Revenue YTD</p>
          <p style={{ margin: '5px 0 2px', fontSize: 18, fontWeight: 800, color: C.indigo }}>{fc(totalRev)}</p>
          <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>Year {sales.year ?? '—'}</p>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: `3px solid ${C.emerald}` }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase' }}>YoY Evolution</p>
          <p style={{ margin: '5px 0 2px', fontSize: 18, fontWeight: 800, color: sales.evolution_pct != null ? (sales.evolution_pct >= 0 ? C.emerald : C.rose) : css.mutedFg }}>
            {sales.evolution_pct != null ? sign(sales.evolution_pct) : '—'}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>vs prior year</p>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: `3px solid ${C.amber}` }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase' }}>Gross Margin</p>
          <p style={{ margin: '5px 0 2px', fontSize: 18, fontWeight: 800, color: C.amber }}>
            {sales.margin_pct != null ? `${sales.margin_pct.toFixed(1)}%` : '—'}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>Direct sales channel</p>
        </div>
      </div>

      {/* Top clients + top products side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={card}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} style={{ color: C.indigo }} />Top Clients by Revenue
          </p>
          {topClients.length === 0 ? <Empty /> : topClients.map((c, i) => (
            <BarRow key={i} label={c.name} value={c.revenue} max={maxClient} accent={C.indigo} />
          ))}
        </div>
        <div style={card}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={13} style={{ color: C.teal }} />Top Products by Revenue
          </p>
          {topProducts.length === 0 ? <Empty /> : topProducts.map((p, i) => (
            <BarRow key={i} label={p.name || p.code} value={p.revenue} max={maxProduct} accent={C.teal} sub={p.code} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section C — Customer Segment Behavior ───────────────────────────────────
function SectionSegment({ d }: { d: ReportData }) {
  const churn = d.churn;
  if (!churn || !churn.predictions?.length) return <Empty text="No segment data — churn module returned no active customers" />;

  const { summary, predictions } = churn;
  const critHighPreds = predictions.filter(p => p.churn_label === 'critical' || p.churn_label === 'high').slice(0, 8);

  // Aggregate unique recommended actions across all critical/high customers (deduped)
  const allActions: string[] = [];
  const seen = new Set<string>();
  critHighPreds.forEach(p => {
    (p.recommended_actions ?? []).forEach(a => {
      const key = a.slice(0, 60);
      if (!seen.has(key)) { seen.add(key); allActions.push(a); }
    });
  });
  const topActions = allActions.slice(0, 5);

  // Key risk factors distribution
  const factorMap: Record<string, number> = {};
  critHighPreds.forEach(p => {
    (p.key_risk_factors ?? []).forEach(f => {
      const k = f.split(':')[0].trim();
      factorMap[k] = (factorMap[k] ?? 0) + 1;
    });
  });
  const topFactors = Object.entries(factorMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Revenue at risk
  const revenueAtRisk = critHighPreds.reduce((s, p) => s + (p.avg_monthly_revenue_lyd ?? 0) * 3, 0); // ~3 month exposure

  return (
    <div style={{ display: 'grid', gap: 14 }}>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Tracked',    v: summary.total,    color: C.indigo },
          { label: 'Critical Risk',    v: summary.critical, color: C.rose   },
          { label: 'High Risk',        v: summary.high,     color: C.orange },
          { label: 'Medium Risk',      v: summary.medium,   color: C.amber  },
          { label: 'Avg Churn Score',  v: `${(summary.avg_churn_score * 100).toFixed(0)}%`, color: C.violet },
        ].map(({ label, v, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '10px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}20` }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{v}</p>
            <p style={{ margin: '3px 0 0', fontSize: 10, color: css.mutedFg }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue exposure banner */}
      {revenueAtRisk > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: '#fee2e225', border: `1px solid ${C.rose}40` }}>
          <AlertTriangle size={15} style={{ color: C.rose, flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg }}>Estimated 3-month revenue at risk: </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.rose }}>{fc(revenueAtRisk)}</span>
            <span style={{ fontSize: 11, color: css.mutedFg, marginLeft: 8 }}>across {critHighPreds.length} critical/high accounts</span>
          </div>
        </div>
      )}

      {/* At-risk customers + risk factors side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, alignItems: 'start' }}>

        {/* Customer list */}
        {critHighPreds.length > 0 && (
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} style={{ color: C.rose }} />At-Risk Customers — Critical & High
            </p>
            <div style={{ display: 'grid', gap: 7 }}>
              {critHighPreds.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${p.churn_label === 'critical' ? C.rose + '30' : C.orange + '30'}`, background: p.churn_label === 'critical' ? '#fee2e210' : '#fff7ed10' }}>
                  <SeverityDot s={p.churn_label} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: css.cardFg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.customer_name || p.account_code}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>
                      Inactive {p.days_since_last_purchase}d · {fc(p.avg_monthly_revenue_lyd)}/mo avg
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <SeverityBadge s={p.churn_label} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: p.churn_label === 'critical' ? C.rose : C.orange }}>{(p.churn_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk factors distribution */}
        {topFactors.length > 0 && (
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} style={{ color: C.orange }} />Common Risk Factors
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {topFactors.map(([factor, count], i) => {
                const maxCount = topFactors[0][1];
                const w = Math.min(100, (count / maxCount) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: css.cardFg }}>{factor}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.orange }}>{count} accounts</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, width: `${w}%`, background: `linear-gradient(90deg,${C.orange}70,${C.orange})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── AI Recommended Actions ── */}
      {topActions.length > 0 && (
        <div style={{ borderRadius: 12, border: `1px solid ${C.emerald}30`, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '10px 16px', background: `${C.emerald}12`, borderBottom: `1px solid ${C.emerald}25`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={13} style={{ color: C.emerald }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.emerald }}>AI Recommended Actions — Customer Retention</p>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: css.mutedFg }}>Based on churn signals from {critHighPreds.length} at-risk accounts</span>
          </div>
          {/* Actions list */}
          <div style={{ padding: '12px 16px', display: 'grid', gap: 8 }}>
            {topActions.map((action, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${C.emerald}18`, color: C.emerald, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: css.cardFg, lineHeight: 1.6 }}>{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section D — Product Mix & Stock Signals ─────────────────────────────────
function SectionProduct({ d }: { d: ReportData }) {
  const stock = d.stock;
  if (!stock || !stock.items?.length) return <Empty text="No stock data available" />;

  const { summary, items } = stock;
  const classA  = items.filter(i => i.abc_class === 'A').slice(0, 6);
  const urgent  = items.filter(i => i.urgency === 'immediate' || i.urgency === 'soon').slice(0, 8);
  const maxRev  = classA[0]?.total_revenue_lyd ?? 1;

  const urgencyColor = (u: string) =>
    u === 'immediate' ? { bg: '#fee2e2', fg: C.rose } : { bg: '#ffedd5', fg: C.orange };

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* KPI summary — wraps naturally, no overflow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { label: 'Class A SKUs',       v: summary.class_a_count,      color: C.indigo  },
          { label: 'Class B SKUs',       v: summary.class_b_count,      color: C.cyan    },
          { label: 'Class C SKUs',       v: summary.class_c_count,      color: css.mutedFg },
          { label: 'Immediate Reorder',  v: summary.immediate_reorders, color: C.rose    },
          { label: 'Soon Reorder',       v: summary.soon_reorders,      color: C.orange  },
          { label: 'Revenue Covered',    v: fc(summary.total_revenue_covered_lyd), color: C.emerald },
        ].map(({ label, v, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: `${color === css.mutedFg ? '#94a3b8' : color}08`, border: `1px solid ${color === css.mutedFg ? '#94a3b8' : color}20` }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: color === css.mutedFg ? '#94a3b8' : color }}>{v}</p>
            <p style={{ margin: '3px 0 0', fontSize: 9.5, color: css.mutedFg, lineHeight: 1.3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Class A — Top Revenue Drivers (full width) */}
      <div style={card}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={13} style={{ color: C.indigo }} />Class A — Top Revenue Drivers
          <span style={{ marginLeft: 'auto', fontSize: 10, color: css.mutedFg }}>Pareto top 80%</span>
        </p>
        <div style={{ display: 'grid', gap: 9 }}>
          {classA.length === 0 ? <Empty /> : classA.map((item, i) => {
            const w = maxRev > 0 ? Math.min(100, (item.total_revenue_lyd / maxRev) * 100) : 0;
            return (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, width: 16, color: i < 3 ? C.indigo : css.mutedFg, flexShrink: 0 }}>{i + 1}</span>
                  {/* Name truncated with title tooltip — no overflow */}
                  <span title={item.product_name} style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: css.cardFg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {item.product_name}
                  </span>
                  <span style={{ fontSize: 10, color: css.mutedFg, flexShrink: 0 }}>{item.avg_daily_demand.toFixed(1)} u/d</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.indigo, flexShrink: 0 }}>{fc(item.total_revenue_lyd)}</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: css.muted, overflow: 'hidden', marginLeft: 24 }}>
                  <div style={{ height: '100%', borderRadius: 999, width: `${w}%`, background: `linear-gradient(90deg,${C.indigo}60,${C.indigo})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent Stock Alerts (full width) */}
      <div style={card}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} style={{ color: C.rose }} />Urgent Stock Alerts
          <span style={{ marginLeft: 'auto', fontSize: 10, color: css.mutedFg }}>{urgent.length} products require action</span>
        </p>
        {urgent.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: C.emerald, fontSize: 12 }}>
            <CheckCircle2 size={15} />All products within safe stock levels
          </div>
        ) : (
          /* Responsive 2-column grid for alerts — they stay in view */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {urgent.map((item, i) => {
              const { bg, fg } = urgencyColor(item.urgency);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: bg + '25', border: `1px solid ${fg}30` }}>
                  <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: bg, color: fg, textTransform: 'uppercase', flexShrink: 0, letterSpacing: '0.04em' }}>
                    {item.urgency}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p title={item.product_name} style={{ margin: 0, fontSize: 11, fontWeight: 600, color: css.cardFg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.product_name}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>
                      {item.estimated_days_to_stockout != null
                        ? `${item.estimated_days_to_stockout}d left`
                        : 'Stockout now'} · Class {item.abc_class}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI recommendations for Class A (full width, one per row) */}
      {classA.filter(i => i.ai_recommendation).length > 0 && (
        <div style={{ borderRadius: 12, border: `1px solid ${C.indigo}28`, overflow: 'hidden' }}>
          <div style={{ padding: '9px 14px', background: `${C.indigo}10`, borderBottom: `1px solid ${C.indigo}22`, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Sparkles size={12} style={{ color: C.indigo }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.indigo }}>AI Reorder Recommendations — Class A</p>
          </div>
          <div style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
            {classA.filter(i => i.ai_recommendation).slice(0, 3).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Package size={13} style={{ color: C.indigo, flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: C.indigo, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.product_name}>{item.product_name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: css.cardFg, lineHeight: 1.55 }}>{item.ai_recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section E — Time & Seasonal Patterns ────────────────────────────────────
function SectionTime({ d }: { d: ReportData }) {
  const sea  = d.seasonal;
  const fore = d.forecast;
  if (!sea && !fore) return <Empty />;

  const indices  = sea ? Object.values(sea.seasonality_indices ?? {}) : [];
  const peaks    = sea?.peak_month_names    ?? [];
  const troughs  = sea?.trough_month_names  ?? [];

  // Build recharts-compatible data for SI bar chart
  const siChartData = indices
    .filter(v => v.seasonality_index !== null)
    .map(v => ({
      name:  v.month_name?.slice(0, 3) ?? '',
      si:    +(v.seasonality_index ?? 1).toFixed(3),
      label: v.label,
      avg:   v.avg_monthly_revenue_lyd ?? 0,
    }));

  // Forecast area chart data
  const foreData = (fore?.revenue_forecast ?? []).slice(0, 3).map(m => ({
    name:       m.period.replace(/\s\d{4}/, ''),
    base:       Math.round(m.base_lyd     ?? 0),
    optimistic: Math.round((m as any).p90_lyd ?? m.optimistic_lyd ?? 0),
    pessimistic:Math.round((m as any).p10_lyd ?? m.pessimistic_lyd ?? 0),
  }));

  // Custom tooltip for SI chart
  const SITooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9, padding: '10px 14px', fontSize: 12 }}>
        <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#94a3b8' }}>SI: <strong style={{ color: '#fff' }}>{d?.si?.toFixed(3)}</strong></p>
        {d?.avg > 0 && <p style={{ color: '#94a3b8' }}>Avg rev: <strong style={{ color: '#a5b4fc' }}>{fc(d.avg)}</strong></p>}
        <p style={{ color: d?.label === 'peak' ? C.amber : d?.label === 'trough' ? C.cyan : '#94a3b8', fontWeight: 700, marginTop: 4, textTransform: 'capitalize' }}>{d?.label}</p>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* Status pills */}
      {sea && !sea.error && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ padding: '6px 14px', borderRadius: 20, background: `${C.indigo}10`, border: `1px solid ${C.indigo}25`, fontSize: 12, fontWeight: 600, color: C.indigo }}>
            {sea.current_season}
          </div>
          {sea.upcoming_peak_alert && (
            <div style={{ padding: '6px 14px', borderRadius: 20, background: '#fef3c7', border: '1px solid #fde68a', fontSize: 11, fontWeight: 700, color: C.amber, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={11} />Peak season approaching — prepare stock
            </div>
          )}
          <div style={{ padding: '5px 12px', borderRadius: 20, background: css.muted, fontSize: 11, color: css.mutedFg }}>
            Trend: {sea.trend?.direction} ({(sea.trend?.slope_pct_per_month ?? 0) >= 0 ? '+' : ''}{sea.trend?.slope_pct_per_month?.toFixed(2) ?? '0'}%/mo)
          </div>
        </div>
      )}

      {/* ── Recharts SI Bar Chart ── */}
      {siChartData.length > 0 && (
        <div style={card}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} style={{ color: C.amber }} />Monthly Seasonality Index
            <span style={{ marginLeft: 'auto', fontSize: 10, color: css.mutedFg }}>1.0 = average month</span>
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: css.mutedFg }}>
            Higher = above-average demand · lower = below-average · baseline dashed at 1.0
          </p>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={siChartData} margin={{ top: 10, right: 10, left: -15, bottom: 4 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                domain={[0, (dataMax: number) => Math.max(1.6, +(dataMax * 1.1).toFixed(1))]}
                tickFormatter={v => v.toFixed(1)} />
              <RTooltip content={<SITooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
              <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="5 4" strokeWidth={1.5} />
              <Bar dataKey="si" name="Seasonality Index" radius={[5, 5, 0, 0]}>
                {siChartData.map((entry, i) => {
                  const color = entry.label === 'peak' ? C.amber
                              : entry.label === 'trough' ? C.cyan
                              : C.indigo;
                  return <Cell key={`cell-${i}`} fill={color} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
            {peaks.length > 0 && (
              <span style={{ fontSize: 11, color: C.amber, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: C.amber, flexShrink: 0 }} />
                Peak: {peaks.join(', ')}
              </span>
            )}
            {troughs.length > 0 && (
              <span style={{ fontSize: 11, color: C.cyan, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: C.cyan, flexShrink: 0 }} />
                Trough: {troughs.join(', ')}
              </span>
            )}
            <span style={{ fontSize: 11, color: C.indigo, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: C.indigo, flexShrink: 0 }} />
              Normal
            </span>
          </div>
        </div>
      )}

      {/* Narrative + Ramadan row */}
      {sea && (
        <div style={{ display: 'grid', gridTemplateColumns: sea.ramadan_analysis?.detected ? '3fr 2fr' : '1fr', gap: 12 }}>
          {sea.seasonal_narrative && (
            <div style={{ padding: '12px 16px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.muted, fontSize: 12.5, color: css.cardFg, lineHeight: 1.7 }}>
              {sea.seasonal_narrative}
            </div>
          )}
          {sea.ramadan_analysis?.detected && (
            <div style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #fde68a', background: '#fefce8', fontSize: 12, color: '#78350f', lineHeight: 1.65 }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                🌙 Ramadan Effect
              </p>
              <p style={{ margin: '0 0 4px' }}>{sea.ramadan_analysis.dominant_effect}</p>
              <p style={{ margin: 0 }}>Avg index: <strong>{sea.ramadan_analysis.avg_ramadan_index.toFixed(3)}</strong></p>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>{sea.ramadan_analysis.adjustment_note}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Recharts Forecast Area Chart ── */}
      {foreData.length > 0 && (
        <div style={card}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={13} style={{ color: C.violet }} />3-Month Revenue Forecast
            <span style={{ marginLeft: 'auto', fontSize: 10, color: css.mutedFg }}>P10 / Base / P90 · Holt-Winters model</span>
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: css.mutedFg }}>
            Shaded band = P10–P90 confidence range · solid line = base-case forecast
          </p>

          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={foreData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
              <defs>
                <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.violet} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.violet} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.10} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <RTooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9, fontSize: 12 }}
                labelStyle={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 4 }}
                formatter={(val: any, name: string) => [fc(val), name === 'base' ? 'Base Case' : name === 'optimistic' ? 'Optimistic (P90)' : 'Pessimistic (P10)']}
              />
              <Area type="monotone" dataKey="optimistic"   fill="url(#gradBand)" stroke={C.emerald} strokeDasharray="5 3" strokeWidth={1.5} />
              <Area type="monotone" dataKey="base"         fill="url(#gradBase)" stroke={C.violet} strokeWidth={2.5} />
              <Area type="monotone" dataKey="pessimistic"  fill="none"           stroke={C.rose}   strokeDasharray="5 3" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { color: C.emerald, label: 'Optimistic (P90)', dashed: true  },
              { color: C.violet,  label: 'Base Case',        dashed: false },
              { color: C.rose,    label: 'Pessimistic (P10)',dashed: true  },
            ].map(({ color, label, dashed }) => (
              <span key={label} style={{ fontSize: 11, color, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 18, height: 2, background: color, opacity: dashed ? 0.6 : 1, borderRadius: 1 }} />
                {label}
              </span>
            ))}
          </div>

          {/* Forecast cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
            {fore?.revenue_forecast?.slice(0, 3).map((m, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px', borderRadius: 10, background: `${C.violet}06`, border: `1px solid ${C.violet}20` }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: css.mutedFg }}>{m.period}</p>
                <p style={{ margin: '4px 0 2px', fontSize: 15, fontWeight: 800, color: C.violet }}>{fc(m.base_lyd)}</p>
                <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>
                  P10 {fc((m as any).p10_lyd ?? 0)} · P90 {fc((m as any).p90_lyd ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section F — Risks & Opportunities ───────────────────────────────────────
function SectionRisks({ d }: { d: ReportData }) {
  const crit   = d.critical;
  const anom   = d.anomaly;
  const situations = crit?.situations?.slice(0, 5) ?? [];
  const anomalies  = anom?.anomalies?.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 4) ?? [];

  if (!crit && !anom) return <Empty />;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Exposure summary */}
      {crit && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ ...card, padding: '13px 15px', borderLeft: `3px solid ${C.rose}` }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase' }}>Total Exposure</p>
            <p style={{ margin: '5px 0 2px', fontSize: 18, fontWeight: 800, color: C.rose }}>{fc(crit.total_exposure_lyd)}</p>
            <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>{crit.critical_count} critical situations</p>
          </div>
          <div style={{ ...card, padding: '13px 15px', borderLeft: `3px solid ${C.orange}` }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase' }}>Risk Level</p>
            <p style={{ margin: '5px 0 2px', fontSize: 18, fontWeight: 800, color: C.orange, textTransform: 'capitalize' }}>{crit.risk_level}</p>
            <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>{crit.total_situations} situations total</p>
          </div>
          <div style={{ ...card, padding: '13px 15px', borderLeft: `3px solid ${C.amber}` }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase' }}>Anomalies</p>
            <p style={{ margin: '5px 0 2px', fontSize: 18, fontWeight: 800, color: C.amber }}>{anom?.summary.total ?? '—'}</p>
            <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>
              {anom?.summary.critical ?? 0} critical · {anom?.summary.high ?? 0} high
            </p>
          </div>
        </div>
      )}

      {/* Risks column / Opportunities column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Risks */}
        <div style={{ padding: 14, borderRadius: 12, background: '#fee2e218', border: `1px solid ${C.rose}30` }}>
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.rose, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={10} />Key Risks
          </p>
          {situations.length === 0 && anomalies.length === 0 ? (
            <p style={{ fontSize: 12, color: css.mutedFg }}>No critical risks detected.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {situations.map((s, i) => (
                <div key={`sit-${i}`} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.card }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <SeverityDot s={s.severity} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: css.cardFg }}>{s.title}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: C.rose }}>{fc(s.financial_exposure_lyd)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: css.mutedFg, lineHeight: 1.5 }}>{s.summary}</p>
                </div>
              ))}
              {anomalies.map((a, i) => (
                <div key={`anom-${i}`} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.card }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <SeverityDot s={a.severity} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: css.cardFg }}>{a.stream.replace(/_/g, ' ')}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: a.direction === 'drop' ? C.rose : C.emerald, fontWeight: 700 }}>
                      {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct.toFixed(0)}%
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: css.mutedFg }}>{a.ai_explanation.slice(0, 120)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opportunities */}
        <div style={{ padding: 14, borderRadius: 12, background: '#d1fae518', border: `1px solid ${C.emerald}30` }}>
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.emerald, display: 'flex', alignItems: 'center', gap: 5 }}>
            <TrendingUp size={10} />Opportunities
          </p>
          {/* Spike anomalies = demand opportunities */}
          {anom?.anomalies?.filter(a => a.direction === 'spike').slice(0, 4).map((a, i) => (
            <div key={i} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.card, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                <ArrowUpRight size={11} style={{ color: C.emerald, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: css.cardFg }}>{a.stream.replace(/_/g, ' ')}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.emerald, fontWeight: 700 }}>+{a.deviation_pct.toFixed(0)}%</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: css.mutedFg, lineHeight: 1.5 }}>{a.ai_explanation.slice(0, 100)}</p>
            </div>
          ))}
          {/* Causal clusters */}
          {crit?.causal_clusters?.slice(0, 2).map((cl, i) => (
            <div key={i} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.emerald}25`, background: `${C.emerald}05`, marginBottom: 8 }}>
              <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: C.emerald }}>{cl.cluster_name}</p>
              <p style={{ margin: 0, fontSize: 11, color: css.cardFg }}>{cl.unified_action}</p>
            </div>
          ))}
          {(!anom?.anomalies?.some(a => a.direction === 'spike') && !crit?.causal_clusters?.length) && (
            <p style={{ fontSize: 12, color: css.mutedFg }}>Analyze seasonal peaks and top-performing customer segments for upsell opportunities.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section G — 30-Day Action Plan ──────────────────────────────────────────
function SectionAction({ d }: { d: ReportData }) {
  const crit = d.critical;
  const ga   = crit?.grouped_actions;
  if (!ga) return <Empty />;

  const priorityColor = (hours: number) =>
    hours <= 24 ? [C.rose, '#fee2e2'] : hours <= 120 ? [C.amber, '#fef3c7'] : [C.indigo, '#eef2ff'];

  const groups: Array<{ label: string; icon: string; items: typeof ga.act_within_24h; hours: number }> = [
    { label: 'Act within 24 hours', icon: '⚡', items: ga.act_within_24h, hours: 24 },
    { label: 'Act this week',        icon: '📅', items: ga.act_this_week,  hours: 72 },
    { label: 'Monitor',              icon: '👁',  items: ga.monitor,        hours: 168 },
  ];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {groups.map(({ label, icon, items, hours }) => {
        if (!items?.length) return null;
        const [fg] = priorityColor(hours);
        return (
          <div key={label} style={{ border: `1px solid ${fg}30`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '9px 14px', background: `${fg}12`, borderBottom: `1px solid ${fg}25` }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: fg }}>{icon} {label}</p>
            </div>
            <div style={{ padding: '10px 14px', display: 'grid', gap: 8 }}>
              {items.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${fg}18`, color: fg, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {i + 1}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: css.cardFg, lineHeight: 1.6 }}>{a.action}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: `${fg}14`, color: fg }}>{a.situation}</span>
                      <span style={{ fontSize: 10, color: css.mutedFg }}>→ {a.owner}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* AI recommendations from KPI analyzer */}
      {d.kpi?.recommended_actions?.length ? (
        <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.teal}30`, background: `${C.teal}06` }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: C.teal, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Activity size={11} />KPI-Driven Actions
          </p>
          {d.kpi.recommended_actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.teal}18`, color: C.teal, fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {a.priority}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: css.cardFg }}>{a.action}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: css.mutedFg }}>{a.owner} · {a.impact}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Section H — KPI Watchlist ────────────────────────────────────────────────
function SectionKPIs({ d }: { d: ReportData }) {
  const kpi = d.kpi;
  if (!kpi?.kpis) return <Empty />;

  const entries = Object.entries(kpi.kpis);
  const statusColor: Record<string, string> = { green: C.emerald, amber: C.amber, red: C.rose };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${css.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: css.muted }}>
              {['KPI', 'Current', 'Δ vs Baseline', 'Source', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: h === 'KPI' ? 'left' : 'right' as any, fontSize: 9.5, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `2px solid ${css.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, v], i) => {
              const label = (v as any).label || key.replace(/_/g, ' ');
              const source = (v as any).source?.replace('_kpi', '') ?? '—';
              const sc = statusColor[v.status] ?? '#94a3b8';
              const fmt = (val: number) => {
                if (label.toLowerCase().includes('day')) return `${val.toFixed(0)} d`;
                if (label.toLowerCase().includes('lyd') || val > 10000) return fc(val);
                if (val > 0 && val <= 1) return `${(val * 100).toFixed(1)}%`;
                if (val >= 0 && val <= 100 && (label.toLowerCase().includes('%') || label.toLowerCase().includes('rate') || label.toLowerCase().includes('pct'))) return `${val.toFixed(1)}%`;
                return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
              };
              return (
                <tr key={key} style={{ background: i % 2 === 0 ? 'transparent' : `${css.muted}40`, borderBottom: `1px solid ${css.border}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: css.cardFg, maxWidth: 220 }}>{label}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: sc }}>{fmt(v.current)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {v.delta_pct !== 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: v.delta_pct > 0 ? C.emerald : C.rose }}>
                        {v.delta_pct > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {Math.abs(v.delta_pct).toFixed(1)}%
                      </span>
                    ) : <Minus size={12} style={{ color: css.mutedFg }} />}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: css.muted, color: css.mutedFg, textTransform: 'capitalize' }}>{source}</span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: sc }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc }} />{v.status.toUpperCase()}
                    </span>
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

// ─── CSS variable fixer for iframe print ────────────────────────────────────
function fixVars(el: HTMLElement) {
  if (el.style?.cssText) {
    el.style.cssText = el.style.cssText
      .replace(/hsl\(var\(--card\)\)/g,            '#ffffff')
      .replace(/hsl\(var\(--card-foreground\)\)/g,  '#0f172a')
      .replace(/hsl\(var\(--border\)\)/g,           '#e2e8f0')
      .replace(/hsl\(var\(--muted\)\)/g,            '#f8fafc')
      .replace(/hsl\(var\(--muted-foreground\)\)/g, '#64748b')
      .replace(/hsl\(var\(--background\)\)/g,       '#ffffff')
      .replace(/hsl\(var\(--foreground\)\)/g,       '#0f172a');
  }
  Array.from(el.children).forEach(c => fixVars(c as HTMLElement));
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SalesBehaviorReport() {
  const [data,   setData]   = useState<ReportData>({ kpi: null, anomaly: null, churn: null, stock: null, seasonal: null, forecast: null, critical: null });
  const [status, setStatus] = useState<Record<keyof ReportData, 'idle' | 'loading' | 'ok' | 'error'>>({
    kpi: 'idle', anomaly: 'idle', churn: 'idle', stock: 'idle', seasonal: 'idle', forecast: 'idle', critical: 'idle',
  });
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const anyLoading = Object.values(status).some(s => s === 'loading');

  const loadAll = useCallback(async (refresh = false) => {
    const p = refresh ? { refresh: true as const } : {};
    const mark = (k: keyof ReportData, s: 'loading' | 'ok' | 'error') =>
      setStatus(prev => ({ ...prev, [k]: s }));

    setStatus({ kpi: 'loading', anomaly: 'loading', churn: 'loading', stock: 'loading', seasonal: 'loading', forecast: 'loading', critical: 'loading' });

    const [kpi, anomaly, churn, stock, seasonal, forecast, critical] = await Promise.allSettled([
      aiInsightsApi.kpis(p),
      aiInsightsApi.anomalies(p),
      aiInsightsApi.churn({ top_n: 20, ...p }),
      aiInsightsApi.stock(p),
      aiInsightsApi.seasonal(p),
      aiInsightsApi.predict(p),
      aiInsightsApi.critical(p),
    ]);

    const next: ReportData = {
      kpi:      kpi.status      === 'fulfilled' ? kpi.value      : null,
      anomaly:  anomaly.status  === 'fulfilled' ? anomaly.value  : null,
      churn:    churn.status    === 'fulfilled' ? churn.value    : null,
      stock:    stock.status    === 'fulfilled' ? stock.value    : null,
      seasonal: seasonal.status === 'fulfilled' ? seasonal.value : null,
      forecast: forecast.status === 'fulfilled' ? forecast.value : null,
      critical: critical.status === 'fulfilled' ? critical.value : null,
    };
    setData(next);
    setStatus({
      kpi:      kpi.status      === 'fulfilled' ? 'ok' : 'error',
      anomaly:  anomaly.status  === 'fulfilled' ? 'ok' : 'error',
      churn:    churn.status    === 'fulfilled' ? 'ok' : 'error',
      stock:    stock.status    === 'fulfilled' ? 'ok' : 'error',
      seasonal: seasonal.status === 'fulfilled' ? 'ok' : 'error',
      forecast: forecast.status === 'fulfilled' ? 'ok' : 'error',
      critical: critical.status === 'fulfilled' ? 'ok' : 'error',
    });
    setLoadedAt(new Date());
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived summary values for cover page ──────────────────────────────────
  const hs   = data.kpi?.health_score;
  const exp  = data.critical?.total_exposure_lyd ?? 0;
  const cc   = data.churn?.summary.critical ?? 0;
  const hc   = data.churn?.summary.high ?? 0;
  const fc3  = data.forecast?.forecast_total_base_lyd ?? 0;
  const dir  = data.forecast?.trend_model?.direction ?? '—';

  // ── Print handler ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printable = document.getElementById('sbr-printable');
    if (!printable) return;
    const clone = printable.cloneNode(true) as HTMLElement;
    fixVars(clone);

    const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const iframe  = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Sales Behavior Report — ${genDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#fff;color:#0f172a;font-size:12px;}
@page{size:A4 landscape;margin:8mm 10mm;}
.cover{width:100%;height:190mm;break-after:page!important;page-break-after:always!important;position:relative;overflow:hidden;background:#fff;}
.stripe{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#0ea5e9);}
.bg-right{position:absolute;top:0;right:0;width:50%;height:100%;background:linear-gradient(148deg,#eef2ff,#ede9fe,#ddd6fe,#c4b5fd);clip-path:polygon(13% 0,100% 0,100% 100%,0% 100%);}
.inner{position:relative;z-index:2;display:grid;grid-template-rows:auto 1fr auto;height:100%;padding:26px 46px 22px;}
.top-bar{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1px solid #e2e8f0;}
.main{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center;padding:18px 0;}
.title{font-family:'Playfair Display',serif;font-size:50px;font-weight:900;color:#0f172a;line-height:1.0;letter-spacing:-0.03em;}
.title em{color:#6366f1;font-style:italic;}
.kc{background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.94);border-radius:11px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;}
.kc-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;}
.kc-val{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1;}
.kc-note{font-size:10px;color:#94a3b8;margin-top:2px;}
.badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;}
.footer{border-top:1px solid #e2e8f0;padding-top:13px;display:flex;justify-content:space-between;align-items:center;}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-shadow:none!important;}
div[style*="border-radius:14px"],div[style*="border-radius: 14px"],div[style*="border-radius:12px"]{break-inside:avoid;page-break-inside:avoid;}
table{break-inside:avoid;page-break-inside:avoid;}
section{break-inside:avoid;page-break-inside:avoid;}
</style></head><body>
<div class="cover">
  <div class="stripe"></div><div class="bg-right"></div>
  <div class="inner">
    <div class="top-bar">
      <span style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#374151;">WEEG Financial</span>
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#6366f1;background:#eef2ff;border:1.5px solid #c7d2fe;padding:4px 13px;border-radius:20px;">AI Intelligence Report</span>
    </div>
    <div class="main">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:14px;">Commercial Intelligence</div>
        <h1 class="title">Sales<br/><em>Behavior</em></h1>
        <p style="font-size:14px;color:#64748b;margin:13px 0 17px;">AI-Generated Analysis — ${genDate}</p>
        <p style="font-size:11.5px;color:#94a3b8;line-height:1.85;border-left:3px solid #c4b5fd;padding-left:14px;">
          Comprehensive view of channel, regional, segment and product behavior —<br/>
          30-day action plan · KPI watchlist · data gaps. 6 analytical sections · AI-generated by WEEG.
        </p>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#fef3c7;color:#b45309;border:1px solid #fde68a;">Urgency: ${data.critical?.risk_level?.toUpperCase() ?? 'MEDIUM'}</span>
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#ede9fe;color:#7c3aed;border:1px solid #ddd6fe;">Topic: general</span>
        </div>
      </div>
      <div style="padding-left:10px;">
        <div class="kc">
          <div><div class="kc-lbl">KPI Health Score</div><div class="kc-val" style="color:${hColor(hs)};">${hs ?? '—'}</div><div class="kc-note">${data.kpi?.health_label ?? 'n/a'}</div></div>
          <span class="badge" style="background:${hs && hs >= 70 ? '#d1fae5' : '#ffe4e6'};color:${hs && hs >= 70 ? '#059669' : '#e11d48'};">${hs && hs >= 70 ? '✓ Healthy' : '⚠ Review'}</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">Critical Exposure</div><div class="kc-val" style="color:#e11d48;">${fc(exp)}</div><div class="kc-note">${data.critical?.critical_count ?? 0} critical · ${data.critical?.risk_level ?? 'n/a'}</div></div>
          <span class="badge" style="background:#ffe4e6;color:#e11d48;">Risk</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">Churn Risk</div><div class="kc-val" style="color:#f43f5e;">${cc} crit · ${hc} high</div><div class="kc-note">Avg ${((data.churn?.summary.avg_churn_score ?? 0) * 100).toFixed(0)}% score</div></div>
          <span class="badge" style="background:#ffe4e6;color:#f43f5e;">Churn</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">3-Month Forecast</div><div class="kc-val" style="color:#6366f1;">${fc(fc3)}</div><div class="kc-note">Trend: ${dir}</div></div>
          <span class="badge" style="background:#eef2ff;color:#6366f1;">Forecast</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <div style="display:flex;align-items:center;gap:12px;font-size:10px;color:#94a3b8;">
        <span>Generated ${genDate}</span>
        <span style="width:3px;height:3px;border-radius:50%;background:#cbd5e1;display:inline-block;"></span>
        <span>6 sections · Powered by WEEG AI</span>
      </div>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#a5b4fc;border:1.5px solid #e0e7ff;padding:3px 10px;border-radius:20px;background:#faf5ff;">Confidential</span>
    </div>
  </div>
</div>
<div style="padding:16px 20px;">${clone.outerHTML}</div>
</body></html>`);
    doc.close();

    iframe.style.visibility = 'visible'; iframe.style.zIndex = '9999';
    const cleanup = () => { iframe.style.visibility = 'hidden'; setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500); };
    const go = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.print(); } };
    iframe.onload = () => setTimeout(go, 800);
    setTimeout(go, 1800);
    if (iframe.contentWindow) { iframe.contentWindow.onafterprint = cleanup; setTimeout(cleanup, 90000); }
  };

  // ── Module status pills ───────────────────────────────────────────────────
  const moduleLabels: [keyof ReportData, string, string][] = [
    ['kpi',      'KPIs',      C.indigo],
    ['anomaly',  'Anomalies', C.amber],
    ['churn',    'Churn',     C.rose],
    ['stock',    'Stock',     C.teal],
    ['seasonal', 'Seasonal',  C.cyan],
    ['forecast', 'Forecast',  C.violet],
    ['critical', 'Critical',  C.orange],
  ];

  // ── Sections definition ───────────────────────────────────────────────────
  const sections = [
    { letter: 'A', title: 'Executive Summary',            sub: 'KPI health · executive briefing · risk flags',                       color: C.indigo,  component: <SectionExecutive d={data} /> },
    { letter: 'B', title: 'Channel Behavior',             sub: 'Sales by channel — top clients · products · YoY evolution',          color: C.cyan,    component: <SectionChannel d={data} /> },
    { letter: 'C', title: 'Customer Segment Behavior',    sub: 'Churn risk signals · at-risk accounts · behavioral patterns',        color: C.violet,  component: <SectionSegment d={data} /> },
    { letter: 'D', title: 'Product Mix & Stock Signals',  sub: 'ABC Pareto · margin signals · urgency reorders',                     color: C.emerald, component: <SectionProduct d={data} /> },
    { letter: 'E', title: 'Time & Seasonal Patterns',     sub: 'Seasonality indices · Ramadan effect · 3-month forecast',            color: C.amber,   component: <SectionTime d={data} /> },
    { letter: 'F', title: 'Risks & Opportunities',        sub: 'Anomaly-detected threats · causal clusters · upside levers',         color: C.orange,  component: <SectionRisks d={data} /> },
    { letter: 'G', title: '30-Day Action Plan',           sub: 'Prioritized actions · owners · expected impact',                     color: C.rose,    component: <SectionAction d={data} /> },
    { letter: 'H', title: 'KPI Watchlist',                sub: 'Current values · trend · status · source module',                    color: C.teal,    component: <SectionKPIs d={data} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
      <div style={{ ...card, background: `linear-gradient(135deg, ${C.indigo}08, ${C.violet}04)`, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${C.indigo}40` }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 900, color: css.fg, margin: 0, letterSpacing: '-0.03em' }}>Sales Behavior Report</h1>
              <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                AI-powered · 7 modules · Channel · Segment · Product · Seasonal
                {loadedAt && <span style={{ marginLeft: 8, opacity: 0.65 }}>· Generated {loadedAt.toLocaleTimeString()}</span>}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => loadAll(false)} disabled={anyLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: anyLoading ? 'not-allowed' : 'pointer', opacity: anyLoading ? 0.6 : 1 }}>
              {anyLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Refresh
            </button>
            <button onClick={() => loadAll(true)} disabled={anyLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.indigo}40`, background: `${C.indigo}10`, color: C.indigo, fontSize: 13, fontWeight: 600, cursor: anyLoading ? 'not-allowed' : 'pointer', opacity: anyLoading ? 0.6 : 1 }}>
              <RefreshCw size={13} />Force refresh
            </button>
            <button onClick={handlePrint} disabled={anyLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.violet}40`, background: `${C.violet}10`, color: C.violet, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={13} />Print / PDF
            </button>
          </div>
        </div>

        {/* Module status strip */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${css.border}` }}>
          {moduleLabels.map(([key, label, color]) => {
            const s = status[key];
            return (
              <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: `1px solid ${s === 'ok' ? color : s === 'error' ? C.rose : css.border}20`, background: s === 'ok' ? `${color}12` : s === 'error' ? '#fee2e2' : css.muted, color: s === 'ok' ? color : s === 'error' ? C.rose : css.mutedFg }}>
                {s === 'loading' ? <Loader2 size={10} className="animate-spin" /> : s === 'ok' ? <CheckCircle2 size={10} /> : s === 'error' ? <AlertCircle size={10} /> : <Layers size={10} />}
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── KPI Hero row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KChip label="KPI Health Score"   value={hs != null ? String(hs) : '—'} sub={data.kpi?.health_label ?? '—'} color={hColor(hs)} />
        <KChip label="Critical Exposure"  value={fc(exp)} sub={`${data.critical?.critical_count ?? 0} critical · ${data.critical?.risk_level ?? '—'}`} color={C.rose} />
        <KChip label="Churn Risk"         value={`${cc} crit · ${hc} high`} sub={`Avg ${((data.churn?.summary.avg_churn_score ?? 0) * 100).toFixed(0)}% score`} color={C.orange} />
        <KChip label="3-Month Forecast"   value={fc(fc3)} sub={`Trend: ${dir}`} color={C.violet} />
      </div>

      {/* ── PRINTABLE SECTIONS ───────────────────────────────────────────── */}
      <div id="sbr-printable" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {sections.map(({ letter, title, sub, color, component }) => (
          <section key={letter} style={{ ...card, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <SecHead letter={letter} title={title} sub={sub} color={color} />
            {component}
          </section>
        ))}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: css.mutedFg, paddingTop: 12, borderTop: `1px solid ${css.border}` }}>
          <CheckCircle2 size={12} style={{ color: C.emerald }} />
          Report generated from: KPI · Anomalies · Churn · Stock · Seasonal · Forecast · Critical detector
          {loadedAt && <span style={{ marginLeft: 'auto' }}>Generated {loadedAt.toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}