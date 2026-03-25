import { useCallback, useEffect, useState } from 'react';
import {
  Globe, Sparkles, RefreshCw, Printer, Loader2, AlertCircle,
  CheckCircle2, ChevronRight, Target, Clock, User, MapPin,
  ShieldAlert, ListTodo, BarChart3, TrendingUp,
  Package, Layers, AlertTriangle, Database, Zap,
  ArrowRight, ThumbsUp, ThumbsDown, Calendar, Activity,
} from 'lucide-react';
import { api } from '../lib/api';

// ─── Design tokens ─────────────────────────────────────────────────────────
const C = {
  indigo: '#6366f1', emerald: '#10b981', amber: '#f59e0b',
  rose:   '#f43f5e', cyan:   '#0ea5e9', violet: '#8b5cf6',
  orange: '#f97316', sky:    '#38bdf8',
};
const css = {
  card:    'hsl(var(--card))',    cardFg: 'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))', muted:  'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg:      'hsl(var(--background))', fg: 'hsl(var(--foreground))',
};
const card: React.CSSProperties = {
  background: css.card, borderRadius: 12, padding: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)',
  border: `1px solid ${css.border}`,
};

// ─── Types ──────────────────────────────────────────────────────────────────
type Urgency = 'critical' | 'high' | 'medium' | 'low';
type DecisionOption = { label: string; pros: string; cons: string };
type DecisionCard = {
  question: string; recommendation: string; rationale: string;
  options: DecisionOption[]; owner: string; deadline: string;
};
type SalesBehaviorResponse = {
  conversation_id?: string; answer: string;
  decision_needed: boolean; decision_card: DecisionCard | null;
  suggested_followups: string[]; urgency: Urgency; topic: string; fallback: boolean;
};
type InsightsSnapshot = {
  kpis?:      { health_score?: number; health_label?: string };
  anomalies?: { summary?: { total?: number; critical?: number; high?: number } };
  churn?:     { summary?: { critical?: number; high?: number; avg_churn_score?: number } };
  stock?:     { summary?: { immediate_reorders?: number; soon_reorders?: number; class_a_count?: number } };
  forecast?:  { trend_model?: { direction?: string }; forecast_total_base_lyd?: number };
  critical?:  { critical_count?: number; total_exposure_lyd?: number; risk_level?: string };
};

// ─── Section definitions ────────────────────────────────────────────────────
type SectionKey =
  | 'executive' | 'channel' | 'regional' | 'segment'
  | 'product' | 'time_patterns' | 'risks' | 'action'
  | 'kpi_watchlist' | 'data_gaps';

const SECTION_META: Record<SectionKey, { letter: string; title: string; icon: React.ElementType; tone: string; description: string; variant: 'bullets' | 'timeline' | 'table' | 'grid' | 'split' }> = {
  executive:     { letter:'A', title:'Executive Summary',            icon: Sparkles,    tone: C.indigo,  description: 'Key findings & strategic overview',         variant: 'bullets'  },
  channel:       { letter:'B', title:'Channel Behavior',             icon: Globe,       tone: C.cyan,    description: 'Sales by channel — performance & gaps',      variant: 'bullets'  },
  regional:      { letter:'C', title:'Regional Behavior',            icon: MapPin,      tone: C.sky,     description: 'Geographic sales distribution',              variant: 'bullets'  },
  segment:       { letter:'D', title:'Customer Segment Behavior',    icon: User,        tone: C.violet,  description: 'Segment-level patterns & signals',           variant: 'bullets'  },
  product:       { letter:'E', title:'Product Mix & Margin Signals', icon: Package,     tone: C.emerald, description: 'Product performance, margins & mix shifts',   variant: 'grid'     },
  time_patterns: { letter:'F', title:'Time & Seasonal Patterns',     icon: Calendar,    tone: C.amber,   description: 'Weekly/monthly cycles & anomalies',          variant: 'bullets'  },
  risks:         { letter:'G', title:'Risks & Opportunities',        icon: ShieldAlert, tone: C.orange,  description: 'Key threats and upside levers',              variant: 'split'    },
  action:        { letter:'H', title:'30-Day Action Plan',           icon: ListTodo,    tone: C.emerald, description: 'Prioritized actions with owners & impact',    variant: 'timeline' },
  kpi_watchlist: { letter:'I', title:'KPI Watchlist',                icon: Activity,    tone: C.rose,    description: 'Metrics to track — targets & ownership',     variant: 'table'    },
  data_gaps:     { letter:'J', title:'Data Gaps & Next Steps',       icon: Database,    tone: '#94a3b8', description: 'Missing data & what to instrument next',     variant: 'bullets'  },
};
const SECTION_ORDER: SectionKey[] = ['executive','channel','regional','segment','product','time_patterns','risks','action','kpi_watchlist','data_gaps'];

type ParsedSection = { key: SectionKey; lines: string[] };

