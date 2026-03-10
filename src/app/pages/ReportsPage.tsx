// ═══════════════════════════════════════════════════════════════════
// ReportsPage.tsx — FINAL VERSION
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  BarChart3,
  Printer,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
  LabelList,
} from 'recharts';
import { formatCurrency } from '../lib/utils';
import { GeneralReport } from './GeneralReport';
import { SupplyPolicyPage } from './SupplyPolicyPage';
import { PricingProfitabilityReport } from './PricingProfitabilityReport';
import { InventoryTurnoverReport } from './InventoryTurnoverReport';
// ─── Design tokens ────────────────────────────────────────────────
const C = {
  indigo:'#6366f1', violet:'#8b5cf6', cyan:'#0ea5e9', teal:'#14b8a6',
  emerald:'#10b981', amber:'#f59e0b', orange:'#f97316', rose:'#f43f5e',
  sky:'#38bdf8', pink:'#ec4899',
};
const BRANCH_PAL = [
  '#6366f1','#0ea5e9','#14b8a6','#10b981',
  '#f59e0b','#f43f5e','#8b5cf6','#f97316',
  '#38bdf8','#ec4899','#84cc16','#06b6d4',
];
const BRANCH_COLORS: Record<string, string> = {
  'Al-Karimia':           '#6366f1',
  'Dahmani':              '#14b8a6',
  'Janzour':              '#10b981',
  'Al-Mazraa':            '#0ea5e9',
  'Misrata':              '#f59e0b',
  'Benghazi':             '#f43f5e',
  'Integrated (Karimia)': '#8b5cf6',
};
const RISK_CFG: Record<string, { label: string; color: string }> = {
  low:      { label: 'Low',      color: '#10b981' },
  medium:   { label: 'Medium',   color: '#f59e0b' },
  high:     { label: 'High',     color: '#f97316' },
  critical: { label: 'Critical', color: '#f43f5e' },
};
const BUCKET_COLORS = [
  '#10b981','#34d399','#fbbf24','#f59e0b','#f97316',
  '#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#6b21a8','#581c87','#3b0764',
];
const css = {
  card: 'hsl(var(--card))', cardFg: 'hsl(var(--card-foreground))',
  border: 'hsl(var(--border))', muted: 'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--background))',
  fg: 'hsl(var(--foreground))',
};
const card: React.CSSProperties = {
  background: css.card, borderRadius: 16, padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08),0 4px 20px rgba(0,0,0,0.05)',
  border: `1px solid ${css.border}`,
};
const ax = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

// ─── Types ────────────────────────────────────────────────────────
interface AgingRow {
  id: string; account: string; account_code?: string;
  customer_name?: string | null;
  branch?: string | null;
  current: number; d1_30: number; d31_60: number; d61_90: number;
  d91_120: number; d121_150: number; d151_180: number; d181_210: number;
  d211_240: number; d241_270: number; d271_300: number; d301_330: number;
  over_330: number; total: number; overdue_total: number; risk_score?: string;
}
interface KpiData {
  kpis: { taux_recouvrement: { value: number }; taux_impayes: { value: number }; dmp: { value: number } };
  summary: { grand_total_receivables: number; overdue_amount: number; ca_total: number; credit_customers: number };
}
interface AgingRowWithBranch extends AgingRow { resolvedBranch: string; }

// ─── Helpers ──────────────────────────────────────────────────────
const num = (v: unknown) => { const n = Number(v); return isFinite(n) ? n : 0; };
const norm = (r: AgingRow): AgingRow => ({
  ...r,
  current: num(r.current), d1_30: num(r.d1_30), d31_60: num(r.d31_60),
  d61_90: num(r.d61_90), d91_120: num(r.d91_120), d121_150: num(r.d121_150),
  d151_180: num(r.d151_180), d181_210: num(r.d181_210), d211_240: num(r.d211_240),
  d241_270: num(r.d241_270), d271_300: num(r.d271_300), d301_330: num(r.d301_330),
  over_330: num(r.over_330), total: num(r.total), overdue_total: num(r.overdue_total),
  customer_name: r.customer_name || r.account || null,
});
function auth() { const t = localStorage.getItem('fasi_access_token'); return t ? { Authorization: `Bearer ${t}` } : {}; }
function pct(a: number, b: number) { return b > 0 ? +((a / b) * 100).toFixed(1) : 0; }

function shortName(row: AgingRow, maxLen = 30): string {
  const raw = row.customer_name ?? row.account ?? '';
  const stripped = raw.replace(/^\d+\s*[-–]\s*/, '');
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + '…' : stripped;
}

// ─── Arabic → English branch name mapping ─────────────────────────
const AR_TO_EN: Record<string, string> = {
  'مخزن صالة عرض الكريمية':            'Al-Karimia',
  'مخزن صالة عرض الدهماني':            'Dahmani',
  'مخزن صالة عرض جنزور':               'Janzour',
  'مخزن صالة عرض مصراتة':              'Misrata',
  'مخزن المزرعة':                      'Al-Mazraa',
  'مخزن بنغازي':                       'Benghazi',
  'مخزن الأنظمة المتكاملة - الكريمية': 'Integrated (Karimia)',
  'الكريمية':          'Al-Karimia',
  'الدهماني':          'Dahmani',
  'الفلاح':            'Dahmani',
  'جنزور':             'Janzour',
  'مصراتة':            'Misrata',
  'المزرعة':           'Al-Mazraa',
  'بنغازي':            'Benghazi',
  'الأنظمة المتكاملة': 'Integrated (Karimia)',
  'انظمة متكاملة':     'Integrated (Karimia)',
  'Al-Karimia':           'Al-Karimia',
  'Dahmani':              'Dahmani',
  'Janzour':              'Janzour',
  'Misrata':              'Misrata',
  'Al-Mazraa':            'Al-Mazraa',
  'Benghazi':             'Benghazi',
  'Integrated (Karimia)': 'Integrated (Karimia)',
};

function enBranch(ar: string | null | undefined): string {
  if (!ar) return 'Unassigned';
  const t = ar.trim();
  if (AR_TO_EN[t]) return AR_TO_EN[t];
  for (const [arKey, enVal] of Object.entries(AR_TO_EN)) {
    if (t.includes(arKey) || arKey.includes(t)) return enVal;
  }
  return t;
}

const BRANCH_KEYWORDS_FE: Array<[string, string]> = [
  ['مصراتة',   'مخزن صالة عرض مصراتة'],
  ['جنزور',    'مخزن صالة عرض جنزور'],
  ['الدهماني', 'مخزن صالة عرض الدهماني'],
  ['الفلاح',   'مخزن صالة عرض الدهماني'],
  ['الكريمية', 'مخزن صالة عرض الكريمية'],
  ['المزرعة',  'مخزن المزرعة'],
  ['بنغازي',   'مخزن بنغازي'],
  ['متكاملة',  'مخزن الأنظمة المتكاملة - الكريمية'],
];

function detectBranchFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const [kw, branch] of BRANCH_KEYWORDS_FE) {
    if (text.includes(kw)) return branch;
  }
  return null;
}

function detectBranchFromCode(code: string): string | null {
  if (!code) return null;
  const c = code.trim();
  if (c.startsWith('11450') || c.startsWith('11451')) return 'مخزن صالة عرض جنزور';
  if (c.startsWith('1146') || c.startsWith('1147'))   return 'مخزن صالة عرض مصراتة';
  if (c.startsWith('1141') || c.startsWith('1142') || c.startsWith('1143') || c.startsWith('1144'))
    return 'مخزن صالة عرض الكريمية';
  return null;
}

function resolveRowBranch(row: AgingRow): string {
  if (row.branch) return enBranch(row.branch);
  const fromAccount = detectBranchFromText(row.account);
  if (fromAccount) return enBranch(fromAccount);
  const fromName = detectBranchFromText(row.customer_name);
  if (fromName) return enBranch(fromName);
  const fromCode = detectBranchFromCode(row.account_code ?? row.account ?? '');
  if (fromCode) return enBranch(fromCode);
  return 'Unassigned';
}

