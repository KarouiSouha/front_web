// src/app/pages/AgingReport.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  RefreshCw, Loader2, AlertCircle, TrendingUp, AlertTriangle,
  Clock, Target, BarChart3, Printer, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie, LabelList,
  ComposedChart, Line,
} from 'recharts';
import { formatCurrency } from '../lib/utils';

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  indigo: '#4f46e5', violet: '#7c3aed', teal: '#0d9488',
  emerald: '#059669', amber: '#d97706', rose: '#e11d48',
};

const BRANCH_PAL = ['#4f46e5','#0891b2','#0d9488','#059669','#d97706','#e11d48','#7c3aed','#ea580c','#0284c7','#db2777','#84cc16','#06b6d4'];

const RISK_CFG: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: '#059669', bg: '#d1fae5' },
  medium:   { label: 'Medium',   color: '#d97706', bg: '#fef3c7' },
  high:     { label: 'High',     color: '#ea580c', bg: '#ffedd5' },
  critical: { label: 'Critical', color: '#e11d48', bg: '#ffe4e6' },
};

const BUCKET_COLORS = [
  '#059669','#34d399','#fbbf24','#f59e0b','#f97316',
  '#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#6b21a8','#581c87','#3b0764',
];

const css = {
  card: 'hsl(var(--card))', cardFg: 'hsl(var(--card-foreground))',
  border: 'hsl(var(--border))', muted: 'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--background))',
  fg: 'hsl(var(--foreground))',
};

const card: React.CSSProperties = {
  background: css.card, borderRadius: 12, padding: 24,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
  border: `1px solid ${css.border}`,
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
};
const ax = { fontSize: 11, fill: '#94a3b8' };

// ─── Types ────────────────────────────────────────────────────────
interface AgingRow {
  id: string; account: string; account_code?: string;
  customer_name?: string | null; branch?: string | null;
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
  ...r, current: num(r.current), d1_30: num(r.d1_30), d31_60: num(r.d31_60),
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

// ─── Branch resolution — reads from backend, no hardcoding ────────
function resolveRowBranch(row: AgingRow): string {
  return row.branch?.trim() || 'Unassigned';
}

// ═══════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════
function Spin() { return <Loader2 size={18} className="animate-spin" style={{ color: C.indigo }} />; }
function Empty({ text = 'No data', h = 180 }: { text?: string; h?: number }) {
  return (
    <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, flexDirection: 'column', gap: 8 }}>
      <BarChart3 size={20} style={{ opacity: .2 }} />{text}
    </div>
  );
}

function Tip({ active, payload, label, isCurrency = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 16px', boxShadow: '0 20px 40px rgba(0,0,0,.4)', fontSize: 12, minWidth: 190 }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 10 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill ?? p.color, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', flex: 1, fontSize: 11 }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 12 }}>
            {isCurrency && typeof p.value === 'number' ? formatCurrency(p.value) : typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function KCard({ label, value, sub, accent, Icon, target }: { label: string; value: string; sub: string; accent: string; Icon: any; target?: string }) {
  return (
    <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}60)`, borderRadius: '12px 12px 0 0' }} />
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: accent, opacity: .06, filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color: accent, margin: '4px 0 0', letterSpacing: '-0.04em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>{sub}</p>
      {target && <p style={{ fontSize: 10, marginTop: 6, color: '#94a3b8' }}>Target: <span style={{ color: accent, fontWeight: 600 }}>{target}</span></p>}
    </div>
  );
}

function PartieHeader({ letter, label, color }: { letter: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, paddingBottom: 14, borderBottom: `2px solid ${color}18` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: color }} />
        <div style={{ width: 4, height: 20, borderRadius: 2, background: `${color}40`, marginLeft: 3 }} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color, margin: 0 }}>Part {letter}</p>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: css.fg, margin: 0, letterSpacing: '-0.025em' }}>{label}</h2>
      </div>
    </div>
  );
}

function CustomerTable({ customers, showOverdue = true, maxRows = 999 }: { customers: AgingRowWithBranch[]; showOverdue?: boolean; maxRows?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? customers : customers.slice(0, maxRows);
  const hasMore = customers.length > maxRows;
  const th: React.CSSProperties = { padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${css.border}`, background: css.muted };
  const td = (x?: React.CSSProperties): React.CSSProperties => ({ padding: '7px 10px', fontSize: 11, borderBottom: `1px solid ${css.border}`, ...x });
  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${css.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Customer','Branch','Total',...(showOverdue ? ['On-track','Overdue >60d'] : []),'CR%','Risk'].map(h => (
                <th key={h} style={{ ...th, textAlign: ['Customer','Branch'].includes(h) ? 'left' : 'right' as any }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const cr = r.total > 0 ? ((r.total - r.overdue_total) / r.total * 100) : 0;
              const risk = r.risk_score ?? 'low';
              const rc = RISK_CFG[risk];
              // Dynamic color from branch index
              const branchColor = C.indigo;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${css.muted}50` }}>
                  <td style={{ ...td(), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600, color: css.cardFg }}>{shortName(r, 28)}</span>
                  </td>
                  <td style={td()}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${branchColor}14`, color: branchColor, whiteSpace: 'nowrap' }}>{r.resolvedBranch}</span>
                  </td>
                  <td style={td({ textAlign: 'right', fontWeight: 700 })}>{formatCurrency(r.total)}</td>
                  {showOverdue && <td style={td({ textAlign: 'right', color: C.emerald })}>{formatCurrency(r.total - r.overdue_total)}</td>}
                  {showOverdue && <td style={td({ textAlign: 'right', color: r.overdue_total > 0 ? C.rose : '#94a3b8', fontWeight: r.overdue_total > 0 ? 700 : 400 })}>{r.overdue_total > 0 ? formatCurrency(r.overdue_total) : '—'}</td>}
                  <td style={td({ textAlign: 'right' })}><span style={{ fontWeight: 800, color: cr >= 70 ? C.emerald : C.rose }}>{cr.toFixed(1)}%</span></td>
                  <td style={td({ textAlign: 'center' })}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rc?.bg ?? '#f1f5f9', color: rc?.color ?? C.indigo }}>{rc?.label ?? risk}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.indigo, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 2px', fontWeight: 600 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Show less' : `Show all ${customers.length} customers`}
        </button>
      )}
    </div>
  );
}