// ─── Parser ─────────────────────────────────────────────────────────────────
function normalizeH(line: string) {
  return line.replace(/^\s*\d+[\)\.:\-]\s*/i,'').replace(/^\s*[-*#]+\s*/i,'').trim().toLowerCase();
}
function keyFromH(line: string): SectionKey | null {
  const h = normalizeH(line);
  if (h.includes('executive'))                                              return 'executive';
  if (h.includes('channel'))                                                return 'channel';
  if (h.includes('regional') || h.includes('region'))                      return 'regional';
  if (h.includes('segment'))                                                return 'segment';
  if (h.includes('product') || h.includes('margin') || h.includes('mix'))  return 'product';
  if (h.includes('time') || h.includes('seasonal') || h.includes('weekly') || h.includes('monthly pattern')) return 'time_patterns';
  if (h.includes('risk') || h.includes('opportunit'))                      return 'risks';
  if (h.includes('action plan') || (h.includes('action') && h.includes('30'))) return 'action';
  if (h.includes('kpi') || h.includes('watchlist'))                        return 'kpi_watchlist';
  if (h.includes('data gap') || h.includes('gap') || h.includes('track next')) return 'data_gaps';
  return null;
}
function parseSections(answer: string): ParsedSection[] {
  const map = new Map<SectionKey, string[]>();
  let cur: SectionKey | null = null;
  for (const raw of answer.split('\n').map(l => l.trim()).filter(Boolean)) {
    const k = keyFromH(raw);
    if (k) { cur = k; if (!map.has(k)) map.set(k, []); continue; }
    if (!cur) { cur = 'executive'; if (!map.has(cur)) map.set(cur, []); }
    const cl = raw.replace(/^[-*•·]\s*/,'').trim();
    if (cl) map.get(cur)!.push(cl);
  }
  return SECTION_ORDER.filter(k => (map.get(k)?.length||0) > 0).map(k => ({ key:k, lines:map.get(k)! }));
}

// ─── Line helpers ────────────────────────────────────────────────────────────
function splitRO(lines: string[]): [string[], string[]] {
  const risks: string[] = []; const opps: string[] = [];
  let mode: 'r'|'o' = 'r';
  for (const l of lines) {
    const lw = l.toLowerCase();
    if (lw.startsWith('opportunit') || lw.includes('opportunity') || lw.startsWith('upside') || lw.startsWith('growth lever')) mode = 'o';
    else if (lw.startsWith('risk') || lw.startsWith('threat')) mode = 'r';
    if (mode === 'o') opps.push(l); else risks.push(l);
  }
  if (!opps.length) return [lines.slice(0, Math.ceil(lines.length/2)), lines.slice(Math.ceil(lines.length/2))];
  return [risks, opps];
}
function parseKPI(line: string) {
  const p = line.split(/[|·:–—]/).map(s => s.trim()).filter(Boolean);
  return p.length >= 3 ? { kpi:p[0], current:p[1]||'—', target:p[2]||'—', owner:p[3]||'—' } : null;
}
function parseAction(line: string) {
  const om = line.match(/owner[:\s]+([^|·\n]+)/i);
  const dm = line.match(/(\d+)\s*days?/i);
  const im = line.match(/impact[:\s]+(.+?)(?:[|·]|$)/i);
  const pm = line.match(/^(?:priority\s*)?([1-5])[):.\s]/i);
  const action = line.replace(/owner[:\s]+[^|·\n]+/i,'').replace(/impact[:\s]+[^|·\n]+/i,'').replace(/\d+\s*days?/i,'').replace(/^[1-5][):.\s]/i,'').trim();
  return { priority:pm?pm[1]:'—', action:action||line, owner:om?.[1]?.trim()||'—', deadline:dm?`${dm[1]}d`:'—', impact:im?.[1]?.trim()||'' };
}

// ─── Utilities ───────────────────────────────────────────────────────────────
const money = (v?: number) => `${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})} LYD`;
const hColor = (s?: number) => !s ? '#94a3b8' : s >= 75 ? C.emerald : s >= 55 ? C.amber : C.rose;
const escH   = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const URGENCY: Record<Urgency,{bg:string;text:string;border:string}> = {
  critical:{ bg:'#fee2e2', text:'#b91c1c', border:'#fca5a5' },
  high:    { bg:'#ffedd5', text:'#c2410c', border:'#fed7aa' },
  medium:  { bg:'#fef3c7', text:'#b45309', border:'#fde68a' },
  low:     { bg:'#e2e8f0', text:'#475569', border:'#cbd5e1' },
};

// ─── CSS variable fixer for print iframe ─────────────────────────────────────
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

// ─── Section renderers (always expanded — never collapsed) ───────────────────

function Bullets({ lines, tone }: { lines: string[]; tone: string }) {
  return (
    <div style={{ display:'grid', gap:6 }}>
      {lines.map((l,i) => (
        <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:tone, flexShrink:0, marginTop:7 }} />
          <p style={{ margin:0, fontSize:12.5, color:css.cardFg, lineHeight:1.65 }}>{l}</p>
        </div>
      ))}
    </div>
  );
}