// ─── Atoms ────────────────────────────────────────────────────────
function Spin() { return <Loader2 size={20} className="animate-spin" style={{ color: C.indigo }} />; }

function Empty({ text = 'No data', h = 180 }: { text?: string; h?: number }) {
  return (
    <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 13, flexDirection: 'column', gap: 8 }}>
      <BarChart3 size={24} style={{ opacity: .25 }} />{text}
    </div>
  );
}

function Tip({ active, payload, label, isCurrency = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', boxShadow: '0 10px 30px rgba(0,0,0,.15)', fontSize: 12, minWidth: 200 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 10 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.fill ?? p.color, flexShrink: 0 }} />
          <span style={{ color: '#6b7280', flex: 1 }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>
            {isCurrency && typeof p.value === 'number' ? formatCurrency(p.value) : typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SecHead({ n, title, sub, color = C.indigo }: { n: number; title: string; sub?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
      <span style={{ width: 36, height: 36, borderRadius: 11, background: `${color}18`, color, fontSize: 16, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${color}30` }}>{n}</span>
      <div>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: css.fg, margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: css.mutedFg, margin: '4px 0 0', lineHeight: 1.5 }}>{sub}</p>}
      </div>
    </div>
  );
}

function KCard({ label, value, sub, accent, Icon, target }: { label: string; value: string; sub: string; accent: string; Icon: any; target?: string }) {
  return (
    <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -24, right: -24, width: 96, height: 96, borderRadius: '50%', background: accent, opacity: .07, filter: 'blur(24px)' }} />
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={17} style={{ color: accent }} />
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: css.mutedFg, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color: accent, margin: '4px 0 0', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ fontSize: 11, color: css.mutedFg, marginTop: 4 }}>{sub}</p>
      {target && <p style={{ fontSize: 10, marginTop: 6, color: accent, fontWeight: 600 }}>Target: {target}</p>}
    </div>
  );
}

// ─── Customer table ────────────────────────────────────────────────
function CustomerTable({ customers, showOverdue = true, maxRows = 999 }: { customers: AgingRowWithBranch[]; showOverdue?: boolean; maxRows?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? customers : customers.slice(0, maxRows);
  const hasMore = customers.length > maxRows;
  const td = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '6px 10px', fontSize: 11, borderBottom: `1px solid ${css.border}`, ...extra });
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: css.muted }}>
              {['Customer', 'Branch', 'Total', ...(showOverdue ? ['On-track', 'Overdue >60d'] : []), 'CR%', 'Risk'].map(h => (
                <th key={h} style={{ ...td(), textAlign: h === 'Customer' ? 'left' : 'right', fontWeight: 700, color: css.mutedFg }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const cr = r.total > 0 ? ((r.total - r.overdue_total) / r.total * 100) : 0;
              const risk = r.risk_score ?? 'low';
              const rc = RISK_CFG[risk]?.color ?? C.indigo;
              const bc = BRANCH_COLORS[r.resolvedBranch] ?? C.indigo;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : css.muted + '40' }}>
                  <td style={{ ...td(), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600, color: css.cardFg }}>{shortName(r, 28)}</span>
                  </td>
                  <td style={{ ...td({ textAlign: 'right' }) }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 12, whiteSpace: 'nowrap', background: `${bc}18`, color: bc }}>{r.resolvedBranch}</span>
                  </td>
                  <td style={{ ...td({ textAlign: 'right', fontWeight: 700, color: css.cardFg }) }}>{formatCurrency(r.total)}</td>
                  {showOverdue && <td style={{ ...td({ textAlign: 'right', color: C.emerald, fontWeight: 600 }) }}>{formatCurrency(r.total - r.overdue_total)}</td>}
                  {showOverdue && <td style={{ ...td({ textAlign: 'right', color: r.overdue_total > 0 ? C.rose : css.mutedFg, fontWeight: r.overdue_total > 0 ? 700 : 400 }) }}>
                    {r.overdue_total > 0 ? formatCurrency(r.overdue_total) : '—'}
                  </td>}
                  <td style={{ ...td({ textAlign: 'right' }) }}><span style={{ fontWeight: 800, color: cr >= 70 ? C.emerald : C.rose }}>{cr.toFixed(1)}%</span></td>
                  <td style={{ ...td({ textAlign: 'center' }) }}><span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 12, background: `${rc}18`, color: rc }}>{RISK_CFG[risk]?.label ?? risk}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.indigo, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', fontWeight: 600 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Show less' : `Show all ${customers.length} customers`}
        </button>
      )}
    </div>
  );
}

// ─── Print-ready Aging Detail Table ────────────────────────────────
function AgingDetailPrintTable({ branchBuckets, grandTotal }: { branchBuckets: any[]; grandTotal: number }) {
  if (!branchBuckets.length) return null;
  const tdH: React.CSSProperties = { padding: '7px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', textAlign: 'right', whiteSpace: 'nowrap' };
  const tdB = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '8px 10px', fontSize: 11, borderBottom: '1px solid #f3f4f6', ...extra });
  return (
    <div style={{ marginTop: 24, borderTop: `2px solid ${css.border}`, paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: css.mutedFg, margin: 0 }}>📋 Branch × Aging Bucket — Print Summary</p>
          <p style={{ fontSize: 11, color: css.mutedFg, marginTop: 3 }}>Exact amounts per branch · designed for A4 paper printing</p>
        </div>
        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: `${C.indigo}12`, color: C.indigo, fontWeight: 700, border: `1px solid ${C.indigo}25` }}>Print-optimised</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...tdH, textAlign: 'left' }}>Branch</th>
              <th style={tdH}>Customers</th>
              <th style={tdH}>Total LYD</th>
              <th style={tdH}>Current</th>
              <th style={tdH}>1–60d</th>
              <th style={{ ...tdH, color: C.rose }}>Overdue &gt;60d</th>
              <th style={{ ...tdH, color: C.rose }}>Overdue %</th>
              <th style={{ ...tdH, color: C.emerald }}>CR %</th>
            </tr>
          </thead>
          <tbody>
            {branchBuckets.map((b: any, i: number) => {
              const cr = b.total > 0 ? ((b.total - b.overdue) / b.total * 100) : 0;
              const ovPct = b.total > 0 ? (b.overdue / b.total * 100) : 0;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#f9fafb' }}>
                  <td style={{ ...tdB({ textAlign: 'left' }) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, display: 'inline-block' }} />
                      <strong style={{ fontSize: 12, color: css.cardFg }}>{b.branch}</strong>
                    </div>
                  </td>
                  <td style={{ ...tdB({ textAlign: 'right', color: css.mutedFg }) }}>{b.count}</td>
                  <td style={{ ...tdB({ textAlign: 'right', fontWeight: 800, color: C.indigo }) }}>{formatCurrency(b.total)}</td>
                  <td style={{ ...tdB({ textAlign: 'right' }) }}>
                    <span style={{ color: C.emerald, fontWeight: 600 }}>{formatCurrency(b.current)}</span>
                    <span style={{ fontSize: 9, color: css.mutedFg, display: 'block' }}>{b.total > 0 ? ((b.current / b.total) * 100).toFixed(1) : 0}%</span>
                  </td>
                  <td style={{ ...tdB({ textAlign: 'right' }) }}>
                    <span style={{ color: C.amber, fontWeight: 600 }}>{formatCurrency(b.d1_60)}</span>
                    <span style={{ fontSize: 9, color: css.mutedFg, display: 'block' }}>{b.total > 0 ? ((b.d1_60 / b.total) * 100).toFixed(1) : 0}%</span>
                  </td>
                  <td style={{ ...tdB({ textAlign: 'right' }) }}>
                    <span style={{ color: b.overdue > 0 ? C.rose : css.mutedFg, fontWeight: b.overdue > 0 ? 700 : 400 }}>{b.overdue > 0 ? formatCurrency(b.overdue) : '—'}</span>
                    {b.overdue > 0 && <span style={{ fontSize: 9, color: C.rose, display: 'block' }}>{ovPct.toFixed(1)}%</span>}
                  </td>
                  <td style={{ ...tdB({ textAlign: 'right' }) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ width: 48, height: 5, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, ovPct)}%`, height: '100%', background: ovPct <= 20 ? C.emerald : ovPct <= 35 ? C.amber : C.rose, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 11, color: ovPct <= 20 ? C.emerald : ovPct <= 35 ? C.amber : C.rose }}>{ovPct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ ...tdB({ textAlign: 'right' }) }}>
                    <span style={{ fontWeight: 800, fontSize: 12, padding: '2px 9px', borderRadius: 20, background: cr >= 70 ? `${C.emerald}15` : `${C.rose}15`, color: cr >= 70 ? C.emerald : C.rose, border: `1px solid ${cr >= 70 ? C.emerald : C.rose}30` }}>{cr.toFixed(1)}%</span>
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid #e5e7eb', background: `${C.indigo}05` }}>
              <td style={{ ...tdB({ textAlign: 'left' }) }}><strong style={{ fontSize: 12, color: C.indigo }}>TOTAL — All Branches</strong></td>
              <td style={{ ...tdB({ textAlign: 'right', fontWeight: 700 }) }}>{branchBuckets.reduce((s: number, b: any) => s + b.count, 0)}</td>
              <td style={{ ...tdB({ textAlign: 'right', fontWeight: 900, color: C.indigo, fontSize: 13 }) }}>{formatCurrency(grandTotal)}</td>
              <td style={{ ...tdB({ textAlign: 'right', fontWeight: 700, color: C.emerald }) }}>{formatCurrency(branchBuckets.reduce((s: number, b: any) => s + b.current, 0))}</td>
              <td style={{ ...tdB({ textAlign: 'right', fontWeight: 700, color: C.amber }) }}>{formatCurrency(branchBuckets.reduce((s: number, b: any) => s + b.d1_60, 0))}</td>
              <td style={{ ...tdB({ textAlign: 'right', fontWeight: 700, color: C.rose }) }}>{formatCurrency(branchBuckets.reduce((s: number, b: any) => s + b.overdue, 0))}</td>
              <td style={{ ...tdB({ textAlign: 'right', fontWeight: 700 }) }}>{pct(branchBuckets.reduce((s: number, b: any) => s + b.overdue, 0), grandTotal)}%</td>
              <td style={{ ...tdB({ textAlign: 'right', fontWeight: 800 }) }}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 16px', background: `${C.indigo}05`, borderRadius: 10, border: `1px solid ${css.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: css.mutedFg, width: '100%', marginBottom: 4 }}>Legend:</span>
        {[
          { c: C.emerald, l: 'Current — not yet due (healthy)' },
          { c: C.amber, l: '1–60d — slightly overdue (monitor)' },
          { c: C.rose, l: '> 60d — overdue (critical action needed)' },
          { c: C.indigo, l: 'CR% ≥ 70% = target met' },
          { c: C.rose, l: 'CR% < 70% = below target ⚠' },
        ].map(({ c, l }) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: css.mutedFg }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

const REPORT_TYPES = [
  { id: 'general', title: 'General Report', desc: 'Overview of key metrics and performance indicators', icon: '🎯', live: true },
  { id: 'aging', title: 'Aging Receivables', desc: 'Receivables, top debtors, collection rate & customer balances — all branches', icon: '⏰', live: true },
  { id: 'turnover', title: 'Inventory Turnover', desc: 'Stock quantity · total value · value by branch · value by index/category · index ratios · rotation & slow-moving', icon: '📊', live: true },
  { id: 'profitability', title: 'Pricing & Profitability', desc: 'Sales quantity, revenue, profit & ratio by month/branch · product & customer profitability', icon: '💰', live: true },
  { id: 'supply', title: 'Stock Policy', desc: 'Reorder points, lead times, optimal stock levels', icon: '📦', live: true  },
  { id: 'distribution', title: 'Sales Behavior', desc: 'Patterns by channel, region, and customer segment', icon: '🌍', live: false },
];

// ═══════════════════════════════════════════════════════════════════
// AGING REPORT
// ═══════════════════════════════════════════════════════════════════
function AgingReport() {
  const [dates, setDates] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState('');
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [branchMonthly, setBranchMonthly] = useState<any[]>([]);
  const [branchNames, setBranchNames] = useState<string[]>([]);
  const [loadRows, setLoadRows] = useState(true);
  const [loadKpi, setLoadKpi] = useState(true);
  const [loadBranch, setLoadBranch] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/aging/dates/', { headers: auth() }).then(r => {
      const d: string[] = r.data?.dates ?? [];
      setDates(d);
      if (d.length) setActiveDate(d[0]);
    }).catch(() => {});

    axios.get('/api/transactions/branch-monthly/', { params: { movement_type: 'ف بيع' }, headers: auth() })
      .then(r => { setBranchMonthly(r.data?.monthly_data ?? []); setBranchNames(r.data?.branches ?? []); })
      .catch(() => {}).finally(() => setLoadBranch(false));
  }, []);

  const fetchRows = useCallback(async (date: string) => {
    if (!date) return;
    setLoadRows(true); setError('');
    try {
      const r = await axios.get('/api/aging/', {
        params: { report_date: date, page_size: 200 },
        headers: auth(),
      });
      const items = (r.data?.records ?? r.data?.results ?? []) as AgingRow[];
      setRows(items.map(norm));
    } catch (e: any) { setError(e.message ?? 'Loading error'); }
    finally { setLoadRows(false); }
  }, []);

  const fetchKpi = useCallback(async (date: string) => {
    setLoadKpi(true);
    try {
      const r = await axios.get('/api/kpi/credit/', { params: { report_date: date || undefined }, headers: auth() });
      setKpi(r.data);
    } catch {} finally { setLoadKpi(false); }
  }, []);

  useEffect(() => { if (activeDate) { fetchRows(activeDate); fetchKpi(activeDate); } }, [activeDate]);

  const totals = useMemo(() => ({
    total: rows.reduce((s, r) => s + r.total, 0),
    current: rows.reduce((s, r) => s + r.current, 0),
    overdue: rows.reduce((s, r) => s + r.overdue_total, 0),
    d1_60: rows.reduce((s, r) => s + r.d1_30 + r.d31_60, 0),
  }), [rows]);

  const globalCR = kpi ? num(kpi.kpis.taux_recouvrement.value) : 0;
  const globalOR = kpi ? num(kpi.kpis.taux_impayes.value) : 0;
  const globalDSO = kpi ? num(kpi.kpis.dmp.value) : 0;
  const caTotal = kpi?.summary?.ca_total ?? 0;
  const collected = Math.max(0, caTotal - totals.total);

  const rowsWithBranch = useMemo(() =>
    rows.map(r => ({ ...r, resolvedBranch: resolveRowBranch(r) } as AgingRowWithBranch))
  , [rows]);

  const topDebtors = useMemo(() =>
    [...rowsWithBranch].sort((a, b) => b.total - a.total).slice(0, 15).map(r => ({
      name: shortName(r, 22),
      nameWithBranch: `${shortName(r, 18)} [${r.resolvedBranch !== 'Unassigned' ? r.resolvedBranch : 'N/A'}]`,
      branch: r.resolvedBranch,
      total: r.total, overdue: r.overdue_total,
      color: RISK_CFG[r.risk_score ?? 'low']?.color ?? C.indigo,
      risk: r.risk_score ?? 'low',
    }))
  , [rowsWithBranch]);

  const buckets = useMemo(() => {
    const keys: [keyof AgingRow, string][] = [
      ['current', 'Current'], ['d1_30', '1-30d'], ['d31_60', '31-60d'], ['d61_90', '61-90d'],
      ['d91_120', '91-120d'], ['d121_150', '121-150d'], ['d151_180', '151-180d'], ['d181_210', '181-210d'],
      ['d211_240', '211-240d'], ['d241_270', '241-270d'], ['d271_300', '271-300d'], ['d301_330', '301-330d'], ['over_330', '>330d'],
    ];
    return keys.map(([k, label], i) => ({ label, amount: rows.reduce((s, r) => s + num(r[k]), 0), color: BUCKET_COLORS[i] }));
  }, [rows]);

  const branchBuckets = useMemo(() => {
    const assigned = rowsWithBranch.filter(r => r.resolvedBranch !== 'Unassigned');
    const names = [...new Set(assigned.map(r => r.resolvedBranch))];
    return names.map((branch, bi) => {
      const br = assigned.filter(r => r.resolvedBranch === branch);
      return {
        branch, count: br.length,
        total: br.reduce((s, r) => s + r.total, 0),
        overdue: br.reduce((s, r) => s + r.overdue_total, 0),
        current: br.reduce((s, r) => s + r.current, 0),
        d1_60: br.reduce((s, r) => s + r.d1_30 + r.d31_60, 0),
        d61plus: br.reduce((s, r) => s + r.overdue_total, 0),
        color: BRANCH_COLORS[branch] ?? BRANCH_PAL[bi % BRANCH_PAL.length],
      };
    }).sort((a, b) => b.total - a.total);
  }, [rowsWithBranch]);

  const branchKpi = useMemo(() =>
    branchBuckets.map(b => ({
      ...b,
      notOverdue: b.total - b.overdue,
      cr: b.total > 0 ? +((b.total - b.overdue) / b.total * 100).toFixed(1) : 0,
      overdueRate: b.total > 0 ? +(b.overdue / b.total * 100).toFixed(1) : 0,
    })).sort((a, b) => b.total - a.total)
  , [branchBuckets]);

  const branchCustomerMap = useMemo(() => {
    const map = new Map<string, AgingRowWithBranch[]>();
    for (const r of rowsWithBranch) {
      if (r.total <= 0) continue;
      const list = map.get(r.resolvedBranch) ?? [];
      list.push(r);
      map.set(r.resolvedBranch, list);
    }
    map.forEach((list, key) => map.set(key, [...list].sort((a, b) => b.total - a.total)));
    return map;
  }, [rowsWithBranch]);

  const areaChartData = useMemo(() => {
    if (!branchMonthly.length) return [];
    return branchMonthly.slice(-12).map(row => {
      const point: any = { label: String(row.label || row.month || '').slice(0, 7) };
      for (const [rawKey, rawVal] of Object.entries(row)) {
        if (rawKey === 'label' || rawKey === 'month') continue;
        const englishKey = enBranch(rawKey as string);
        if (englishKey !== 'Unassigned') {
          point[englishKey] = (point[englishKey] ?? 0) + num(rawVal);
        }
      }
      return point;
    });
  }, [branchMonthly]);

  const areaChartBranches = useMemo(() => {
    const allKeys = new Set<string>();
    areaChartData.forEach(point => Object.keys(point).forEach(k => { if (k !== 'label') allKeys.add(k); }));
    return [...allKeys].sort();
  }, [areaChartData]);

  const allBranches = useMemo(() =>
    [...new Set([...branchNames.map(n => enBranch(n)), ...branchBuckets.map(b => b.branch)])]
  , [branchNames, branchBuckets]);

  // ── Print ────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printable = document.getElementById('aging-printable');
    if (!printable) { alert('No content to print.'); return; }
    const clone = printable.cloneNode(true) as HTMLElement;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    const replaceVars = (el: HTMLElement) => {
      if (el.style?.cssText) {
        el.style.cssText = el.style.cssText
          .replace(/hsl\(var\(--card\)\)/g, '#ffffff').replace(/hsl\(var\(--card-foreground\)\)/g, '#111827')
          .replace(/hsl\(var\(--border\)\)/g, '#e5e7eb').replace(/hsl\(var\(--muted\)\)/g, '#f3f4f6')
          .replace(/hsl\(var\(--muted-foreground\)\)/g, '#6b7280').replace(/hsl\(var\(--background\)\)/g, '#ffffff')
          .replace(/hsl\(var\(--foreground\)\)/g, '#111827');
      }
      Array.from(el.children).forEach(c => replaceVars(c as HTMLElement));
    };
    replaceVars(clone);

    const crClass = globalCR >= 70 ? 'ck-good' : 'ck-bad';
    const dsoClass = globalDSO <= 90 ? 'ck-good' : globalDSO <= 120 ? 'ck-warn' : 'ck-bad';
    const orClass = globalOR <= 20 ? 'ck-good' : globalOR <= 35 ? 'ck-warn' : 'ck-bad';
    const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Aging Receivables — ${activeDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:#fff;color:#111827;padding:16px 20px;font-size:12px;}
@page{size:A4 landscape;margin:8mm 10mm;}
.cover{width:100%;height:190mm;background:#fff;break-after:page!important;page-break-after:always!important;position:relative;overflow:hidden;}
.cover-bg{position:absolute;top:0;right:0;width:52%;height:100%;background:linear-gradient(148deg,#f5f3ff,#ede9fe,#ddd6fe,#c4b5fd);clip-path:polygon(15% 0,100% 0,100% 100%,0% 100%);z-index:0;}
.cover-stripe{position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#0ea5e9);z-index:3;}
.cover-inner{position:relative;z-index:4;display:grid;grid-template-rows:auto 1fr auto;height:100%;padding:28px 48px 26px;}
.cover-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #e5e7eb;}
.cover-main{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding:24px 0 20px;}
.cover-title{font-family:'Playfair Display',serif;font-size:56px;font-weight:900;color:#0f172a;line-height:1.0;}
.cover-title-accent{color:#6366f1;font-style:italic;}
.cover-kpi-card{background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.9);border-radius:14px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.ck-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.11em;color:#9ca3af;}
.ck-value{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1;}
.ck-note{font-size:10px;color:#9ca3af;}
.ck-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;}
.ck-good{color:#10b981;} .ck-warn{color:#f59e0b;} .ck-bad{color:#f43f5e;}
.badge-good{background:#d1fae5;color:#059669;} .badge-warn{background:#fef3c7;color:#d97706;} .badge-bad{background:#fee2e2;color:#dc2626;}
.cover-bottom{border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center;}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-shadow:none!important;}
div[data-print="section"],div[data-print="section-charts"]{break-before:page!important;page-break-before:always!important;}
div[style*="maxHeight"],div[style*="overflow"]{max-height:none!important;overflow:visible!important;}
button{display:none!important;}
</style></head><body>
<div class="cover">
  <div class="cover-stripe"></div><div class="cover-bg"></div>
  <div class="cover-inner">
    <div class="cover-top">
      <span style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#374151;">WEEG Financial</span>
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#6366f1;background:#eef2ff;border:1.5px solid #c7d2fe;padding:4px 13px;border-radius:20px;">Financial Report</span>
    </div>
    <div class="cover-main">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;color:#9ca3af;margin-bottom:14px;">Accounts Receivable Management</div>
        <h1 class="cover-title">Aging<br/><span class="cover-title-accent">Receivables</span></h1>
        <p style="font-size:15px;color:#6b7280;margin:12px 0 20px;">Detailed Analysis by Branch — ${activeDate}</p>
        <p style="font-size:12px;color:#9ca3af;line-height:1.85;border-left:3px solid #e0e7ff;padding-left:16px;">Comprehensive view of outstanding receivables across all branches, including overdue aging analysis, top debtor profiles, collection performance per branch, and monthly revenue trends.</p>
      </div>
      <div style="padding-left:20px;">
        <div class="cover-kpi-card">
          <div><div class="ck-label">Total Receivables</div><div class="ck-value">${formatCurrency(totals.total)}</div><div class="ck-note">${rows.length} customers · ${allBranches.length} branches</div></div>
          <span class="ck-badge" style="background:#ede9fe;color:#7c3aed;">Snapshot</span>
        </div>
        <div class="cover-kpi-card">
          <div><div class="ck-label">Collection Rate</div><div class="ck-value ${crClass}">${globalCR.toFixed(1)}%</div><div class="ck-note">Target &gt; 70%</div></div>
          <span class="ck-badge ${globalCR >= 70 ? 'badge-good' : 'badge-bad'}">${globalCR >= 70 ? '✓ On target' : '⚠ Below'}</span>
        </div>
        <div class="cover-kpi-card">
          <div><div class="ck-label">Average DSO</div><div class="ck-value ${dsoClass}">${globalDSO.toFixed(0)} days</div><div class="ck-note">Target &lt; 90 days</div></div>
          <span class="ck-badge ${globalDSO <= 90 ? 'badge-good' : globalDSO <= 120 ? 'badge-warn' : 'badge-bad'}">${globalDSO <= 90 ? '✓ Good' : globalDSO <= 120 ? '⚠ High' : '✗ Critical'}</span>
        </div>
        <div class="cover-kpi-card">
          <div><div class="ck-label">Overdue Rate</div><div class="ck-value ${orClass}">${globalOR.toFixed(1)}%</div><div class="ck-note">Target &lt; 20%</div></div>
          <span class="ck-badge ${globalOR <= 20 ? 'badge-good' : globalOR <= 35 ? 'badge-warn' : 'badge-bad'}">${globalOR <= 20 ? '✓ Good' : globalOR <= 35 ? '⚠ Alert' : '✗ Critical'}</span>
        </div>
      </div>
    </div>
    <div class="cover-bottom">
      <div style="display:flex;align-items:center;gap:12px;font-size:10px;color:#9ca3af;">
        <span>Generated on ${genDate}</span>
        <span style="width:3px;height:3px;border-radius:50%;background:#d1d5db;display:inline-block;"></span>
        <span>Snapshot: ${activeDate}</span>
        <span style="width:3px;height:3px;border-radius:50%;background:#d1d5db;display:inline-block;"></span>
        <span>${allBranches.length} branches · ${rows.length} customers</span>
      </div>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#c4b5fd;border:1.5px solid #e0e7ff;padding:3px 10px;border-radius:20px;background:#faf5ff;">Confidential</span>
    </div>
  </div>
</div>
${clone.outerHTML}
</body></html>`);
    doc.close();
    iframe.style.visibility = 'visible'; iframe.style.zIndex = '9999';
    const cleanup = () => { iframe.style.visibility = 'hidden'; setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500); };
    const triggerPrint = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.print(); } };
    iframe.onload = () => { setTimeout(triggerPrint, 800); };
    setTimeout(triggerPrint, 1800);
    if (iframe.contentWindow) { iframe.contentWindow.onafterprint = cleanup; setTimeout(cleanup, 90000); }
  };

  if ((loadRows || loadKpi) && rows.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, minHeight: 400, justifyContent: 'center' }}>
      <Spin /><p style={{ fontSize: 14, color: css.mutedFg }}>Loading aging data…</p>
    </div>
  );
  if (error) return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, color: C.rose }}>
      <AlertCircle size={18} /><span style={{ flex: 1, fontSize: 13 }}>{error}</span>
      <button onClick={() => { fetchRows(activeDate); fetchKpi(activeDate); }}
        style={{ fontSize: 12, padding: '7px 16px', borderRadius: 9, border: `1px solid ${css.border}`, background: css.card, cursor: 'pointer', color: css.cardFg }}>Retry</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ══ HEADER ══ */}
      <div style={{ ...card, background: `linear-gradient(135deg,${C.indigo}08,${C.violet}05)`, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.indigo}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={24} style={{ color: C.indigo }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: css.fg, margin: 0, letterSpacing: '-0.03em' }}>Aging Receivables Report — By Branch</h1>
              <p style={{ fontSize: 12, color: css.mutedFg, margin: '3px 0 0' }}>
                Snapshot: <strong>{activeDate}</strong> · {rows.length} customers · {branchBuckets.length} branches
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { fetchRows(activeDate); fetchKpi(activeDate); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} />Refresh
            </button>
            <button onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.indigo}40`, background: `${C.indigo}10`, color: C.indigo, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={13} />Print
            </button>
          </div>
        </div>
        {dates.length > 1 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${css.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: css.mutedFg, marginBottom: 8 }}>Snapshots ({dates.length})</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dates.map(d => (
                <span key={d} onClick={() => setActiveDate(d)} style={{
                  fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                  background: d === activeDate ? C.indigo : `${C.indigo}10`,
                  color: d === activeDate ? '#fff' : C.indigo,
                  fontWeight: d === activeDate ? 700 : 500,
                  border: `1px solid ${d === activeDate ? C.indigo : `${C.indigo}25`}`,
                }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div id="aging-printable">

        {/* ══ KPIs ══ */}
        <div data-print="page1-block">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }}>
            <KCard label="Total Receivables" value={formatCurrency(totals.total)} sub={`${rows.length} customers · ${activeDate}`} accent={C.indigo} Icon={TrendingUp} target="Track trend" />
            <KCard label="Overdue > 60d" value={formatCurrency(totals.overdue)} sub={`${pct(totals.overdue, totals.total)}% of total`} accent={C.rose} Icon={AlertTriangle} target="< 20% of total" />
            <KCard label="Collection Rate" value={`${globalCR.toFixed(1)}%`} sub={globalCR >= 70 ? '✓ Above target' : '⚠ Below target'} accent={C.emerald} Icon={Target} target="> 70%" />
            <KCard label="Average DSO" value={`${globalDSO.toFixed(0)} days`} sub={globalDSO <= 90 ? '✓ Within target' : '⚠ Exceeds target'} accent={C.amber} Icon={Clock} target="< 90 days" />
          </div>

          <SecHead n={1} title="Receivables by Branch" sub="Total vs. overdue · monthly revenue trend per branch" color={C.indigo} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Receivables by Branch bar */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Receivables by Branch — {activeDate}</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Total vs. overdue per branch</p>
              {loadRows || branchBuckets.length === 0 ? <Empty h={260} /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={branchBuckets} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false} />
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="branch" width={115} tick={{ fontSize: 10, fill: css.mutedFg }} axisLine={false} tickLine={false} />
                    <RTooltip content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />
                    <Bar dataKey="total" name="Total" radius={[0, 5, 5, 0]}>
                      {branchBuckets.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.85} />)}
                    </Bar>
                    <Bar dataKey="overdue" name="Overdue >60d" fill={C.rose} fillOpacity={0.55} radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Area Chart */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Monthly Credit Revenue by Branch</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Area chart · trend and seasonality per branch · 12 months</p>
              {loadBranch ? <Empty h={260} text="Loading…" /> :
                areaChartData.length === 0 ? <Empty h={260} text="No monthly data available" /> :
                  areaChartBranches.length === 0 ? <Empty h={260} text="Branch data not mapped — check API branch names" /> : (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={areaChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <defs>
                          {areaChartBranches.map(branch => (
                            <linearGradient key={branch} id={`ag-${branch.replace(/[\s()]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={BRANCH_COLORS[branch] ?? C.indigo} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={BRANCH_COLORS[branch] ?? C.indigo} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                        <XAxis dataKey="label" tick={ax} axisLine={false} tickLine={false} />
                        <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <RTooltip content={<Tip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />
                        {areaChartBranches.map(branch => (
                          <Area key={branch} type="monotone" dataKey={branch} name={branch}
                            stroke={BRANCH_COLORS[branch] ?? C.indigo} strokeWidth={2}
                            fill={`url(#ag-${branch.replace(/[\s()]/g, '')})`} dot={false} activeDot={{ r: 4 }} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
            </div>
          </div>
        </div>

        {/* ══ SECTION 1 sub-charts ══ */}
        <div data-print="section-charts" style={{ marginBottom: 52 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Aging by Branch with print table */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Aging by Branch — {activeDate}</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Current · 1-60d · Overdue (&gt;60d) stacked per branch</p>
              {loadRows || branchBuckets.length === 0 ? <Empty h={240} /> : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={branchBuckets} margin={{ top: 4, right: 8, left: 0, bottom: 20 }} barCategoryGap="18%">
                      <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                      <XAxis dataKey="branch" tick={ax} axisLine={false} tickLine={false} angle={-18} textAnchor="end" height={44} />
                      <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <RTooltip content={<Tip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={7} />
                      <Bar dataKey="current" name="Current" fill={C.emerald} fillOpacity={0.85} stackId="s">
                        <LabelList dataKey="current" position="inside" style={{ fontSize: 9, fill: '#fff', fontWeight: 700 }} formatter={(v: number) => v > 8000 ? `${(v / 1000).toFixed(0)}k` : ''} />
                      </Bar>
                      <Bar dataKey="d1_60" name="1-60d" fill={C.amber} fillOpacity={0.85} stackId="s">
                        <LabelList dataKey="d1_60" position="inside" style={{ fontSize: 9, fill: '#fff', fontWeight: 700 }} formatter={(v: number) => v > 8000 ? `${(v / 1000).toFixed(0)}k` : ''} />
                      </Bar>
                      <Bar dataKey="d61plus" name="Overdue >60d" fill={C.rose} fillOpacity={0.85} stackId="s" radius={[5, 5, 0, 0]}>
                        <LabelList dataKey="d61plus" position="inside" style={{ fontSize: 9, fill: '#fff', fontWeight: 700 }} formatter={(v: number) => v > 8000 ? `${(v / 1000).toFixed(0)}k` : ''} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <AgingDetailPrintTable branchBuckets={branchBuckets} grandTotal={totals.total} />
                </>
              )}
            </div>

            {/* ── FIX: Global bucket breakdown — cap >330d outlier ── */}
            <div style={{ ...card, alignSelf: 'start' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Aging Period Breakdown — {activeDate}</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Global receivables by age bucket · green = healthy · red = critical</p>
              {loadRows ? <Empty h={300} /> : (() => {
                // Cap the last bucket (>330d) so it doesn't crush all other bars visually
                const maxNonLast = Math.max(...buckets.slice(0, -1).map(b => b.amount), 1);
                const CAP = maxNonLast * 1.65;
                const displayBuckets = buckets.map(b => ({
                  ...b,
                  display: Math.min(b.amount, CAP),
                  capped: b.amount > CAP,
                  realAmount: b.amount,
                }));
                const hasCapped = displayBuckets.some(b => b.capped);
                return (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={displayBuckets} margin={{ left: 0, right: 0, top: 16, bottom: 44 }} barCategoryGap="14%">
                        <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                        <XAxis dataKey="label" tick={ax} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={58} />
                        <YAxis
                          tick={ax} axisLine={false} tickLine={false}
                          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                          domain={[0, CAP * 1.05]}
                        />
                        <RTooltip content={(p: any) => {
                          if (!p.active || !p.payload?.length) return null;
                          const orig = displayBuckets.find(b => b.label === p.label);
                          return (
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
                              <p style={{ fontWeight: 700, color: '#111', marginBottom: 4 }}>{p.label}</p>
                              <p style={{ color: '#6b7280' }}>
                                Amount: <strong style={{ color: '#111' }}>{formatCurrency(orig?.realAmount ?? 0)}</strong>
                              </p>
                              {orig?.capped && (
                                <p style={{ fontSize: 10, color: C.amber, marginTop: 4 }}>⚠ Bar capped for scale</p>
                              )}
                            </div>
                          );
                        }} />
                        <Bar dataKey="display" name="Amount" radius={[5, 5, 0, 0]}>
                          {displayBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                          <LabelList
                            dataKey="capped"
                            position="top"
                            content={(props: any) => {
                              const b = displayBuckets[props.index];
                              if (!b?.capped) return null;
                              const x = (props.x ?? 0) + (props.width ?? 0) / 2;
                              const y = (props.y ?? 0) - 6;
                              return (
                                <g>
                                  <text x={x} y={y} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.amber}>
                                    ↑ {(b.realAmount / 1000).toFixed(0)}k
                                  </text>
                                  {/* Dashed cap line */}
                                  <line
                                    x1={props.x} x2={(props.x ?? 0) + (props.width ?? 0)}
                                    y1={props.y} y2={props.y}
                                    stroke={C.amber} strokeWidth={1.5} strokeDasharray="3 2"
                                  />
                                </g>
                              );
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ════ SECTION 2 — TOP DEBTORS ════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={2} title="Top Debtors by Branch"
            sub="Customers with the highest outstanding balances — branch resolved server-side from sales data"
            color={C.rose} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Top 15 Debtors — All Branches</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 12 }}>Bar color = risk · branch from API (حركة المادة join) · amounts in LYD</p>
              {topDebtors.length === 0 ? <Empty h={340} /> : (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={topDebtors} layout="vertical" margin={{ left: 0, right: 80, top: 4, bottom: 4 }} barCategoryGap="14%">
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false} />
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nameWithBranch" width={210} tick={{ fontSize: 10, fill: css.mutedFg }} axisLine={false} tickLine={false} />
                    <RTooltip content={(p: any) => {
                      if (!p.active || !p.payload?.length) return null;
                      const tot = p.payload.find((x: any) => x.dataKey === 'total')?.value ?? 0;
                      const ov = p.payload.find((x: any) => x.dataKey === 'overdue')?.value ?? 0;
                      const d = topDebtors.find(x => x.nameWithBranch === p.label);
                      return (
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', boxShadow: '0 10px 30px rgba(0,0,0,.15)', fontSize: 12, minWidth: 240 }}>
                          <p style={{ fontWeight: 700, color: '#111', marginBottom: 4 }}>{d?.name ?? p.label}</p>
                          <p style={{ color: '#6b7280', marginBottom: 10, fontSize: 11 }}>Branch: <strong style={{ color: C.indigo }}>{d?.branch ?? '—'}</strong></p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ color: '#6b7280' }}>Total</span><strong>{formatCurrency(tot)}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#6b7280' }}>Overdue&gt;60d</span><strong style={{ color: C.rose }}>{formatCurrency(ov)}</strong></div>
                          <div style={{ height: 5, borderRadius: 999, background: '#f3f4f6' }}><div style={{ height: '100%', borderRadius: 999, width: `${pct(ov, tot)}%`, background: C.rose }} /></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{pct(ov, tot)}% overdue</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 12, background: `${RISK_CFG[d?.risk ?? 'low'].color}18`, color: RISK_CFG[d?.risk ?? 'low'].color }}>{RISK_CFG[d?.risk ?? 'low'].label}</span>
                          </div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="total" name="total" radius={[0, 5, 5, 0]}>
                      {topDebtors.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                      <LabelList dataKey="branch" position="right"
                        style={{ fontSize: 9, fill: css.mutedFg, fontWeight: 600 }}
                        formatter={(v: string) => v === 'Unassigned' ? '' : v} />
                    </Bar>
                    <Bar dataKey="overdue" name="Overdue >60d" fill={C.rose} fillOpacity={0.4} radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Detailed table with branch always shown */}
              {topDebtors.length > 0 && (
                <div style={{ marginTop: 16, borderTop: `1px solid ${css.border}`, paddingTop: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: css.mutedFg, marginBottom: 10 }}>Top Debtors — Detailed Table</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: css.muted }}>
                          {['#', 'Customer', 'Branch', 'Account Code', 'Total LYD', 'Overdue >60d', 'Overdue %', 'Risk'].map(h => (
                            <th key={h} style={{ padding: '7px 10px', textAlign: ['#', 'Customer', 'Branch', 'Account Code'].includes(h) ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: css.mutedFg, borderBottom: `2px solid ${css.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...rowsWithBranch].sort((a, b) => b.total - a.total).slice(0, 15).map((r, i) => {
                          const ovPct = r.total > 0 ? (r.overdue_total / r.total * 100) : 0;
                          const risk = r.risk_score ?? 'low';
                          const rc = RISK_CFG[risk]?.color ?? C.indigo;
                          const bc = BRANCH_COLORS[r.resolvedBranch] ?? C.indigo;
                          const acctCode = (r.account_code ?? r.account ?? '').match(/^\d+/)?.[0] ?? '—';
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : css.muted + '40' }}>
                              <td style={{ padding: '7px 10px', color: css.mutedFg, fontWeight: 700 }}>{i + 1}</td>
                              <td style={{ padding: '7px 10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 700, color: css.cardFg }}>{shortName(r, 26)}</span>
                              </td>
                              <td style={{ padding: '7px 10px' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: `${bc}18`, color: bc, whiteSpace: 'nowrap' }}>{r.resolvedBranch}</span>
                              </td>
                              <td style={{ padding: '7px 10px', fontSize: 10, color: css.mutedFg, fontFamily: 'monospace' }}>{acctCode}</td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: css.cardFg }}>{formatCurrency(r.total)}</td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', color: r.overdue_total > 0 ? C.rose : css.mutedFg, fontWeight: r.overdue_total > 0 ? 700 : 400 }}>
                                {r.overdue_total > 0 ? formatCurrency(r.overdue_total) : '—'}
                              </td>
                              <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                                <span style={{ fontWeight: 700, color: ovPct <= 20 ? C.emerald : ovPct <= 35 ? C.amber : C.rose }}>{ovPct.toFixed(1)}%</span>
                              </td>
                              <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 12, background: `${rc}18`, color: rc }}>{RISK_CFG[risk]?.label ?? risk}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── Risk Distribution — alignSelf:start prevents stretching to match tall left column ── */}
            <div style={{ ...card, alignSelf: 'start' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Risk Distribution</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 16 }}>{rows.length} customers total</p>
              {(() => {
                const counts = Object.entries(RISK_CFG).map(([k, cfg]) => ({
                  name: cfg.label, key: k,
                  value: rows.filter(r => (r.risk_score ?? 'low') === k).length,
                  amount: rows.filter(r => (r.risk_score ?? 'low') === k).reduce((s, r) => s + r.total, 0),
                  color: cfg.color,
                }));
                const active = counts.filter(c => c.value > 0);
                return (
                  <>
                    {/* Pie + total centered — fixed PieChart avoids ResponsiveContainer width=0 bug */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, position: 'relative', height: 160 }}>
                      <PieChart width={160} height={160}>
                        <Pie
                          data={active.length ? active : [{ name: 'none', value: 1, color: '#e5e7eb' }]}
                          dataKey="value"
                          cx={80} cy={80}
                          innerRadius={46} outerRadius={72}
                          paddingAngle={active.length > 1 ? 3 : 0}
                          strokeWidth={0}
                        >
                          {(active.length ? active : [{ color: '#e5e7eb' }]).map((e: any, i: number) => (
                            <Cell key={i} fill={e.color} />
                          ))}
                        </Pie>
                        <RTooltip
                          formatter={(v: number, _name: string, p: any) => {
                            if (p.name === 'none') return null;
                            const entry = counts.find(c => c.name === p.name);
                            return [`${v} customers · ${formatCurrency(entry?.amount ?? 0)}`, p.name];
                          }}
                          contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                        />
                      </PieChart>
                      {/* Centre label */}
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: css.cardFg, lineHeight: 1 }}>{rows.length}</div>
                        <div style={{ fontSize: 9, color: css.mutedFg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>clients</div>
                      </div>
                    </div>

                    {/* Legend rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {counts.map(c => (
                        <div key={c.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: css.mutedFg, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                              <span style={{ fontWeight: c.value > 0 ? 600 : 400, color: c.value > 0 ? css.cardFg : css.mutedFg }}>{c.name}</span>
                            </span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: css.mutedFg }}>{c.value > 0 ? formatCurrency(c.amount) : '—'}</span>
                              <span style={{
                                fontSize: 12, fontWeight: 700, minWidth: 28, textAlign: 'center',
                                padding: '2px 8px', borderRadius: 20,
                                background: c.value > 0 ? `${c.color}18` : css.muted,
                                color: c.value > 0 ? c.color : css.mutedFg,
                              }}>{c.value}</span>
                            </div>
                          </div>
                          <div style={{ height: 4, borderRadius: 999, background: css.muted }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${pct(c.value, rows.length)}%`, background: `linear-gradient(90deg,${c.color}60,${c.color})`, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary bar at bottom */}
                    <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, background: `${C.indigo}06`, border: `1px solid ${css.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: css.mutedFg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Exposure</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: C.indigo }}>{formatCurrency(totals.total)}</span>
                      </div>
                      {/* Stacked mini bar */}
                      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', gap: 1 }}>
                        {counts.filter(c => c.value > 0).map(c => (
                          <div
                            key={c.name}
                            title={`${c.name}: ${pct(c.amount, totals.total)}%`}
                            style={{
                              width: `${pct(c.amount, totals.total)}%`,
                              background: c.color,
                              minWidth: c.amount > 0 ? 4 : 0,
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 7 }}>
                        {counts.filter(c => c.value > 0).map(c => (
                          <span key={c.name} style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>
                            {c.name}: {pct(c.amount, totals.total)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {branchBuckets.length > 1 && (
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Risk Exposure by Branch — {activeDate}</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Current · 1-60d · Overdue &gt;60d — stacked per branch</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={branchBuckets} margin={{ top: 4, right: 16, left: 0, bottom: 20 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                  <XAxis dataKey="branch" tick={{ fontSize: 11, fill: css.mutedFg }} axisLine={false} tickLine={false} angle={-12} textAnchor="end" height={44} />
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <RTooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingBottom: 4 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="current" name="Current (not yet due)" fill={C.emerald} fillOpacity={0.8} stackId="a" label={{ position: 'inside', fill: '#fff', fontSize: 9, formatter: (v: number) => v > 10000 ? `${(v / 1000).toFixed(0)}k` : '' }} />
                  <Bar dataKey="d1_60" name="1-60d (slightly overdue)" fill={C.amber} fillOpacity={0.8} stackId="a" label={{ position: 'inside', fill: '#fff', fontSize: 9, formatter: (v: number) => v > 10000 ? `${(v / 1000).toFixed(0)}k` : '' }} />
                  <Bar dataKey="d61plus" name="Overdue >60d (critical)" fill={C.rose} fillOpacity={0.85} stackId="a" radius={[5, 5, 0, 0]} label={{ position: 'inside', fill: '#fff', fontSize: 9, formatter: (v: number) => v > 10000 ? `${(v / 1000).toFixed(0)}k` : '' }} />
                </BarChart>
              </ResponsiveContainer>

              {/* Branch summary table */}
              <div style={{ marginTop: 20, borderTop: `1px solid ${css.border}`, paddingTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: css.mutedFg, marginBottom: 10 }}>Branch Summary Table — for printing</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: css.muted }}>
                      {['Branch', 'Customers', 'Total LYD', 'Current', '1-60d', 'Overdue >60d', 'Overdue %', 'CR%'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: ['Branch', 'Customers'].includes(h) ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: css.mutedFg, borderBottom: `2px solid ${css.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branchKpi.map((b, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${css.border}`, background: i % 2 === 0 ? 'transparent' : css.muted + '40' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                            <strong style={{ fontSize: 12, color: css.cardFg }}>{b.branch}</strong>
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: css.mutedFg }}>{b.count}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(b.total)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: C.emerald, fontWeight: 600 }}>{formatCurrency(b.current)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: C.amber, fontWeight: 600 }}>{formatCurrency(b.d1_60)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: b.overdue > 0 ? C.rose : css.mutedFg, fontWeight: b.overdue > 0 ? 700 : 400 }}>{formatCurrency(b.overdue)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: b.overdueRate <= 20 ? C.emerald : b.overdueRate <= 35 ? C.amber : C.rose }}>{b.overdueRate.toFixed(1)}%</span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, padding: '2px 10px', borderRadius: 20, background: b.cr >= 70 ? `${C.emerald}15` : `${C.rose}15`, color: b.cr >= 70 ? C.emerald : C.rose, border: `1px solid ${b.cr >= 70 ? C.emerald : C.rose}30` }}>{b.cr.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${css.border}`, background: `${C.indigo}06` }}>
                      <td style={{ padding: '10px 12px' }}><strong>TOTAL</strong></td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{branchKpi.reduce((s, b) => s + b.count, 0)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: C.indigo }}>{formatCurrency(branchKpi.reduce((s, b) => s + b.total, 0))}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.emerald }}>{formatCurrency(branchKpi.reduce((s, b) => s + b.current, 0))}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.amber }}>{formatCurrency(branchKpi.reduce((s, b) => s + b.d1_60, 0))}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.rose }}>{formatCurrency(branchKpi.reduce((s, b) => s + b.overdue, 0))}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{pct(branchKpi.reduce((s, b) => s + b.overdue, 0), branchKpi.reduce((s, b) => s + b.total, 0))}%</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: globalCR >= 70 ? C.emerald : C.rose }}>{globalCR.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ════ SECTION 3 — COLLECTION RATE ════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={3} title="Collection Rate by Branch"
            sub="Outstanding per branch · customer breakdown · global KPIs"
            color={C.emerald} />

          <div style={{ marginBottom: 16 }}>
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Outstanding by Branch — {activeDate}</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Green = on-track · Red = overdue &gt;60d</p>
              {loadRows || branchKpi.length === 0 ? <Empty text={loadRows ? 'Loading…' : 'No branch data'} h={200} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {branchKpi.map(b => {
                    const maxTotal = Math.max(...branchKpi.map(x => x.total), 1);
                    const barW = (b.total / maxTotal) * 100;
                    const notOvPct = b.total > 0 ? (b.notOverdue / b.total) * 100 : 0;
                    const ovPct = b.total > 0 ? (b.overdue / b.total) * 100 : 0;
                    const customers = branchCustomerMap.get(b.branch) ?? [];
                    return (
                      <div key={b.branch} style={{ borderTop: `1px solid ${css.border}`, paddingTop: 18, marginTop: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 15, fontWeight: 800, color: css.cardFg }}>{b.branch}</span>
                            <span style={{ fontSize: 10, color: css.mutedFg, padding: '1px 8px', borderRadius: 12, background: css.muted }}>{b.count} customers</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 13, color: css.mutedFg }}>{formatCurrency(b.total)}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, padding: '3px 12px', borderRadius: 20, background: b.cr >= 70 ? `${C.emerald}15` : `${C.rose}15`, color: b.cr >= 70 ? C.emerald : C.rose, border: `1px solid ${b.cr >= 70 ? C.emerald : C.rose}35` }}>CR: {b.cr.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div style={{ height: 14, borderRadius: 999, background: css.muted, overflow: 'hidden', position: 'relative', marginBottom: 6 }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: `${barW}%`, height: '100%', display: 'flex', overflow: 'hidden', borderRadius: 999 }}>
                            <div style={{ width: `${notOvPct}%`, height: '100%', background: `linear-gradient(90deg,${C.emerald}80,${C.emerald})` }} />
                            <div style={{ width: `${ovPct}%`, height: '100%', background: `linear-gradient(90deg,${C.amber}70,${C.rose})` }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                          <span style={{ fontSize: 11, color: C.emerald }}>On-track: {formatCurrency(b.notOverdue)} ({notOvPct.toFixed(0)}%)</span>
                          {b.overdue > 0 && <span style={{ fontSize: 11, color: C.rose }}>Overdue: {formatCurrency(b.overdue)} ({ovPct.toFixed(0)}%)</span>}
                        </div>
                        {customers.length > 0 && <CustomerTable customers={customers} showOverdue maxRows={5} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Collected vs. Still Outstanding — Global</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 18 }}>Breakdown of total credit revenue into collected and remaining balance</p>
              {loadKpi ? <Empty h={220} /> : (() => {
                const bars = [
                  { label: 'Collected', amount: collected, color: C.emerald, note: 'Already paid' },
                  { label: 'Outstanding', amount: totals.total, color: C.rose, note: 'Remaining balance' },
                ];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {bars.map(b => { const p2 = caTotal > 0 ? (b.amount / caTotal) * 100 : 0; return (
                      <div key={b.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: css.cardFg }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color }} />{b.label}
                            <span style={{ fontSize: 11, color: css.mutedFg, fontWeight: 400 }}>{b.note}</span>
                          </span>
                          <div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: b.color }}>{formatCurrency(b.amount)}</span>
                            <span style={{ fontSize: 11, color: css.mutedFg, marginLeft: 8 }}>{p2.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div style={{ height: 14, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(100, p2)}%`, background: `linear-gradient(90deg,${b.color}70,${b.color})` }} />
                        </div>
                      </div>
                    ); })}
                    <div style={{ padding: '14px 18px', borderRadius: 12, background: `${C.indigo}06`, border: `1px solid ${css.border}` }}>
                      {[
                        { l: 'Total credit revenue', v: formatCurrency(caTotal), c: css.cardFg },
                        { l: '− Remaining receivables', v: `−${formatCurrency(totals.total)}`, c: C.rose },
                        { l: '= Amount collected', v: formatCurrency(collected), c: C.emerald },
                      ].map(r => (
                        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: css.mutedFg }}>{r.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: r.c }}>{r.v}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: `1px dashed ${css.border}`, paddingTop: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: css.cardFg }}>Collection Rate</span>
                        <span style={{ fontSize: 26, fontWeight: 900, color: globalCR >= 70 ? C.emerald : C.rose }}>{globalCR.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 18px' }}>Global KPIs vs. Targets</h3>
              {loadKpi ? <Empty h={220} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[
                    { label: 'Collection Rate', value: `${globalCR.toFixed(1)}%`, bar: Math.min(100, globalCR), threshold: '> 70%', good: globalCR >= 70, accent: C.emerald },
                    { label: 'Overdue Rate', value: `${globalOR.toFixed(1)}%`, bar: Math.min(100, globalOR), threshold: '< 20%', good: globalOR <= 20, accent: C.rose },
                    { label: 'DSO', value: `${globalDSO.toFixed(0)}d`, bar: Math.min(100, (globalDSO / 180) * 100), threshold: '< 90 days', good: globalDSO <= 90, accent: C.amber },
                  ].map(k => (
                    <div key={k.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                        <span style={{ fontSize: 12, color: css.mutedFg, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: k.accent }} />{k.label}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: k.accent }}>{k.value}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: k.good ? `${C.emerald}18` : `${C.rose}18`, color: k.good ? C.emerald : C.rose }}>{k.good ? '✓ Good' : '⚠ Alert'}</span>
                        </div>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${k.bar}%`, background: `linear-gradient(90deg,${k.accent}60,${k.accent})` }} />
                      </div>
                      <p style={{ fontSize: 10, color: css.mutedFg, marginTop: 3 }}>Target: {k.threshold}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════
export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>Generate comprehensive analytical reports</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {REPORT_TYPES.map(r => (
          <div key={r.id} style={{ ...card, transition: 'box-shadow .15s,border-color .15s', borderColor: activeReport === r.id ? C.indigo : css.border, boxShadow: activeReport === r.id ? `0 0 0 2px ${C.indigo}30,0 4px 20px rgba(0,0,0,.06)` : card.boxShadow as string }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28, lineHeight: '1' }}>{r.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>{r.title}</h3>
                  {r.live && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: `${C.emerald}18`, color: C.emerald, border: `1px solid ${C.emerald}30` }}>Live</span>}
                </div>
                <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 4, lineHeight: 1.5 }}>{r.desc}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => r.live && setActiveReport(activeReport === r.id ? null : r.id)} disabled={!r.live}
                style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9, border: 'none', cursor: r.live ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, background: r.live ? (activeReport === r.id ? C.indigo : `${C.indigo}15`) : css.muted, color: r.live ? (activeReport === r.id ? '#fff' : C.indigo) : css.mutedFg, opacity: r.live ? 1 : 0.6 }}>
                <FileText size={13} />{r.live ? (activeReport === r.id ? 'Close' : 'Generate') : 'Coming soon'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {activeReport === 'aging' && <AgingReport />}
      {activeReport === 'general' && <GeneralReport />}
      {activeReport === 'supply' && <SupplyPolicyPage />}
      {activeReport === 'profitability' && <PricingProfitabilityReport />}
      {activeReport === 'turnover' && <InventoryTurnoverReport />}
      {!activeReport && (
        <div style={{ ...card, background: `${css.muted}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 56, borderStyle: 'dashed' }}>
          <BarChart3 size={44} style={{ color: css.mutedFg, opacity: .3 }} />
          <p style={{ fontSize: 14, color: css.mutedFg, margin: 0 }}>Select a report above and click <strong>Generate</strong></p>
          <p style={{ fontSize: 12, color: css.mutedFg, margin: 0, opacity: .7 }}>General Report, Aging Receivables, Pricing & Profitability available · more reports coming soon</p>
        </div>
      )}
    </div>
  );
}