function AgingDetailPrintTable({ branchBuckets, grandTotal }: { branchBuckets: any[]; grandTotal: number }) {
  if (!branchBuckets.length) return null;
  const th: React.CSSProperties = { padding: '9px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', borderBottom: `2px solid ${css.border}`, background: css.muted, textAlign: 'right', whiteSpace: 'nowrap' };
  const td = (x?: React.CSSProperties): React.CSSProperties => ({ padding: '9px 12px', fontSize: 11, borderBottom: `1px solid ${css.border}`, ...x });
  return (
    <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${css.border}` }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 12 }}>📋 Branch × Aging Bucket — Detailed Summary</p>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${css.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Branch</th>
              <th style={th}>Customers</th>
              <th style={th}>Total LYD</th>
              <th style={th}>Current</th>
              <th style={th}>1–60d</th>
              <th style={{ ...th, color: C.rose }}>Overdue &gt;60d</th>
              <th style={{ ...th, color: C.rose }}>Overdue %</th>
              <th style={{ ...th, color: C.emerald }}>CR %</th>
            </tr>
          </thead>
          <tbody>
            {branchBuckets.map((b: any, i: number) => {
              const cr = b.total > 0 ? ((b.total - b.overdue) / b.total * 100) : 0;
              const ovPct = b.total > 0 ? (b.overdue / b.total * 100) : 0;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${css.muted}50` }}>
                  <td style={td({ textAlign: 'left' })}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color }} />
                      <strong style={{ fontSize: 12, color: css.cardFg }}>{b.branch}</strong>
                    </div>
                  </td>
                  <td style={td({ textAlign: 'right', color: '#64748b' })}>{b.count}</td>
                  <td style={td({ textAlign: 'right', fontWeight: 800, color: C.indigo, fontVariantNumeric: 'tabular-nums' })}>{formatCurrency(b.total)}</td>
                  <td style={td({ textAlign: 'right' })}>
                    <span style={{ color: C.emerald, fontWeight: 600 }}>{formatCurrency(b.current)}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', display: 'block' }}>{b.total > 0 ? ((b.current / b.total) * 100).toFixed(1) : 0}%</span>
                  </td>
                  <td style={td({ textAlign: 'right' })}>
                    <span style={{ color: C.amber, fontWeight: 600 }}>{formatCurrency(b.d1_60)}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', display: 'block' }}>{b.total > 0 ? ((b.d1_60 / b.total) * 100).toFixed(1) : 0}%</span>
                  </td>
                  <td style={td({ textAlign: 'right' })}>
                    <span style={{ color: b.overdue > 0 ? C.rose : '#94a3b8', fontWeight: b.overdue > 0 ? 700 : 400 }}>{b.overdue > 0 ? formatCurrency(b.overdue) : '—'}</span>
                    {b.overdue > 0 && <span style={{ fontSize: 9, color: C.rose, display: 'block' }}>{ovPct.toFixed(1)}%</span>}
                  </td>
                  <td style={td({ textAlign: 'right' })}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ width: 44, height: 5, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, ovPct)}%`, height: '100%', background: ovPct <= 20 ? C.emerald : ovPct <= 35 ? C.amber : C.rose }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 11, color: ovPct <= 20 ? C.emerald : ovPct <= 35 ? C.amber : C.rose }}>{ovPct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={td({ textAlign: 'right' })}>
                    <span style={{ fontWeight: 800, fontSize: 12, padding: '3px 10px', borderRadius: 20, background: cr >= 70 ? '#d1fae5' : '#ffe4e6', color: cr >= 70 ? C.emerald : C.rose }}>{cr.toFixed(1)}%</span>
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: `2px solid ${css.border}`, background: `${C.indigo}05` }}>
              <td style={td({ textAlign: 'left' })}><strong style={{ fontSize: 13, color: C.indigo }}>TOTAL — All Branches</strong></td>
              <td style={td({ textAlign: 'right', fontWeight: 700 })}>{branchBuckets.reduce((s: number, b: any) => s + b.count, 0)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 900, color: C.indigo, fontSize: 14 })}>{formatCurrency(grandTotal)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700, color: C.emerald })}>{formatCurrency(branchBuckets.reduce((s: number, b: any) => s + b.current, 0))}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700, color: C.amber })}>{formatCurrency(branchBuckets.reduce((s: number, b: any) => s + b.d1_60, 0))}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700, color: C.rose })}>{formatCurrency(branchBuckets.reduce((s: number, b: any) => s + b.overdue, 0))}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700 })}>{pct(branchBuckets.reduce((s: number, b: any) => s + b.overdue, 0), grandTotal)}%</td>
              <td style={td({ textAlign: 'right', fontWeight: 800 })}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEW PRINT-READY BRANCH CHART — Carte gauche
// Barres horizontales annotées · zéro tooltip
// ═══════════════════════════════════════════════════════════════════
function BranchHBarChart({
  branchBuckets, loadRows,
}: { branchBuckets: any[]; loadRows: boolean }) {
  if (loadRows || branchBuckets.length === 0) return <Empty h={300} />;
  const maxVal = Math.max(...branchBuckets.map(b => b.total), 1);

  return (
    <div>
      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { color: C.emerald, label: 'On-track (current)' },
          { color: C.rose,    label: 'Overdue >60d' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
      </div>

      {branchBuckets.map((b, i) => {
        const totalPct    = (b.total / maxVal) * 100;
        const onTrackPct  = b.total > 0 ? ((b.total - b.overdue) / b.total) * 100 : 0;
        const overduePct  = b.total > 0 ? (b.overdue / b.total) * 100 : 0;
        const cr          = b.total > 0 ? ((b.total - b.overdue) / b.total * 100) : 0;

        return (
          <div key={b.branch} style={{
            display: 'grid', gridTemplateColumns: '130px 1fr',
            alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: i < branchBuckets.length - 1 ? `1px solid ${css.border}` : 'none',
          }}>
            {/* Label */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg, display: 'block', lineHeight: 1.2 }}>
                {b.branch}
              </span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{b.count} clients</span>
            </div>

            {/* Barre + annotations */}
            <div>
              {/* Barre de fond gris → remplie proportionnellement */}
              <div style={{
                position: 'relative', height: 22, borderRadius: 5,
                background: '#f1f5f9', overflow: 'hidden', marginBottom: 4,
              }}>
                {/* On-track */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${(onTrackPct / 100) * totalPct}%`,
                  background: `linear-gradient(90deg, ${C.emerald}70, ${C.emerald})`,
                  display: 'flex', alignItems: 'center', paddingLeft: 6,
                  overflow: 'hidden',
                }}>
                  {(onTrackPct / 100) * totalPct > 18 && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                      {formatCurrency(b.total - b.overdue)}
                    </span>
                  )}
                </div>
                {/* Overdue */}
                {b.overdue > 0 && (
                  <div style={{
                    position: 'absolute', left: `${(onTrackPct / 100) * totalPct}%`, top: 0, height: '100%',
                    width: `${(overduePct / 100) * totalPct}%`,
                    background: `linear-gradient(90deg, ${C.rose}70, ${C.rose})`,
                    display: 'flex', alignItems: 'center', paddingLeft: 4,
                    overflow: 'hidden',
                  }}>
                    {(overduePct / 100) * totalPct > 14 && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                        {formatCurrency(b.overdue)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Ligne de chiffres sous la barre */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: css.cardFg, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(b.total)}
                  </span>
                  <span style={{ fontSize: 10, color: C.emerald, fontWeight: 600 }}>
                    ✓ {onTrackPct.toFixed(0)}%
                  </span>
                  {b.overdue > 0 && (
                    <span style={{ fontSize: 10, color: C.rose, fontWeight: 600 }}>
                      ⚠ {overduePct.toFixed(0)}%
                    </span>
                  )}
                </div>
                {/* Badge CR% */}
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap',
                  background: cr >= 70 ? '#d1fae5' : '#ffe4e6',
                  color: cr >= 70 ? C.emerald : C.rose,
                  border: `1px solid ${cr >= 70 ? C.emerald : C.rose}30`,
                }}>
                  CR {cr.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: `2px solid ${css.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Total — All Branches
        </span>
        <span style={{ fontSize: 16, fontWeight: 900, color: C.indigo, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(branchBuckets.reduce((s, b) => s + b.total, 0))}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEW PRINT-READY BRANCH CHART — Carte droite
// Tableau visuel stacked · chaque ligne = 1 agence · tout annoté
// ═══════════════════════════════════════════════════════════════════
function BranchStackedVisual({
  branchBuckets, loadRows,
}: { branchBuckets: any[]; loadRows: boolean }) {
  if (loadRows || branchBuckets.length === 0) return <Empty h={300} />;
  const grandTotal = branchBuckets.reduce((s, b) => s + b.total, 0);

  return (
    <div>
      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { color: C.emerald, label: 'Current (not due)' },
          { color: C.amber,   label: '1–60 jours' },
          { color: C.rose,    label: 'Overdue >60d' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
      </div>

      {branchBuckets.map((b, i) => {
        const currPct  = b.total > 0 ? (b.current / b.total) * 100 : 0;
        const d60Pct   = b.total > 0 ? (b.d1_60   / b.total) * 100 : 0;
        const ovPct    = b.total > 0 ? (b.overdue  / b.total) * 100 : 0;
        const sharePct = grandTotal > 0 ? (b.total / grandTotal) * 100 : 0;
        const cr       = b.total > 0 ? ((b.total - b.overdue) / b.total * 100) : 0;

        return (
          <div key={b.branch} style={{
            padding: '11px 0',
            borderBottom: i < branchBuckets.length - 1 ? `1px solid ${css.border}` : 'none',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: css.cardFg }}>{b.branch}</span>
                <span style={{
                  fontSize: 10, color: '#94a3b8', padding: '1px 7px',
                  borderRadius: 12, background: css.muted,
                }}>
                  {sharePct.toFixed(1)}% du total · {b.count} clients
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: b.color, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(b.total)}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 20,
                  background: cr >= 70 ? '#d1fae5' : '#ffe4e6',
                  color: cr >= 70 ? C.emerald : C.rose,
                }}>
                  CR {cr.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Barre stacked */}
            <div style={{ height: 20, borderRadius: 5, overflow: 'hidden', display: 'flex', background: '#f1f5f9', marginBottom: 6 }}>
              {/* Current */}
              {currPct > 0 && (
                <div style={{
                  width: `${currPct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${C.emerald}80, ${C.emerald})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {currPct > 12 && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', padding: '0 3px' }}>
                      {formatCurrency(b.current)}
                    </span>
                  )}
                </div>
              )}
              {/* 1–60d */}
              {d60Pct > 0 && (
                <div style={{
                  width: `${d60Pct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${C.amber}80, ${C.amber})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {d60Pct > 12 && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', padding: '0 3px' }}>
                      {formatCurrency(b.d1_60)}
                    </span>
                  )}
                </div>
              )}
              {/* Overdue */}
              {ovPct > 0 && (
                <div style={{
                  width: `${ovPct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${C.rose}80, ${C.rose})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {ovPct > 12 && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', padding: '0 3px' }}>
                      {formatCurrency(b.overdue)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Annotations texte sous la barre */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[
                { val: b.current, pct: currPct, color: C.emerald, label: 'Current',  show: b.current > 0 },
                { val: b.d1_60,   pct: d60Pct,  color: C.amber,   label: '1–60d',    show: b.d1_60 > 0 },
                { val: b.overdue, pct: ovPct,   color: C.rose,    label: '>60d',     show: b.overdue > 0 },
              ].filter(x => x.show).map(x => (
                <span key={x.label} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: x.color, flexShrink: 0 }} />
                  <span style={{ color: '#64748b' }}>{x.label}:</span>
                  <span style={{ fontWeight: 700, color: x.color, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(x.val)}
                  </span>
                  <span style={{ color: '#94a3b8' }}>({x.pct.toFixed(0)}%)</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer total */}
      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: `2px solid ${css.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Total — All Branches
        </span>
        <span style={{ fontSize: 16, fontWeight: 900, color: C.indigo, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(grandTotal)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export function AgingReport() {
  const [dates, setDates] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState('');
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [branchMonthly, setBranchMonthly] = useState<any[]>([]);
  const [loadRows, setLoadRows] = useState(true);
  const [loadKpi, setLoadKpi] = useState(true);
  const [loadBranch, setLoadBranch] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/aging/dates/', { headers: auth() }).then(r => {
      const d: string[] = r.data?.dates ?? [];
      setDates(d); if (d.length) setActiveDate(d[0]);
    }).catch(() => {});
    axios.get('/api/transactions/branch-monthly/', { params: { movement_type: 'ف بيع' }, headers: auth() })
      .then(r => { setBranchMonthly(r.data?.monthly_data ?? []); })
      .catch(() => {}).finally(() => setLoadBranch(false));
  }, []);

  const fetchRows = useCallback(async (date: string) => {
    if (!date) return;
    setLoadRows(true); setError('');
    try {
      const r = await axios.get('/api/aging/', { params: { report_date: date, page_size: 200 }, headers: auth() });
      setRows(((r.data?.records ?? r.data?.results ?? []) as AgingRow[]).map(norm));
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

  // ── Derived ─────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    total:   rows.reduce((s, r) => s + r.total, 0),
    current: rows.reduce((s, r) => s + r.current, 0),
    overdue: rows.reduce((s, r) => s + r.overdue_total, 0),
    d1_60:   rows.reduce((s, r) => s + r.d1_30 + r.d31_60, 0),
  }), [rows]);

  const globalCR  = kpi ? num(kpi.kpis.taux_recouvrement.value) : 0;
  const globalOR  = kpi ? num(kpi.kpis.taux_impayes.value) : 0;
  const globalDSO = kpi ? num(kpi.kpis.dmp.value) : 0;
  const caTotal   = kpi?.summary?.ca_total ?? 0;
  const collected = Math.max(0, caTotal - totals.total);

  // ── Branch colors generated dynamically from data ──────────────
  const rowsWithBranch = useMemo(() =>
    rows.map(r => ({ ...r, resolvedBranch: resolveRowBranch(r) } as AgingRowWithBranch)), [rows]);

  const branchColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const names = [...new Set(rowsWithBranch.map(r => r.resolvedBranch).filter(n => n !== 'Unassigned'))];
    names.forEach((name, i) => { map[name] = BRANCH_PAL[i % BRANCH_PAL.length]; });
    return map;
  }, [rowsWithBranch]);

  const topDebtors = useMemo(() =>
    [...rowsWithBranch].sort((a, b) => b.total - a.total).slice(0, 15).map(r => ({
      name: shortName(r, 22),
      nameWithBranch: `${shortName(r, 18)} [${r.resolvedBranch !== 'Unassigned' ? r.resolvedBranch : 'N/A'}]`,
      branch: r.resolvedBranch, total: r.total, overdue: r.overdue_total,
      color: RISK_CFG[r.risk_score ?? 'low']?.color ?? C.indigo,
      risk: r.risk_score ?? 'low',
    })), [rowsWithBranch]);

  const buckets = useMemo(() => {
    const keys: [keyof AgingRow, string][] = [
      ['current','Current'],['d1_30','1–30d'],['d31_60','31–60d'],['d61_90','61–90d'],
      ['d91_120','91–120d'],['d121_150','121–150d'],['d151_180','151–180d'],['d181_210','181–210d'],
      ['d211_240','211–240d'],['d241_270','241–270d'],['d271_300','271–300d'],['d301_330','301–330d'],['over_330','>330d'],
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
        total:   br.reduce((s, r) => s + r.total, 0),
        overdue: br.reduce((s, r) => s + r.overdue_total, 0),
        current: br.reduce((s, r) => s + r.current, 0),
        d1_60:   br.reduce((s, r) => s + r.d1_30 + r.d31_60, 0),
        d61plus: br.reduce((s, r) => s + r.overdue_total, 0),
        color: branchColorMap[branch] ?? BRANCH_PAL[bi % BRANCH_PAL.length],
      };
    }).sort((a, b) => b.total - a.total);
  }, [rowsWithBranch, branchColorMap]);

  const branchKpi = useMemo(() =>
    branchBuckets.map(b => ({
      ...b,
      notOverdue: b.total - b.overdue,
      cr: b.total > 0 ? +((b.total - b.overdue) / b.total * 100).toFixed(1) : 0,
      overdueRate: b.total > 0 ? +(b.overdue / b.total * 100).toFixed(1) : 0,
    })).sort((a, b) => b.total - a.total), [branchBuckets]);

  const branchCustomerMap = useMemo(() => {
    const map = new Map<string, AgingRowWithBranch[]>();
    for (const r of rowsWithBranch) {
      if (r.total <= 0) continue;
      const list = map.get(r.resolvedBranch) ?? [];
      list.push(r); map.set(r.resolvedBranch, list);
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
        const ek = (rawKey as string).trim();
        if (ek) point[ek] = (point[ek] ?? 0) + num(rawVal);
      }
      return point;
    });
  }, [branchMonthly]);

  const areaChartBranches = useMemo(() => {
    const all = new Set<string>();
    areaChartData.forEach(pt => Object.keys(pt).forEach(k => { if (k !== 'label') all.add(k); }));
    return [...all].sort();
  }, [areaChartData]);

  const riskCounts = useMemo(() =>
    Object.entries(RISK_CFG).map(([k, cfg]) => ({
      name: cfg.label, key: k,
      value: rows.filter(r => (r.risk_score ?? 'low') === k).length,
      amount: rows.filter(r => (r.risk_score ?? 'low') === k).reduce((s, r) => s + r.total, 0),
      color: cfg.color, bg: cfg.bg,
    })), [rows]);

  const allBranches = useMemo(() => Object.keys(branchColorMap), [branchColorMap]);

  // ── Print ───────────────────────────────────────────────────────
  const handlePrint = () => {
    const printable = document.getElementById('aging-printable');
    if (!printable) { alert('No content to print.'); return; }
    const clone = printable.cloneNode(true) as HTMLElement;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    const fixVars = (el: HTMLElement) => {
      if (el.style?.cssText) {
        el.style.cssText = el.style.cssText
          .replace(/hsl\(var\(--card\)\)/g,'#fff').replace(/hsl\(var\(--card-foreground\)\)/g,'#0f172a')
          .replace(/hsl\(var\(--border\)\)/g,'#e2e8f0').replace(/hsl\(var\(--muted\)\)/g,'#f8fafc')
          .replace(/hsl\(var\(--muted-foreground\)\)/g,'#64748b').replace(/hsl\(var\(--background\)\)/g,'#fff')
          .replace(/hsl\(var\(--foreground\)\)/g,'#0f172a');
      }
      Array.from(el.children).forEach(c => fixVars(c as HTMLElement));
    };
    fixVars(clone);

    const crOk  = globalCR  >= 70;
    const dsoOk = globalDSO <= 90;
    const orOk  = globalOR  <= 20;
    const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Aging Receivables — ${activeDate}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:ital,wght@0,400;0,600;0,700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:#fff;color:#0f172a;font-size:12px;}
@page{size:A4 landscape;margin:8mm 10mm;}
.cover{width:100%;height:190mm;background:#fff;break-after:page!important;page-break-after:always!important;position:relative;overflow:hidden;}
.cover-stripe{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#0891b2);}
.cover-bg{position:absolute;top:0;right:0;width:48%;height:100%;background:linear-gradient(148deg,#eef2ff,#e0e7ff,#c7d2fe,#a5b4fc);clip-path:polygon(12% 0,100% 0,100% 100%,0% 100%);}
.cover-inner{position:relative;z-index:2;display:grid;grid-template-rows:auto 1fr auto;height:100%;padding:28px 48px 24px;}
.cover-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #e2e8f0;}
.cover-main{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:20px 0;}
.cover-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:#0f172a;line-height:1.0;}
.cover-title em{color:#4f46e5;font-style:italic;}
.kc{background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.95);border-radius:12px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.kc-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;}
.kc-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1;}
.kc-note{font-size:10px;color:#94a3b8;margin-top:2px;}
.badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;}
.ok{color:#059669;background:#d1fae5;}.warn{color:#d97706;background:#fef3c7;}.bad{color:#e11d48;background:#ffe4e6;}
.cover-footer{border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;}
.body-wrap{padding:16px 20px;}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-shadow:none!important;}
div[style*="maxHeight"],div[style*="overflow"]{max-height:none!important;overflow:visible!important;}
button{display:none!important;}
/* ── Prevent cards and sections from breaking across pages ── */
section{break-inside:avoid;page-break-inside:avoid;}
div[style*="border-radius: 12px"],div[style*="border-radius:12px"]{break-inside:avoid;page-break-inside:avoid;}
div[style*="border: 1px solid"]{break-inside:avoid;page-break-inside:avoid;}
table{break-inside:avoid;page-break-inside:avoid;}
tr{break-inside:avoid;page-break-inside:avoid;}
/* Grids: keep each grid together */
div[style*="grid-template-columns"]{break-inside:avoid;page-break-inside:avoid;}
/* Each branch row block */
div[style*="border-top:"]{break-inside:avoid;page-break-inside:avoid;}
</style></head><body>
<div class="cover">
  <div class="cover-stripe"></div><div class="cover-bg"></div>
  <div class="cover-inner">
    <div class="cover-top">
      <span style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#374151;">WEEG Financial</span>
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#4f46e5;background:#eef2ff;border:1.5px solid #c7d2fe;padding:4px 13px;border-radius:20px;">Financial Report</span>
    </div>
    <div class="cover-main">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:14px;">Accounts Receivable Management</div>
        <h1 class="cover-title">Aging<br/><em>Receivables</em></h1>
        <p style="font-size:15px;color:#64748b;margin:14px 0 18px;">Detailed Analysis by Branch — ${activeDate}</p>
        <p style="font-size:12px;color:#94a3b8;line-height:1.85;border-left:3px solid #c7d2fe;padding-left:16px;">Comprehensive view of outstanding receivables across all branches — overdue aging analysis, top debtor profiles, collection performance per branch, and monthly revenue trends.</p>
      </div>
      <div style="padding-left:16px;">
        <div class="kc">
          <div><div class="kc-lbl">Total Receivables</div><div class="kc-val" style="color:#4f46e5;">${formatCurrency(totals.total)}</div><div class="kc-note">${rows.length} customers · ${allBranches.length} branches</div></div>
          <span class="badge" style="background:#ede9fe;color:#7c3aed;">Snapshot</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">Collection Rate</div><div class="kc-val ${crOk ? 'ok':'bad'}" style="color:${crOk?'#059669':'#e11d48'};">${globalCR.toFixed(1)}%</div><div class="kc-note">Target &gt; 70%</div></div>
          <span class="badge ${crOk?'ok':'bad'}">${crOk?'✓ On target':'⚠ Below'}</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">Average DSO</div><div class="kc-val" style="color:${dsoOk?'#059669':globalDSO<=120?'#d97706':'#e11d48'};">${globalDSO.toFixed(0)} days</div><div class="kc-note">Target &lt; 90 days</div></div>
          <span class="badge ${dsoOk?'ok':globalDSO<=120?'warn':'bad'}">${dsoOk?'✓ Good':globalDSO<=120?'⚠ High':'✗ Critical'}</span>
        </div>
        <div class="kc">
          <div><div class="kc-lbl">Overdue Rate</div><div class="kc-val" style="color:${orOk?'#059669':globalOR<=35?'#d97706':'#e11d48'};">${globalOR.toFixed(1)}%</div><div class="kc-note">Target &lt; 20%</div></div>
          <span class="badge ${orOk?'ok':globalOR<=35?'warn':'bad'}">${orOk?'✓ Good':globalOR<=35?'⚠ Alert':'✗ Critical'}</span>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      <div style="display:flex;align-items:center;gap:12px;font-size:10px;color:#94a3b8;">
        <span>Generated on ${genDate}</span>
        <span style="width:3px;height:3px;border-radius:50%;background:#cbd5e1;display:inline-block;"></span>
        <span>Snapshot: ${activeDate}</span>
        <span style="width:3px;height:3px;border-radius:50%;background:#cbd5e1;display:inline-block;"></span>
        <span>${allBranches.length} branches · ${rows.length} customers</span>
      </div>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#a5b4fc;border:1.5px solid #e0e7ff;padding:3px 10px;border-radius:20px;background:#faf5ff;">Confidential</span>
    </div>
  </div>
</div>
<div class="body-wrap">${clone.outerHTML}</div>
</body></html>`);
    doc.close();
    iframe.style.visibility = 'visible'; iframe.style.zIndex = '9999';
    const cleanup = () => { iframe.style.visibility = 'hidden'; setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500); };
    iframe.onload = () => { setTimeout(() => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.print(); } }, 800); };
    setTimeout(() => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.print(); } }, 1800);
    if (iframe.contentWindow) { iframe.contentWindow.onafterprint = cleanup; setTimeout(cleanup, 90000); }
  };

  if ((loadRows || loadKpi) && rows.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, minHeight: 400, justifyContent: 'center' }}>
      <Spin /><p style={{ fontSize: 13, color: '#64748b' }}>Loading aging data…</p>
    </div>
  );
  if (error) return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, color: C.rose }}>
      <AlertCircle size={16} /><span style={{ flex: 1, fontSize: 13 }}>{error}</span>
      <button onClick={() => { fetchRows(activeDate); fetchKpi(activeDate); }} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.card, cursor: 'pointer' }}>Retry</button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── TOOLBAR ──────────────────────────────────────────── */}
      <div style={{ ...card, background: `linear-gradient(135deg, ${C.indigo}08, ${C.violet}04)`, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${C.indigo}40` }}>
              <BarChart3 size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: css.fg, margin: 0, letterSpacing: '-0.03em' }}>Aging Receivables Report — By Branch</h1>
              <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                Snapshot: <strong style={{ color: css.fg }}>{activeDate}</strong>
                <span style={{ margin: '0 6px', color: '#cbd5e1' }}>·</span>{rows.length} customers
                <span style={{ margin: '0 6px', color: '#cbd5e1' }}>·</span>{branchBuckets.length} branches
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { fetchRows(activeDate); fetchKpi(activeDate); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} />Refresh
            </button>
            <button onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.indigo}40`, background: `${C.indigo}10`, color: C.indigo, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={13} />Print / Export PDF
            </button>
          </div>
        </div>
        {dates.length > 1 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${css.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>Snapshots ({dates.length})</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dates.map(d => (
                <span key={d} onClick={() => setActiveDate(d)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', background: d === activeDate ? C.indigo : `${C.indigo}10`, color: d === activeDate ? '#fff' : C.indigo, fontWeight: d === activeDate ? 700 : 500, border: `1px solid ${d === activeDate ? C.indigo : `${C.indigo}20`}` }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          PRINTABLE BODY
      ══════════════════════════════════════════════════════════ */}
      <div id="aging-printable" style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>

        {/* ══ PARTIE A ══════════════════════════════════════════ */}
        <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <PartieHeader letter="A" label="General Summary" color={C.indigo} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <KCard label="Total Receivables" value={formatCurrency(totals.total)} sub={`${rows.length} customers · ${activeDate}`} accent={C.indigo} Icon={TrendingUp} target="Track trend" />
            <KCard label="Overdue > 60d" value={formatCurrency(totals.overdue)} sub={`${pct(totals.overdue, totals.total)}% of portfolio`} accent={C.rose} Icon={AlertTriangle} target="< 20% of total" />
            <KCard label="Collection Rate" value={`${globalCR.toFixed(1)}%`} sub={globalCR >= 70 ? '✓ Above target' : '⚠ Below target'} accent={C.emerald} Icon={Target} target="> 70%" />
            <KCard label="Average DSO" value={`${globalDSO.toFixed(0)} days`} sub={globalDSO <= 90 ? '✓ Within target' : '⚠ Exceeds target'} accent={C.amber} Icon={Clock} target="< 90 days" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            {[
              { label: 'Current (not due)',     value: formatCurrency(totals.current), p: pct(totals.current, totals.total), color: C.emerald },
              { label: '1–60d (early overdue)', value: formatCurrency(totals.d1_60),   p: pct(totals.d1_60, totals.total),   color: C.amber },
              { label: 'Overdue rate',           value: `${globalOR.toFixed(1)}%`,      p: Math.min(100, globalOR),            color: C.rose },
              { label: 'Total credit revenue',   value: formatCurrency(caTotal),        p: 100,                                color: C.indigo },
            ].map(m => (
              <div key={m.label} style={{ ...card, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: 0 }}>{m.label}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: m.color, margin: '4px 0 8px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
                <div style={{ height: 4, borderRadius: 999, background: css.muted }}>
                  <div style={{ height: '100%', borderRadius: 999, width: `${m.p}%`, background: m.color, opacity: .7 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, marginBottom: 28, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>Aging Period Distribution — {activeDate}</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Global receivables by age bucket</p>
              {loadRows ? <Empty h={270} /> : (() => {
                const maxNL = Math.max(...buckets.slice(0, -1).map(b => b.amount), 1);
                const CAP = maxNL * 1.65;
                const db = buckets.map(b => ({ ...b, display: Math.min(b.amount, CAP), capped: b.amount > CAP, realAmount: b.amount }));
                return (
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={db} margin={{ left: 0, right: 8, top: 14, bottom: 52 }} barCategoryGap="14%">
                      <CartesianGrid strokeDasharray="3 3" stroke={css.border} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-42} textAnchor="end" height={64} />
                      <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} domain={[0, CAP * 1.08]} />
                      <RTooltip content={(p: any) => {
                        if (!p.active || !p.payload?.length) return null;
                        const orig = db.find(b => b.label === p.label);
                        return (
                          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                            <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{p.label}</p>
                            <p style={{ color: '#94a3b8' }}>Amount: <strong style={{ color: '#fff' }}>{formatCurrency(orig?.realAmount ?? 0)}</strong></p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="display" radius={[5, 5, 0, 0]}>
                        {db.map((b, i) => <Cell key={i} fill={b.color} />)}
                        <LabelList dataKey="amount" position="top" content={(props: any) => {
                          const b = db[props.index];
                          if (!b) return null;
                          const x = (props.x ?? 0) + (props.width ?? 0) / 2;
                          return (
                            <text x={x} y={(props.y ?? 0) - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill={b.capped ? C.amber : '#64748b'}>
                              {b.amount > 0 ? `${(b.amount / 1000).toFixed(0)}k` : ''}
                            </text>
                          );
                        }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>

            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>Risk Distribution</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{rows.length} customers by risk score</p>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: 160, marginBottom: 16 }}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={riskCounts.filter(c => c.value > 0).length > 0 ? riskCounts.filter(c => c.value > 0) : [{ name: 'none', value: 1, color: '#e2e8f0' }]}
                    dataKey="value" cx={80} cy={80} innerRadius={50} outerRadius={72} paddingAngle={3} strokeWidth={0}
                  >
                    {(riskCounts.filter(c => c.value > 0).length > 0 ? riskCounts.filter(c => c.value > 0) : [{ color: '#e2e8f0' }]).map((e: any, i: number) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: css.fg, lineHeight: 1 }}>{rows.length}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>clients</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {riskCounts.map(c => (
                  <div key={c.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.value > 0 ? css.cardFg : '#94a3b8', fontWeight: c.value > 0 ? 600 : 400 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />{c.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{c.value > 0 ? formatCurrency(c.amount) : '—'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 26, textAlign: 'center', padding: '1px 7px', borderRadius: 20, background: c.value > 0 ? c.bg : css.muted, color: c.value > 0 ? c.color : '#94a3b8' }}>{c.value}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, borderRadius: 999, background: css.muted }}>
                      <div style={{ height: '100%', borderRadius: 999, width: `${pct(c.value, rows.length)}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: `${C.indigo}06`, border: `1px solid ${C.indigo}15` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Exposure</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.indigo }}>{formatCurrency(totals.total)}</span>
                </div>
                <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', gap: 1 }}>
                  {riskCounts.filter(c => c.value > 0).map(c => (
                    <div key={c.name} style={{ width: `${pct(c.amount, totals.total)}%`, background: c.color, minWidth: c.amount > 0 ? 4 : 0 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>Overall KPIs vs. Objectives</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 18 }}>Collection rate · Overdue rate · DSO · Collected vs Outstanding</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              {[
                { label: 'Collection Rate',       display: `${globalCR.toFixed(1)}%`,      bar: Math.min(100, globalCR),                 threshold: '> 70%',     good: globalCR >= 70,  accent: C.emerald },
                { label: 'Overdue Rate',           display: `${globalOR.toFixed(1)}%`,      bar: Math.min(100, globalOR),                 threshold: '< 20%',     good: globalOR <= 20,  accent: C.rose },
                { label: 'Days Sales Outstanding', display: `${globalDSO.toFixed(0)} days`, bar: Math.min(100, (globalDSO / 180) * 100), threshold: '< 90 days', good: globalDSO <= 90, accent: C.amber },
              ].map(k => (
                <div key={k.label} style={{ padding: '18px', borderRadius: 10, background: `${k.accent}06`, border: `1px solid ${k.accent}20` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: 0 }}>{k.label}</p>
                      <p style={{ fontSize: 30, fontWeight: 900, color: k.accent, margin: '4px 0 0', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{k.display}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: k.good ? '#d1fae5' : '#ffe4e6', color: k.good ? C.emerald : C.rose }}>{k.good ? '✓ OK' : '⚠ Alert'}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${k.bar}%`, background: `linear-gradient(90deg, ${k.accent}80, ${k.accent})` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                    <span>0</span><span style={{ color: k.accent, fontWeight: 600 }}>Target: {k.threshold}</span>
                  </div>
                </div>
              ))}
            </div>
            {!loadKpi && caTotal > 0 && (
              <div style={{ paddingTop: 16, borderTop: `1px solid ${css.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Collected vs. Still Outstanding</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[{ label: 'Amount Collected', value: collected, color: C.emerald }, { label: 'Still Outstanding', value: totals.total, color: C.rose }].map(b => {
                    const p2 = caTotal > 0 ? (b.value / caTotal) * 100 : 0;
                    return (
                      <div key={b.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: css.fg, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />{b.label}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: b.color, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(b.value)}</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(100, p2)}%`, background: `linear-gradient(90deg, ${b.color}70, ${b.color})` }} />
                        </div>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{p2.toFixed(1)}% of total credit revenue</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══ PARTIE B — ANALYSE PAR AGENCE ══════════════════════ */}
        <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <PartieHeader letter="B" label="Analysis by Agency" color={C.violet} />

          {/* Monthly area */}
          <div style={{ ...card, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>Monthly Credit Revenue by Branch — Last 12 Months</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Trend and seasonality per branch</p>
            {loadBranch ? <Empty h={230} text="Loading…" /> : areaChartData.length === 0 ? <Empty h={230} text="No monthly data" /> : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={areaChartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <defs>
                    {areaChartBranches.map(br => (
                      <linearGradient key={br} id={`ag-${br.replace(/[\s()]/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={branchColorMap[br] ?? C.indigo} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={branchColorMap[br] ?? C.indigo} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={css.border} vertical={false} />
                  <XAxis dataKey="label" tick={ax} axisLine={false} tickLine={false} />
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <RTooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" iconSize={7} />
                  {areaChartBranches.map(br => (
                    <Area key={br} type="monotone" dataKey={br} name={br}
                      stroke={branchColorMap[br] ?? C.indigo} strokeWidth={2}
                      fill={`url(#ag-${br.replace(/[\s()]/g,'')})`} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── 2 cartes print-ready ─────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24, breakInside: 'avoid', pageBreakInside: 'avoid' }}>

            {/* Carte gauche — barres horizontales annotées */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>
                Receivables by Branch — {activeDate}
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                On-track vs. overdue · montants et taux de recouvrement
              </p>
              <BranchHBarChart branchBuckets={branchBuckets} loadRows={loadRows} />
            </div>

            {/* Carte droite — stacked visuel annoté */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>
                Aging Breakdown per Branch — {activeDate}
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Current · 1–60d · Overdue &gt;60d — montants annotés par agence
              </p>
              <BranchStackedVisual branchBuckets={branchBuckets} loadRows={loadRows} />
            </div>

          </div>

          {/* Branch detail table */}
          {branchBuckets.length > 0 && (
            <div style={card}>
              <AgingDetailPrintTable branchBuckets={branchBuckets} grandTotal={totals.total} />
            </div>
          )}
        </section>

        {/* ══ PARTIE C ══════════════════════════════════════════ */}
        <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <PartieHeader letter="C" label="Main Debtors & Risks" color={C.rose} />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>Top 15 Debtors — All Branches</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Color = risk level · amounts in LYD</p>
              {topDebtors.length === 0 ? <Empty h={380} /> : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topDebtors} layout="vertical" margin={{ left: 0, right: 90, top: 4, bottom: 4 }} barCategoryGap="14%">
                    <CartesianGrid strokeDasharray="3 3" stroke={css.border} horizontal={false} />
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nameWithBranch" width={210} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RTooltip content={(p: any) => {
                      if (!p.active || !p.payload?.length) return null;
                      const tot = p.payload.find((x: any) => x.dataKey === 'total')?.value ?? 0;
                      const ov  = p.payload.find((x: any) => x.dataKey === 'overdue')?.value ?? 0;
                      const d   = topDebtors.find(x => x.nameWithBranch === p.label);
                      return (
                        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 16px', fontSize: 12, minWidth: 230 }}>
                          <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{d?.name ?? p.label}</p>
                          <p style={{ color: '#64748b', marginBottom: 10, fontSize: 11 }}>Branch: <strong style={{ color: '#94a3b8' }}>{d?.branch ?? '—'}</strong></p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ color: '#64748b' }}>Total</span><strong style={{ color: '#f1f5f9' }}>{formatCurrency(tot)}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Overdue &gt;60d</span><strong style={{ color: C.rose }}>{formatCurrency(ov)}</strong></div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="total" name="Total balance" radius={[0, 5, 5, 0]}>
                      {topDebtors.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                      <LabelList dataKey="total" position="right" style={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} formatter={(v: number) => formatCurrency(v)} />
                    </Bar>
                    <Bar dataKey="overdue" name="Overdue >60d" fill={C.rose} fillOpacity={0.3} radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'start' }}>
              {riskCounts.filter(c => c.value > 0).map(c => (
                <div key={c.name} style={{ ...card, padding: '14px 16px', background: c.bg, border: `1px solid ${c.color}20` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.color, margin: 0 }}>{c.name} Risk</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0 2px', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(c.amount)}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{pct(c.amount, totals.total)}% of portfolio</p>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: c.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>Top Debtors — Detailed Table</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Top 15 with branch, account code, overdue breakdown</p>
            <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${css.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: css.muted }}>
                    {['#','Customer','Branch','Account Code','Total LYD','Overdue >60d','Overdue %','Risk'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: ['#','Customer','Branch','Account Code'].includes(h) ? 'left' : 'right' as any, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `2px solid ${css.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...rowsWithBranch].sort((a, b) => b.total - a.total).slice(0, 15).map((r, i) => {
                    const ovPct = r.total > 0 ? (r.overdue_total / r.total * 100) : 0;
                    const risk  = r.risk_score ?? 'low';
                    const rc    = RISK_CFG[risk];
                    const bc    = branchColorMap[r.resolvedBranch] ?? C.indigo;
                    const acctCode = (r.account_code ?? r.account ?? '').match(/^\d+/)?.[0] ?? '—';
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${css.border}`, background: i % 2 === 0 ? 'transparent' : `${css.muted}50` }}>
                        <td style={{ padding: '9px 12px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: '9px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: css.cardFg }}>{shortName(r, 28)}</span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${bc}14`, color: bc, whiteSpace: 'nowrap' }}>{r.resolvedBranch}</span>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{acctCode}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: css.cardFg, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.total)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: r.overdue_total > 0 ? C.rose : '#94a3b8', fontWeight: r.overdue_total > 0 ? 700 : 400 }}>{r.overdue_total > 0 ? formatCurrency(r.overdue_total) : '—'}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}><span style={{ fontWeight: 700, color: ovPct <= 20 ? C.emerald : ovPct <= 35 ? C.amber : C.rose }}>{ovPct.toFixed(1)}%</span></td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rc?.bg ?? '#f1f5f9', color: rc?.color ?? C.indigo }}>{rc?.label ?? risk}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══ PARTIE D ══════════════════════════════════════════ */}
        <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <PartieHeader letter="D" label="Recovery Rate per Agency" color={C.emerald} />

          <div style={{ ...card, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>On-track vs. Overdue · Collection Rate % — {activeDate}</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Bars = amounts · Line = CR% · Target dashed at 70%</p>
            {loadRows || branchKpi.length === 0 ? <Empty h={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={branchKpi} margin={{ top: 4, right: 24, left: 0, bottom: 14 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke={css.border} vertical={false} />
                  <XAxis dataKey="branch" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: C.indigo }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <RTooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />
                  <Bar yAxisId="left" dataKey="notOverdue" name="On-track" fill={C.emerald} fillOpacity={0.8} stackId="a" />
                  <Bar yAxisId="left" dataKey="overdue" name="Overdue >60d" fill={C.rose} fillOpacity={0.8} stackId="a" radius={[5, 5, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cr" name="CR %" stroke={C.indigo} strokeWidth={2.5} dot={{ fill: C.indigo, r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.fg, margin: '0 0 3px' }}>Detail by Agency — Outstanding & Clients</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 18 }}>Progress bar · on-track vs. overdue · top 5 clients per agency</p>
            {loadRows || branchKpi.length === 0 ? <Empty h={200} /> : (
              <div>
                {branchKpi.map((b, bi) => {
                  const maxT     = Math.max(...branchKpi.map(x => x.total), 1);
                  const barW     = (b.total / maxT) * 100;
                  const notOvPct = b.total > 0 ? (b.notOverdue / b.total) * 100 : 0;
                  const ovPct    = b.total > 0 ? (b.overdue / b.total) * 100 : 0;
                  const customers = branchCustomerMap.get(b.branch) ?? [];
                  return (
                    <div key={b.branch} style={{ borderTop: bi > 0 ? `1px solid ${css.border}` : 'none', paddingTop: bi > 0 ? 20 : 0, marginTop: bi > 0 ? 20 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: b.color }} />
                          <span style={{ fontSize: 15, fontWeight: 800, color: css.cardFg }}>{b.branch}</span>
                          <span style={{ fontSize: 10, color: '#64748b', padding: '1px 8px', borderRadius: 12, background: css.muted }}>{b.count} customers</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(b.total)}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 12px', borderRadius: 20, background: b.cr >= 70 ? '#d1fae5' : '#ffe4e6', color: b.cr >= 70 ? C.emerald : C.rose, border: `1px solid ${b.cr >= 70 ? C.emerald : C.rose}40` }}>
                            CR {b.cr.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 12, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ width: `${barW}%`, height: '100%', display: 'flex', overflow: 'hidden', borderRadius: 999 }}>
                          <div style={{ width: `${notOvPct}%`, height: '100%', background: `linear-gradient(90deg, ${C.emerald}80, ${C.emerald})` }} />
                          <div style={{ width: `${ovPct}%`, height: '100%', background: `linear-gradient(90deg, ${C.amber}70, ${C.rose})` }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <span style={{ fontSize: 11, color: C.emerald, fontWeight: 600 }}>On-track: {formatCurrency(b.notOverdue)} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({notOvPct.toFixed(0)}%)</span></span>
                        {b.overdue > 0 && <span style={{ fontSize: 11, color: C.rose, fontWeight: 600 }}>Overdue: {formatCurrency(b.overdue)} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({ovPct.toFixed(0)}%)</span></span>}
                      </div>
                      {customers.length > 0 && <CustomerTable customers={customers} showOverdue maxRows={5} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

      </div>{/* end #aging-printable */}
    </div>
  );
}