function Timeline({ lines, tone }: { lines: string[]; tone: string }) {
  const PC = ['','#dc2626','#ea580c','#d97706','#2563eb','#64748b'];
  return (
    <div>
      {lines.map((l,i) => {
        const p  = parseAction(l);
        const pc = PC[parseInt(p.priority)||0] || tone;
        return (
          <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:pc, color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${pc}50` }}>
                {p.priority !== '—' ? p.priority : i+1}
              </div>
              {i < lines.length-1 && <div style={{ width:2, flex:1, background:css.border, minHeight:18, margin:'4px 0' }} />}
            </div>
            <div style={{ flex:1, paddingBottom: i < lines.length-1 ? 14 : 0 }}>
              <p style={{ margin:0, fontSize:12.5, color:css.cardFg, lineHeight:1.65, fontWeight:500 }}>{p.action}</p>
              {(p.owner !== '—' || p.deadline !== '—' || p.impact) && (
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:5 }}>
                  {p.owner !== '—'   && <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20, background:`${pc}14`, color:pc, border:`1px solid ${pc}30` }}>👤 {p.owner}</span>}
                  {p.deadline !== '—'&& <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20, background:`${css.muted}80`, color:css.mutedFg }}>⏱ {p.deadline}</span>}
                  {p.impact          && <span style={{ fontSize:10, color:C.emerald, fontWeight:600 }}>→ {p.impact.slice(0,60)}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KPITable({ lines, tone }: { lines: string[]; tone: string }) {
  const rows = lines.map(parseKPI).filter(Boolean) as NonNullable<ReturnType<typeof parseKPI>>[];
  if (rows.length < 2) return <Bullets lines={lines} tone={tone} />;
  const TH: React.CSSProperties = { padding:'7px 10px', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:css.mutedFg, borderBottom:`2px solid ${css.border}`, background:css.muted };
  const TD = (x?: React.CSSProperties): React.CSSProperties => ({ padding:'7px 10px', fontSize:12, borderBottom:`1px solid ${css.border}`, ...x });
  return (
    <div style={{ overflowX:'auto', borderRadius:8, border:`1px solid ${css.border}` }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            {['KPI','Current','Target','Owner'].map(h => (
              <th key={h} style={{ ...TH, textAlign: h==='KPI' ? 'left':'right' as any }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i} style={{ background: i%2===0 ? 'transparent' : `${css.muted}50` }}>
              <td style={TD({ fontWeight:600, color:css.cardFg })}>{r.kpi}</td>
              <td style={TD({ textAlign:'right', fontFamily:'monospace', color:css.mutedFg, fontSize:11 })}>{r.current}</td>
              <td style={TD({ textAlign:'right' })}><span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${tone}14`, color:tone }}>{r.target}</span></td>
              <td style={TD({ textAlign:'right', color:css.mutedFg, fontSize:11 })}>{r.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Split({ lines, tone }: { lines: string[]; tone: string }) {
  const [risks, opps] = splitRO(lines);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      <div style={{ padding:12, borderRadius:10, background:`${C.rose}08`, border:`1px solid ${C.rose}20` }}>
        <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', color:C.rose, display:'flex', alignItems:'center', gap:4 }}><AlertTriangle size={10}/>Risks</p>
        <Bullets lines={risks} tone={C.rose} />
      </div>
      <div style={{ padding:12, borderRadius:10, background:`${C.emerald}08`, border:`1px solid ${C.emerald}20` }}>
        <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', color:C.emerald, display:'flex', alignItems:'center', gap:4 }}><TrendingUp size={10}/>Opportunities</p>
        <Bullets lines={opps} tone={C.emerald} />
      </div>
    </div>
  );
}

function Grid({ lines, tone }: { lines: string[]; tone: string }) {
  const hasMetrics = lines.filter(l => /\d/.test(l)).length > lines.length/3;
  if (!hasMetrics) return <Bullets lines={lines} tone={tone} />;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:8 }}>
      {lines.map((l,i) => (
        <div key={i} style={{ padding:'10px 12px', borderRadius:9, border:`1px solid ${css.border}`, background: i<3 ? `${tone}07` : 'transparent' }}>
          {i < 3 && <div style={{ width:18, height:3, borderRadius:2, background:tone, marginBottom:6 }} />}
          <p style={{ margin:0, fontSize:12, color:css.cardFg, lineHeight:1.6 }}>{l}</p>
        </div>
      ))}
    </div>
  );
}

function SectionContent({ section }: { section: ParsedSection }) {
  const { variant, tone } = SECTION_META[section.key];
  if (variant === 'timeline') return <Timeline  lines={section.lines} tone={tone} />;
  if (variant === 'table')    return <KPITable  lines={section.lines} tone={tone} />;
  if (variant === 'split')    return <Split     lines={section.lines} tone={tone} />;
  if (variant === 'grid')     return <Grid      lines={section.lines} tone={tone} />;
  return <Bullets lines={section.lines} tone={tone} />;
}

// ─── Section card — ALWAYS fully rendered ────────────────────────────────────
function SectionCard({ section }: { section: ParsedSection }) {
  const m = SECTION_META[section.key];
  const Icon = m.icon;
  return (
    <div style={{ border:`1px solid ${css.border}`, borderRadius:12, background:css.card, overflow:'hidden', breakInside:'avoid', pageBreakInside:'avoid' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:`${m.tone}10`, borderBottom:`1px solid ${css.border}` }}>
        <div style={{ width:26, height:26, borderRadius:8, background:`${m.tone}22`, color:m.tone, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={13} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontSize:12, fontWeight:800, color:css.cardFg }}>
            <span style={{ opacity:0.45, marginRight:6, fontSize:10 }}>{m.letter}</span>{m.title}
          </p>
          <p style={{ margin:0, fontSize:10, color:css.mutedFg }}>{m.description} · {section.lines.length} items</p>
        </div>
      </div>
      <div style={{ padding:14 }}>
        <SectionContent section={section} />
      </div>
    </div>
  );
}

// ─── Part header (identical to AgingReport PartieHeader) ─────────────────────
function PartHeader({ letter, label, color }: { letter:string; label:string; color:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, paddingBottom:14, borderBottom:`2px solid ${color}18` }}>
      <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:color }} />
        <div style={{ width:4, height:20, borderRadius:2, background:`${color}40`, marginLeft:3 }} />
      </div>
      <div>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color, margin:0 }}>Part {letter}</p>
        <h2 style={{ fontSize:17, fontWeight:800, color:css.fg, margin:0, letterSpacing:'-0.025em' }}>{label}</h2>
      </div>
    </div>
  );
}

