import { useCallback, useEffect, useState } from 'react';
import {
    Globe,
    Sparkles,
    RefreshCw,
    Printer,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Target,
    Clock,
    User,
    MapPin,
    ShieldAlert,
    ListTodo,
} from 'lucide-react';
import { api } from '../lib/api';

const C = { indigo: '#6366f1', emerald: '#10b981' };
const css = {
  card: 'hsl(var(--card))', cardFg: 'hsl(var(--card-foreground))',
  border: 'hsl(var(--border))', muted: 'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--background))',
  fg: 'hsl(var(--foreground))',
};
const card: React.CSSProperties = {
  background: css.card,
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border: `1px solid ${css.border}`,
};

type Urgency = 'critical' | 'high' | 'medium' | 'low';

type DecisionOption = {
  label: string;
  pros: string;
  cons: string;
};

type DecisionCard = {
  question: string;
  recommendation: string;
  rationale: string;
  options: DecisionOption[];
  owner: string;
  deadline: string;
};

type SalesBehaviorResponse = {
  conversation_id?: string;
  answer: string;
  decision_needed: boolean;
  decision_card: DecisionCard | null;
  suggested_followups: string[];
  urgency: Urgency;
  topic: string;
  fallback: boolean;
};

type InsightsSnapshot = {
  kpis?: { health_score?: number; health_label?: string };
  anomalies?: { summary?: { total?: number; critical?: number; high?: number } };
  churn?: { summary?: { critical?: number; high?: number; avg_churn_score?: number } };
  stock?: { summary?: { immediate_reorders?: number; soon_reorders?: number; class_a_count?: number } };
  forecast?: { trend_model?: { direction?: string }; forecast_total_base_lyd?: number };
  critical?: { critical_count?: number; total_exposure_lyd?: number; risk_level?: string };
};

const URGENCY_STYLE: Record<Urgency, { bg: string; text: string }> = {
  critical: { bg: '#fee2e2', text: '#b91c1c' },
  high: { bg: '#ffedd5', text: '#c2410c' },
  medium: { bg: '#fef3c7', text: '#b45309' },
  low: { bg: '#e2e8f0', text: '#475569' },
};

const INITIAL_PROMPT = [
  'Generate a Sales Behavior report for my company.',
  'Focus on deep patterns by channel, region, and customer segment.',
  'I need maximum possible detail from available data.',
  'Structure your answer as:',
  '1) Executive summary',
  '2) Channel behavior',
  '3) Regional behavior',
  '4) Customer segment behavior',
  '5) Product mix and margin signals',
  '6) Time patterns (weekly/monthly seasonality if visible)',
  '7) Risks and opportunities',
  '8) Prioritized action plan for next 30 days',
  '9) KPI watchlist with targets and owner',
  '10) Data gaps and what to track next',
  'For each section include quantified points whenever possible (values, percentages, ranking, trends).',
  'When possible compare: top vs bottom performers and likely root causes.',
  'Action plan format: priority, owner, deadline, expected impact, risk if not done.',
  'KPI watchlist format: KPI, current signal, target, cadence, owner.',
  'If data is missing for one dimension, explicitly write "Data unavailable" and continue with available insights.',
  'Use concise but information-dense bullets.',
].join('\n');

type ReportSectionKey =
  | 'executive'
  | 'channel'
  | 'regional'
  | 'segment'
  | 'risks'
  | 'action';

type ReportSection = {
  key: ReportSectionKey;
  title: string;
  lines: string[];
};

const SECTION_META: Record<ReportSectionKey, { title: string; icon: React.ElementType; tone: string }> = {
  executive: { title: 'Executive Summary', icon: Sparkles, tone: '#4f46e5' },
  channel: { title: 'Channel Behavior', icon: Globe, tone: '#0ea5e9' },
  regional: { title: 'Regional Behavior', icon: MapPin, tone: '#0891b2' },
  segment: { title: 'Customer Segment Behavior', icon: User, tone: '#8b5cf6' },
  risks: { title: 'Risks & Opportunities', icon: ShieldAlert, tone: '#f97316' },
  action: { title: '30-Day Action Plan', icon: ListTodo, tone: '#059669' },
};