// ─── Decision card ───────────────────────────────────────────────────────────
function DecisionPanel({ dc }: { dc: DecisionCard }) {
  return (
    <div style={{ border:`2px solid ${C.indigo}40`, borderRadius:14, background:`${C.indigo}05`, overflow:'hidden', breakInside:'avoid', pageBreakInside:'avoid' }}>
      <div style={{ padding:'14px 16px', background:`${C.indigo}12`, borderBottom:`1px solid ${C.indigo}25` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ width:24, height:24, borderRadius:7, background:`${C.indigo}22`, color:C.indigo, display:'flex', alignItems:'center', justifyContent:'center' }}><Target size={12} /></div>
          <p style={{ margin:0, fontSize:10, fontWeight:800, letterSpacing:'0.07em', textTransform:'uppercase', color:C.indigo }}>Decision Required</p>
        </div>
        <p style={{ margin:0, fontSize:14, fontWeight:700, color:css.cardFg, lineHeight:1.45 }}>{dc.question}</p>
      </div>
      <div style={{ padding:'14px 16px', display:'grid', gap:12 }}>
        <div style={{ padding:'10px 14px', borderRadius:10, background:`${C.indigo}12`, border:`1px solid ${C.indigo}28`, display:'flex', gap:10, alignItems:'flex-start' }}>
          <Sparkles size={13} style={{ color:C.indigo, flexShrink:0, marginTop:2 }} />
          <div>
            <p style={{ margin:'0 0 2px', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:C.indigo }}>Recommended Action</p>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:css.cardFg }}>{dc.recommendation}</p>
            <p style={{ margin:'4px 0 0', fontSize:12, color:css.mutedFg }}>{dc.rationale}</p>
          </div>
        </div>
        {dc.options?.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(dc.options.length,3)},1fr)`, gap:10 }}>
            {dc.options.map((opt,i) => (
              <div key={i} style={{ border:`1px solid ${css.border}`, borderRadius:10, overflow:'hidden', background:css.card }}>
                <div style={{ padding:'7px 12px', background:css.muted, borderBottom:`1px solid ${css.border}` }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:css.cardFg }}>{opt.label}</p>
                </div>
                <div style={{ padding:'10px 12px', display:'grid', gap:7 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                    <ThumbsUp size={10} style={{ color:C.emerald, flexShrink:0, marginTop:2 }} />
                    <p style={{ margin:0, fontSize:11, color:'#166534', lineHeight:1.5 }}>{opt.pros}</p>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                    <ThumbsDown size={10} style={{ color:C.rose, flexShrink:0, marginTop:2 }} />
                    <p style={{ margin:0, fontSize:11, color:'#b91c1c', lineHeight:1.5 }}>{opt.cons}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {(dc.owner || dc.deadline) && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {dc.owner    && <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:20, border:`1px solid ${css.border}`, background:css.muted }}><User  size={11} style={{ color:css.mutedFg }}/><span style={{ fontSize:11, fontWeight:600, color:css.cardFg }}>{dc.owner}</span></div>}
            {dc.deadline && <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:20, border:`1px solid ${css.border}`, background:css.muted }}><Clock size={11} style={{ color:css.mutedFg }}/><span style={{ fontSize:11, fontWeight:600, color:css.cardFg }}>{dc.deadline}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Insight chip ─────────────────────────────────────────────────────────────
function Chip({ label, value, sub, tone }: { label:string; value:string|number; sub?:string; tone?:string }) {
  return (
    <div style={{ border:`1px solid ${css.border}`, borderRadius:10, padding:'9px 12px', background:`${css.muted}35` }}>
      <p style={{ margin:0, fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:css.mutedFg }}>{label}</p>
      <p style={{ margin:'3px 0 0', fontSize:14, fontWeight:800, color:tone||css.mutedFg, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ margin:'3px 0 0', fontSize:10, color:css.mutedFg, lineHeight:1.3 }}>{sub}</p>}
    </div>
  );
}

// ─── INITIAL PROMPT ───────────────────────────────────────────────────────────
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
  'For each section include quantified points (values, percentages, ranking, trends).',
  'Compare top vs bottom performers with root causes when possible.',
  'Action plan format: priority, owner, deadline, expected impact, risk if not done.',
  'KPI watchlist format: KPI | current signal | target | cadence | owner',
  'If data missing, write "Data unavailable" and continue.',
  'Use concise but information-dense bullets.',
].join('\n');

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function SalesBehaviorReport() {
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [data,            setData]            = useState<SalesBehaviorResponse | null>(null);
  const [conversationId,  setConversationId]  = useState<string | null>(null);
  const [history,         setHistory]         = useState<Array<{role:'user'|'assistant';content:string}>>([]);
  const [generatedAt,     setGeneratedAt]     = useState<Date | null>(null);
  const [insights,        setInsights]        = useState<InsightsSnapshot | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [activeFollowup,  setActiveFollowup]  = useState<string | null>(null);

  const sections = parseSections(data?.answer || '');

  // ── Insights ─────────────────────────────────────────────────────────────
  const loadInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const [kpis,anom,churn,stock,fore,crit] = await Promise.allSettled([
        api.get('/ai-insights/kpis/'),    api.get('/ai-insights/anomalies/'),
        api.get('/ai-insights/churn/?top_n=10'), api.get('/ai-insights/stock/'),
        api.get('/ai-insights/predict/'), api.get('/ai-insights/critical/'),
      ]);
      setInsights({
        kpis:     kpis.status  === 'fulfilled' ? (kpis.value  as any) : undefined,
        anomalies:anom.status  === 'fulfilled' ? (anom.value  as any) : undefined,
        churn:    churn.status === 'fulfilled' ? (churn.value as any) : undefined,
        stock:    stock.status === 'fulfilled' ? (stock.value as any) : undefined,
        forecast: fore.status  === 'fulfilled' ? (fore.value  as any) : undefined,
        critical: crit.status  === 'fulfilled' ? (crit.value  as any) : undefined,
      });
    } finally { setLoadingInsights(false); }
  }, []);

  // ── Run AI ────────────────────────────────────────────────────────────────
  const run = useCallback(async (question: string, reset = false) => {
    setLoading(true); setError(null); setActiveFollowup(null);
    try {
      const hist = reset ? [{ role:'user' as const, content:question }] : [...history, { role:'user' as const, content:question }];
      const res = await api.post<SalesBehaviorResponse>('/ai-insights/chat/', {
        messages: hist,
        ...(reset ? {} : conversationId ? { conversation_id:conversationId } : {}),
        language: 'English',
      });
      setHistory([...hist, { role:'assistant', content:res.answer }]);
      setData(res); setGeneratedAt(new Date());
      if (res.conversation_id) setConversationId(res.conversation_id);
    } catch (e: any) { setError(e?.message ?? 'Unable to generate AI report'); }
    finally { setLoading(false); }
  }, [conversationId, history]);

  useEffect(() => { run(INITIAL_PROMPT, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadInsights(); }, [loadInsights]);

  // ── PRINT — mirrors AgingReport handlePrint exactly ───────────────────────
  const handlePrint = useCallback(() => {
    const printable = document.getElementById('sb-printable');
    if (!printable) return;
    const clone = printable.cloneNode(true) as HTMLElement;
    fixVars(clone);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;

    const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
    const hs      = insights?.kpis?.health_score;
    const urgency = data?.urgency || 'low';
    const UBORDER: Record<string,string> = { critical:'#fca5a5', high:'#fed7aa', medium:'#fde68a', low:'#cbd5e1' };
    const UBG:     Record<string,string> = { critical:'#fee2e2', high:'#ffedd5', medium:'#fef3c7', low:'#e2e8f0' };
    const UFG:     Record<string,string> = { critical:'#b91c1c', high:'#c2410c', medium:'#b45309', low:'#475569' };

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Sales Behavior Report — ${genDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:#fff;color:#0f172a;font-size:12px;}
@page{size:A4 landscape;margin:8mm 10mm;}
.cover{width:100%;height:190mm;break-after:page!important;page-break-after:always!important;position:relative;overflow:hidden;background:#fff;}
.cover-stripe{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#0ea5e9);}
.cover-bg{position:absolute;top:0;right:0;width:48%;height:100%;background:linear-gradient(148deg,#eef2ff,#ede9fe,#ddd6fe,#c4b5fd);clip-path:polygon(12% 0,100% 0,100% 100%,0% 100%);}
.cover-inner{position:relative;z-index:2;display:grid;grid-template-rows:auto 1fr auto;height:100%;padding:28px 48px 24px;}
.cover-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #e2e8f0;}
.cover-main{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:20px 0;}
.cover-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:#0f172a;line-height:1.0;}
.cover-title em{color:#6366f1;font-style:italic;}
.kc{background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.95);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.kc-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;}
.kc-val{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1;}
.kc-note{font-size:10px;color:#94a3b8;margin-top:2px;}
.badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;}
.cover-footer{border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;}
.body-wrap{padding:16px 20px;}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-shadow:none!important;}
button,.screen-only{display:none!important;}
details>*:not(summary){display:block!important;}
details{display:none!important;}
section{break-inside:avoid;page-break-inside:avoid;}
div[style*="border-radius:12px"],div[style*="border-radius: 12px"],div[style*="border-radius:14px"],div[style*="border-radius: 14px"]{break-inside:avoid;page-break-inside:avoid;}
table{break-inside:avoid;page-break-inside:avoid;}
tr{break-inside:avoid;page-break-inside:avoid;}
div[style*="grid-template-columns"]{break-inside:avoid;page-break-inside:avoid;}
</style></head><body>

<div class="cover">
  <div class="cover-stripe"></div><div class="cover-bg"></div>
  <div class="cover-inner">
    <div class="cover-top">
      <span style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#374151;">WEEG Financial</span>
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#6366f1;background:#eef2ff;border:1.5px solid #c7d2fe;padding:4px 13px;border-radius:20px;">AI Intelligence Report</span>
    </div>
    <div class="cover-main">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:14px;">Commercial Intelligence</div>
        <h1 class="cover-title">Sales<br/><em>Behavior</em></h1>
        <p style="font-size:15px;color:#64748b;margin:14px 0 18px;">AI-Generated Analysis — ${genDate}</p>
        <p style="font-size:12px;color:#94a3b8;line-height:1.85;border-left:3px solid #c4b5fd;padding-left:16px;">Comprehensive view of channel, regional, segment and product behavior — 30-day action plan · KPI watchlist · data gaps. ${sections.length} analytical sections · ${sections.reduce((a,s)=>a+s.lines.length,0)} insights generated by AI.</p>
        <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap;">
          <span style="font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;background:${UBG[urgency]};color:${UFG[urgency]};border:1px solid ${UBORDER[urgency]};">Urgency: ${urgency.toUpperCase()}</span>
          <span style="font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;background:#ede9fe;color:#7c3aed;border:1px solid #ddd6fe;">Topic: ${escH(data?.topic||'general')}</span>
          ${data?.fallback ? '<span style="font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;background:#fef3c7;color:#b45309;border:1px solid #fde68a;">Fallback mode</span>' : ''}
        </div>
      </div>
      <div style="padding-left:8px;">
        <div class="kc">
          <div><div class="kc-lbl">KPI Health Score</div><div class="kc-val" style="color:${hColor(hs)};">${hs ?? '—'}</div><div class="kc-note">${insights?.kpis?.health_label||'n/a'}</div></div>
          <span class="badge" style="background:${hs&&hs>=70?'#d1fae5':'#ffe4e6'};color:${hs&&hs>=70?'#059669':'#e11d48'};">${hs&&hs>=70?'✓ Healthy':'⚠ Review'}</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">Critical Exposure</div><div class="kc-val" style="color:#e11d48;">${money(insights?.critical?.total_exposure_lyd)}</div><div class="kc-note">${insights?.critical?.critical_count??0} critical · ${insights?.critical?.risk_level||'n/a'}</div></div>
          <span class="badge" style="background:#ffe4e6;color:#e11d48;">Risk</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">Churn Risk</div><div class="kc-val" style="color:#f43f5e;">${insights?.churn?.summary?.critical??0} crit · ${insights?.churn?.summary?.high??0} high</div><div class="kc-note">Avg ${(((insights?.churn?.summary?.avg_churn_score||0)*100).toFixed(0))}% score</div></div>
          <span class="badge" style="background:#ffe4e6;color:#f43f5e;">Churn</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">3-Month Forecast</div><div class="kc-val" style="color:#6366f1;">${money(insights?.forecast?.forecast_total_base_lyd)}</div><div class="kc-note">Trend: ${insights?.forecast?.trend_model?.direction||'unknown'}</div></div>
          <span class="badge" style="background:#eef2ff;color:#6366f1;">Forecast</span>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      <div style="display:flex;align-items:center;gap:12px;font-size:10px;color:#94a3b8;">
        <span>Generated ${genDate}</span><span style="width:3px;height:3px;border-radius:50%;background:#cbd5e1;display:inline-block;"></span>
        <span>${sections.length} sections · ${sections.reduce((a,s)=>a+s.lines.length,0)} insights</span><span style="width:3px;height:3px;border-radius:50%;background:#cbd5e1;display:inline-block;"></span>
        <span>Powered by WEEG AI</span>
      </div>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#a5b4fc;border:1.5px solid #e0e7ff;padding:3px 10px;border-radius:20px;background:#faf5ff;">Confidential</span>
    </div>
  </div>
</div>

<div class="body-wrap">${clone.outerHTML}</div>
</body></html>`);
    doc.close();

    iframe.style.visibility = 'visible';
    iframe.style.zIndex     = '9999';
    const cleanup    = () => { iframe.style.visibility = 'hidden'; setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500); };
    const triggerPrt = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.print(); } };
    iframe.onload = () => setTimeout(triggerPrt, 800);
    setTimeout(triggerPrt, 1800);
    if (iframe.contentWindow) { iframe.contentWindow.onafterprint = cleanup; setTimeout(cleanup, 90_000); }
  }, [data, sections, insights]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* ── TOOLBAR ────────────────────────────────────────────────────────── */}
      <div style={{ ...card, background:`linear-gradient(135deg,${C.indigo}08,${C.violet}04)`, marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:`linear-gradient(135deg,${C.indigo},${C.violet})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 14px ${C.indigo}40` }}>
              <Globe size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize:20, fontWeight:900, color:css.fg, margin:0, letterSpacing:'-0.03em' }}>Sales Behavior (AI Report)</h1>
              <p style={{ fontSize:12, color:'#64748b', margin:'3px 0 0' }}>
                Channel · Regional · Segment · Product · Seasonal · Actions · KPI Watchlist
                {generatedAt && <span style={{ marginLeft:8, opacity:0.7 }}>· {generatedAt.toLocaleTimeString()}</span>}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={loadInsights} disabled={loadingInsights} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:`1px solid ${css.border}`, background:css.card, color:'#64748b', fontSize:13, cursor:loadingInsights?'not-allowed':'pointer', opacity:loadingInsights?0.7:1 }}>
              {loadingInsights ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Refresh context
            </button>
            <button onClick={() => run(INITIAL_PROMPT, true)} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:`1px solid ${css.border}`, background:css.card, color:'#64748b', fontSize:13, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Regenerate
            </button>
            <button onClick={handlePrint} disabled={!data||loading} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:`1px solid ${C.indigo}40`, background:`${C.indigo}10`, color:C.indigo, fontSize:13, fontWeight:700, cursor:!data||loading?'not-allowed':'pointer', opacity:!data||loading?0.7:1 }}>
              <Printer size={13} />Print / Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── LOADING ─────────────────────────────────────────────────────────── */}
      {loading && !data && (
        <div style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'56px 20px', borderStyle:'dashed' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:`${C.indigo}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Loader2 size={22} className="animate-spin" style={{ color:C.indigo }} />
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ margin:0, fontSize:14, fontWeight:600, color:css.cardFg }}>Generating AI report…</p>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'#64748b' }}>Analyzing 10 dimensions: channels · regions · segments · products · seasonality…</p>
          </div>
        </div>
      )}

      {/* ── ERROR ───────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ borderRadius:12, border:'1px solid #fecaca', background:'#fef2f2', color:'#b91c1c', padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:8 }}>
          <AlertCircle size={15} style={{ marginTop:1, flexShrink:0 }} />
          <div><p style={{ margin:0, fontSize:12, fontWeight:700 }}>Unable to generate report</p><p style={{ margin:'2px 0 0', fontSize:12 }}>{error}</p></div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PRINTABLE BODY  ──  id="sb-printable"
          Everything here is always fully rendered — no collapsed sections.
          The iframe print clones this entire div.
      ══════════════════════════════════════════════════════════════════════ */}
      {data && (
        <div id="sb-printable" style={{ display:'flex', flexDirection:'column', gap:60 }}>

          {/* ── PART I — CONTEXT SNAPSHOT ──────────────────────────────────── */}
          <section style={{ breakInside:'avoid', pageBreakInside:'avoid' }}>
            <PartHeader letter="I" label="AI Insights Snapshot" color={C.indigo} />

            {/* Status chips row */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:18 }}>
              {(() => {
                const s = URGENCY[data.urgency] || URGENCY.low;
                return (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', padding:'3px 9px', borderRadius:20, background:s.bg, color:s.text, border:`1px solid ${s.border}` }}>
                    <Zap size={10} />Urgency: {data.urgency}
                  </span>
                );
              })()}
              <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', padding:'3px 9px', borderRadius:20, border:`1px solid ${css.border}`, color:css.mutedFg }}>Topic: {data.topic||'general'}</span>
              {data.fallback && <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', padding:'3px 9px', borderRadius:20, background:'#fffbeb', color:'#b45309', border:'1px solid #fcd34d' }}>Fallback mode</span>}
            </div>

            {/* Chips grid */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${css.border}` }}>
                <Layers size={13} style={{ color:css.mutedFg }} />
                <p style={{ margin:0, fontSize:11, fontWeight:800, color:css.cardFg, textTransform:'uppercase', letterSpacing:'0.06em' }}>Live Context from All AI Modules</p>
                {loadingInsights && <Loader2 size={11} className="animate-spin" style={{ color:css.mutedFg, marginLeft:'auto' }} />}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(152px,1fr))', gap:10 }}>
                <Chip label="KPI Health"        value={insights?.kpis?.health_score ?? '—'}                                                            sub={insights?.kpis?.health_label||'n/a'}                                                              tone={hColor(insights?.kpis?.health_score)} />
                <Chip label="Anomalies"         value={`${insights?.anomalies?.summary?.critical??0}c · ${insights?.anomalies?.summary?.high??0}h`}     sub={`${insights?.anomalies?.summary?.total??0} total`}                                                tone={C.orange}  />
                <Chip label="Churn Risk"        value={`${insights?.churn?.summary?.critical??0}c · ${insights?.churn?.summary?.high??0}h`}             sub={`Avg ${(((insights?.churn?.summary?.avg_churn_score||0)*100).toFixed(0))}%`}                      tone={C.rose}    />
                <Chip label="Stock Alerts"      value={`${insights?.stock?.summary?.immediate_reorders??0}imm · ${insights?.stock?.summary?.soon_reorders??0}soon`} sub={`${insights?.stock?.summary?.class_a_count??0} Class A SKUs`}                         tone={C.amber}   />
                <Chip label="Forecast"          value={insights?.forecast?.trend_model?.direction || '—'}                                              sub={`3-mo: ${money(insights?.forecast?.forecast_total_base_lyd)}`}                                    tone={C.cyan}    />
                <Chip label="Critical Exposure" value={money(insights?.critical?.total_exposure_lyd)}                                                  sub={`${insights?.critical?.critical_count??0} sit. · ${insights?.critical?.risk_level||'n/a'}`}       tone={C.violet}  />
              </div>
            </div>
          </section>

          {/* ── PART II — DECISION CARD ─────────────────────────────────────── */}
          {data.decision_card && (
            <section style={{ breakInside:'avoid', pageBreakInside:'avoid' }}>
              <PartHeader letter="II" label="Decision Recommendation" color={C.indigo} />
              <DecisionPanel dc={data.decision_card} />
            </section>
          )}

          {/* ── PART III — AI SECTIONS A→J ─────────────────────────────────── */}
          {sections.length > 0 && (
            <section>
              <PartHeader letter="III" label="AI Commercial Analysis" color={C.violet} />
              <div style={{ display:'grid', gap:14 }}>
                {sections.map(s => <SectionCard key={s.key} section={s} />)}
              </div>
            </section>
          )}

          {/* Fallback: raw text when no sections parsed */}
          {sections.length === 0 && (
            <section style={{ breakInside:'avoid', pageBreakInside:'avoid' }}>
              <PartHeader letter="III" label="AI Commercial Analysis" color={C.violet} />
              <div style={card}>
                {data.answer.split('\n').filter(Boolean).map((line,i) => (
                  <p key={i} style={{ margin:'0 0 6px', fontSize:12.5, color:css.cardFg, lineHeight:1.65 }}>{line}</p>
                ))}
              </div>
            </section>
          )}

          {/* ── PART IV — FOLLOW-UPS ─────────────────────────────────────────── */}
          {data.suggested_followups?.length > 0 && (
            <section style={{ breakInside:'avoid', pageBreakInside:'avoid' }}>
              <PartHeader letter="IV" label="Suggested Next Questions" color={C.emerald} />
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${css.border}` }}>
                  <ArrowRight size={13} style={{ color:C.emerald }} />
                  <p style={{ margin:0, fontSize:11, fontWeight:800, color:css.cardFg, textTransform:'uppercase', letterSpacing:'0.06em' }}>AI-Suggested Follow-ups</p>
                </div>
                {/* Screen: clickable buttons (hidden in print via CSS) */}
                <div className="screen-only" style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {data.suggested_followups.map((q,i) => (
                    <button key={i} onClick={() => { setActiveFollowup(q); run(q); }} disabled={loading}
                      style={{ border:`1px solid ${activeFollowup===q ? C.indigo : `${C.indigo}40`}`, background:`${C.indigo}10`, color:C.indigo, borderRadius:999, fontSize:11.5, fontWeight:600, padding:'6px 12px', cursor:loading?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:5, opacity:loading?0.7:1 }}>
                      {activeFollowup===q && loading ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
                      {q}
                    </button>
                  ))}
                </div>
                {/* Print: numbered list */}
                <div style={{ display:'grid', gap:7 }}>
                  {data.suggested_followups.map((q,i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background:`${C.emerald}18`, color:C.emerald, fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</span>
                      <p style={{ margin:0, fontSize:12.5, color:css.cardFg, lineHeight:1.65 }}>{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:css.mutedFg, paddingTop:10, borderTop:`1px solid ${css.border}` }}>
            <CheckCircle2 size={12} style={{ color:C.emerald }} />
            Report generated from: credit · sales · stock · churn · forecast · anomalies · critical detector
            {generatedAt && <span style={{ marginLeft:'auto' }}>Generated {generatedAt.toLocaleString()}</span>}
          </div>

          {/* Raw output — hidden entirely in print */}
          <details style={{ border:`1px solid ${css.border}`, borderRadius:10, padding:'8px 12px', background:`${css.muted}40` }}>
            <summary style={{ cursor:'pointer', fontSize:12, fontWeight:700, color:css.cardFg, userSelect:'none' }}>
              View full raw AI output ({data.answer.length} chars)
            </summary>
            <pre style={{ marginTop:10, fontSize:11, color:css.cardFg, lineHeight:1.6, whiteSpace:'pre-wrap', overflowWrap:'break-word' }}>
              {data.answer}
            </pre>
          </details>

        </div>
      )}
    </div>
  );
}