const SECTION_ORDER: ReportSectionKey[] = ['executive', 'channel', 'regional', 'segment', 'risks', 'action'];

function normalizeHeading(line: string) {
  return line
    .replace(/^\s*\d+\s*[\)\.:\-]\s*/i, '')
    .replace(/^\s*[-*#]+\s*/i, '')
    .trim()
    .toLowerCase();
}

function keyFromHeading(line: string): ReportSectionKey | null {
  const h = normalizeHeading(line);
  if (h.includes('executive')) return 'executive';
  if (h.includes('channel')) return 'channel';
  if (h.includes('regional') || h.includes('region')) return 'regional';
  if (h.includes('segment')) return 'segment';
  if (h.includes('risk') || h.includes('opportunit')) return 'risks';
  if (h.includes('action plan') || (h.includes('action') && h.includes('30'))) return 'action';
  return null;
}

function parseSections(answer: string): ReportSection[] {
  const map = new Map<ReportSectionKey, string[]>();
  let current: ReportSectionKey | null = null;

  const lines = answer.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const next = keyFromHeading(line);
    if (next) {
      current = next;
      if (!map.has(next)) map.set(next, []);
      continue;
    }

    if (!current) {
      current = 'executive';
      if (!map.has(current)) map.set(current, []);
    }
    map.get(current)?.push(line.replace(/^[-*]\s*/, ''));
  }

  return SECTION_ORDER
    .filter(k => (map.get(k)?.length || 0) > 0)
    .map(k => ({ key: k, title: SECTION_META[k].title, lines: map.get(k) || [] }));
}

function renderText(content: string) {
  return content.split('\n').map((line, i) => (
    <p key={i} style={{ margin: 0, lineHeight: 1.65 }}>
      {line}
    </p>
  ));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(v?: number) {
  const n = Number(v || 0);
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} LYD`;
}

function SectionCard({ section }: { section: ReportSection }) {
  const meta = SECTION_META[section.key];
  const Icon = meta.icon;
  return (
    <div style={{ border: `1px solid ${css.border}`, borderRadius: 12, background: css.card, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${css.border}`, background: `${meta.tone}12` }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: `${meta.tone}22`, color: meta.tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} />
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: css.cardFg }}>{section.title}</p>
      </div>
      <div style={{ padding: 12, display: 'grid', gap: 6 }}>
        {section.lines.map((line, i) => (
          <p key={`${section.key}-${i}`} style={{ margin: 0, fontSize: 12.5, color: css.cardFg, lineHeight: 1.6, display: 'flex', gap: 6 }}>
            <span style={{ color: meta.tone, fontWeight: 900 }}>•</span>
            <span>{line}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function SalesBehaviorReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesBehaviorResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [insights, setInsights] = useState<InsightsSnapshot | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const sections = parseSections(data?.answer || '');

  const lineCount = sections.reduce((acc, s) => acc + s.lines.length, 0);

  const downloadReport = useCallback(() => {
    if (!data) return;

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=900');
    if (!popup) return;

    const sectionHtml = sections.length > 0
      ? sections.map(section => `
          <section>
            <h2>${escapeHtml(section.title)}</h2>
            <ul>
              ${section.lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}
            </ul>
          </section>
        `).join('')
      : `<section><h2>Full Analysis</h2><p>${escapeHtml(data.answer).replace(/\n/g, '<br/>')}</p></section>`;

    const decisionHtml = data.decision_card ? `
      <section>
        <h2>Decision Recommendation</h2>
        <p><strong>Question:</strong> ${escapeHtml(data.decision_card.question)}</p>
        <p><strong>Recommendation:</strong> ${escapeHtml(data.decision_card.recommendation)}</p>
        <p><strong>Rationale:</strong> ${escapeHtml(data.decision_card.rationale)}</p>
        ${(data.decision_card.options || []).map((opt, i) => `
          <div class="option">
            <p><strong>Option ${i + 1}:</strong> ${escapeHtml(opt.label)}</p>
            <p><strong>Pros:</strong> ${escapeHtml(opt.pros)}</p>
            <p><strong>Cons:</strong> ${escapeHtml(opt.cons)}</p>
          </div>
        `).join('')}
        ${data.decision_card.owner ? `<p><strong>Owner:</strong> ${escapeHtml(data.decision_card.owner)}</p>` : ''}
        ${data.decision_card.deadline ? `<p><strong>Deadline:</strong> ${escapeHtml(data.decision_card.deadline)}</p>` : ''}
      </section>
    ` : '';

    const snapshotHtml = insights ? `
      <section>
        <h2>AI Insights Snapshot</h2>
        <ul>
          <li>KPI health: ${insights.kpis?.health_score ?? '-'} (${escapeHtml(insights.kpis?.health_label || 'n/a')})</li>
          <li>Anomalies: total ${insights.anomalies?.summary?.total ?? 0}, critical ${insights.anomalies?.summary?.critical ?? 0}, high ${insights.anomalies?.summary?.high ?? 0}</li>
          <li>Churn: critical ${insights.churn?.summary?.critical ?? 0}, high ${insights.churn?.summary?.high ?? 0}, avg score ${(((insights.churn?.summary?.avg_churn_score || 0) * 100).toFixed(0))}%</li>
          <li>Stock: immediate reorder ${insights.stock?.summary?.immediate_reorders ?? 0}, soon ${insights.stock?.summary?.soon_reorders ?? 0}, class A ${insights.stock?.summary?.class_a_count ?? 0}</li>
          <li>Forecast: ${escapeHtml(insights.forecast?.trend_model?.direction || 'unknown')} trend, 3-month base ${money(insights.forecast?.forecast_total_base_lyd)}</li>
          <li>Critical exposure: ${money(insights.critical?.total_exposure_lyd)} (${insights.critical?.critical_count ?? 0} situations)</li>
        </ul>
      </section>
    ` : '';

    popup.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Sales Behavior Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 28px; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          h2 { margin: 20px 0 8px; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          p, li { font-size: 12px; line-height: 1.6; }
          ul { padding-left: 18px; margin: 8px 0; }
          .meta { color: #4b5563; font-size: 11px; margin-bottom: 12px; }
          .option { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin: 8px 0; }
          @media print { @page { size: A4; margin: 14mm; } }
        </style>
      </head>
      <body>
        <h1>Sales Behavior Report</h1>
        <p class="meta">Generated at: ${escapeHtml(generatedAt ? generatedAt.toLocaleString() : new Date().toLocaleString())}</p>
        <p class="meta">Topic: ${escapeHtml(data.topic || 'general')} | Urgency: ${escapeHtml(data.urgency)} | Fallback: ${data.fallback ? 'Yes' : 'No'}</p>
        ${snapshotHtml}
        ${sectionHtml}
        ${decisionHtml}
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    setTimeout(() => {
      popup.print();
    }, 250);
  }, [data, generatedAt, sections, insights]);

  const loadInsightsSnapshot = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const [kpis, anomalies, churn, stock, forecast, critical] = await Promise.allSettled([
        api.get('/ai-insights/kpis/'),
        api.get('/ai-insights/anomalies/'),
        api.get('/ai-insights/churn/?top_n=10'),
        api.get('/ai-insights/stock/'),
        api.get('/ai-insights/predict/'),
        api.get('/ai-insights/critical/'),
      ]);

      setInsights({
        kpis: kpis.status === 'fulfilled' ? (kpis.value as any) : undefined,
        anomalies: anomalies.status === 'fulfilled' ? (anomalies.value as any) : undefined,
        churn: churn.status === 'fulfilled' ? (churn.value as any) : undefined,
        stock: stock.status === 'fulfilled' ? (stock.value as any) : undefined,
        forecast: forecast.status === 'fulfilled' ? (forecast.value as any) : undefined,
        critical: critical.status === 'fulfilled' ? (critical.value as any) : undefined,
      });
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  const run = useCallback(async (question: string, reset = false) => {
    setLoading(true);
    setError(null);

    try {
      const nextHistory = reset
        ? [{ role: 'user' as const, content: question }]
        : [...history, { role: 'user' as const, content: question }];

      const res = await api.post<SalesBehaviorResponse>('/ai-insights/chat/', {
        messages: nextHistory,
        ...(reset ? {} : (conversationId ? { conversation_id: conversationId } : {})),
        language: 'English',
      });

      const finalHistory = [...nextHistory, { role: 'assistant' as const, content: res.answer }];
      setHistory(finalHistory);
      setData(res);
      setGeneratedAt(new Date());
      if (res.conversation_id) setConversationId(res.conversation_id);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to generate AI report');
    } finally {
      setLoading(false);
    }
  }, [conversationId, history]);

  useEffect(() => {
    run(INITIAL_PROMPT, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadInsightsSnapshot();
  }, [loadInsightsSnapshot]);

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.indigo}18`, color: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={16} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: css.fg, margin: 0, letterSpacing: '-0.02em' }}>Sales Behavior (AI Report)</h2>
          </div>
          <p style={{ fontSize: 12, color: css.mutedFg, margin: '6px 0 0' }}>
            AI-generated analysis of channel, regional, and segment-level commercial behavior.
          </p>
          {generatedAt && (
            <p style={{ fontSize: 11, color: css.mutedFg, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />Generated at {generatedAt.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={loadInsightsSnapshot}
            disabled={loadingInsights}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 9,
              border: `1px solid ${css.border}`,
              background: css.card,
              color: css.cardFg,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: loadingInsights ? 'not-allowed' : 'pointer',
              opacity: loadingInsights ? 0.7 : 1,
            }}
          >
            {loadingInsights ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh insights
          </button>
          <button
            onClick={() => run(INITIAL_PROMPT, true)}
            disabled={loading}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 9,
              border: `1px solid ${css.border}`,
              background: css.card,
              color: css.cardFg,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Regenerate
          </button>
          <button
            onClick={downloadReport}
            disabled={!data || loading}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 9,
              border: `1px solid ${css.border}`,
              background: data ? `${C.indigo}14` : css.card,
              color: data ? C.indigo : css.mutedFg,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: !data || loading ? 'not-allowed' : 'pointer',
              opacity: !data || loading ? 0.7 : 1,
            }}
          >
            <Printer size={13} />
            Download PDF
          </button>
        </div>
      </div>

      {loading && !data && (
        <div style={{ ...card, borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 }}>
          <Loader2 size={18} className="animate-spin" style={{ color: C.indigo }} />
          <span style={{ fontSize: 13, color: css.mutedFg }}>Generating AI report...</span>
        </div>
      )}

      {error && (
        <div style={{ borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>Unable to generate report</p>
            <p style={{ margin: '2px 0 0', fontSize: 12 }}>{error}</p>
          </div>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, border: `1px solid ${css.border}`, color: css.mutedFg }}>
              Topic: {data.topic || 'general'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, background: URGENCY_STYLE[data.urgency || 'low'].bg, color: URGENCY_STYLE[data.urgency || 'low'].text }}>
              Urgency: {data.urgency}
            </span>
            {data.fallback && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d' }}>
                Fallback mode
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, border: `1px solid ${css.border}`, color: css.mutedFg }}>
              Sections: {sections.length}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, border: `1px solid ${css.border}`, color: css.mutedFg }}>
              Detail lines: {lineCount}
            </span>
          </div>

          <div style={{ borderRadius: 12, border: `1px solid ${css.border}`, background: css.card, padding: 14, display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: css.mutedFg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Insights Snapshot (from AI Insights modules)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              <div style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: 10, background: `${css.muted}35` }}>
                <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>KPI Health</p>
                <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 800, color: css.cardFg }}>
                  {insights?.kpis?.health_score ?? '-'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: css.mutedFg }}>{insights?.kpis?.health_label || 'n/a'}</p>
              </div>

              <div style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: 10, background: `${css.muted}35` }}>
                <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>Anomalies</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 800, color: css.cardFg }}>
                  {insights?.anomalies?.summary?.critical ?? 0} critical · {insights?.anomalies?.summary?.high ?? 0} high
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: css.mutedFg }}>Total {insights?.anomalies?.summary?.total ?? 0}</p>
              </div>

              <div style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: 10, background: `${css.muted}35` }}>
                <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>Churn</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 800, color: css.cardFg }}>
                  {insights?.churn?.summary?.critical ?? 0} critical · {insights?.churn?.summary?.high ?? 0} high
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: css.mutedFg }}>
                  Avg {(((insights?.churn?.summary?.avg_churn_score || 0) * 100).toFixed(0))}%
                </p>
              </div>

              <div style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: 10, background: `${css.muted}35` }}>
                <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>Stock Signals</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 800, color: css.cardFg }}>
                  {insights?.stock?.summary?.immediate_reorders ?? 0} immediate · {insights?.stock?.summary?.soon_reorders ?? 0} soon
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: css.mutedFg }}>Class A {insights?.stock?.summary?.class_a_count ?? 0}</p>
              </div>

              <div style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: 10, background: `${css.muted}35` }}>
                <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>Forecast</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 800, color: css.cardFg }}>
                  {insights?.forecast?.trend_model?.direction || 'unknown'} trend
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: css.mutedFg }}>
                  3-mo base {money(insights?.forecast?.forecast_total_base_lyd)}
                </p>
              </div>

              <div style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: 10, background: `${css.muted}35` }}>
                <p style={{ margin: 0, fontSize: 10, color: css.mutedFg }}>Critical Exposure</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 800, color: css.cardFg }}>
                  {money(insights?.critical?.total_exposure_lyd)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: css.mutedFg }}>
                  {insights?.critical?.critical_count ?? 0} situations · {insights?.critical?.risk_level || 'n/a'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 12, border: `1px solid ${css.border}`, background: `${css.muted}55`, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Sparkles size={14} style={{ color: C.indigo }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: css.cardFg }}>AI Executive Analysis</span>
            </div>
            {sections.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {sections.map(section => <SectionCard key={section.key} section={section} />)}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: css.cardFg, display: 'grid', gap: 6 }}>
                {renderText(data.answer)}
              </div>
            )}
          </div>

          {data.decision_card && (
            <div style={{ borderRadius: 12, border: `1px solid ${C.indigo}40`, background: `${C.indigo}08`, padding: 14, display: 'grid', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.indigo }}>
                Decision Recommendation
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: css.cardFg }}>{data.decision_card.question}</p>
              <p style={{ margin: 0, fontSize: 12, color: css.cardFg }}>
                <strong>Recommendation:</strong> {data.decision_card.recommendation}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: css.mutedFg }}>{data.decision_card.rationale}</p>

              {data.decision_card.options?.length > 0 && (
                <div style={{ display: 'grid', gap: 6 }}>
                  {data.decision_card.options.map((opt, i) => (
                    <div key={`${opt.label}-${i}`} style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: 10, background: css.card }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{opt.label}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#166534' }}>Pros: {opt.pros}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#b91c1c' }}>Cons: {opt.cons}</p>
                    </div>
                  ))}
                </div>
              )}

              {(data.decision_card.owner || data.decision_card.deadline) && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 2 }}>
                  {data.decision_card.owner && (
                    <span style={{ fontSize: 11, color: css.mutedFg, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} />{data.decision_card.owner}
                    </span>
                  )}
                  {data.decision_card.deadline && (
                    <span style={{ fontSize: 11, color: css.mutedFg, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Target size={12} />{data.decision_card.deadline}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {data.suggested_followups?.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: css.mutedFg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Next questions
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.suggested_followups.map((q, i) => (
                  <button
                    key={`${q}-${i}`}
                    onClick={() => run(q)}
                    disabled={loading}
                    style={{
                      border: `1px solid ${C.indigo}40`,
                      background: `${C.indigo}10`,
                      color: C.indigo,
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '6px 10px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ChevronRight size={12} />{q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: css.mutedFg }}>
            <CheckCircle2 size={12} style={{ color: C.emerald }} />
            Report generated from AI Insights context (sales, receivables, stock, churn, forecast).
          </div>

          <details style={{ border: `1px solid ${css.border}`, borderRadius: 10, padding: '8px 10px', background: `${css.muted}40` }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: css.cardFg }}>
              View full raw AI output
            </summary>
            <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 12.5, color: css.cardFg }}>
              {renderText(data.answer)}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
