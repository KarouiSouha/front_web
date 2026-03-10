// src/app/pages/PricingProfitabilityReport.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// PRICING & PROFITABILITY REPORT
// Sections: Sales Quantity · Total Revenue · Profit · Profit Ratio (by month, branch)
//           Product Profitability · Customer Profitability · Branch Analysis
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
    TrendingUp,
    DollarSign,
    Package,
    Users,
    BarChart3,
    RefreshCw,
    Loader2,
    AlertCircle,
    Printer,
    ChevronDown,
    Star,
    AlertTriangle,
    Target,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RTooltip,
    ResponsiveContainer,
    Cell,
    Legend,
    ComposedChart,
} from 'recharts';
import { salesKpiApi, MOVEMENT_TYPES } from '../lib/dataApi';
import { formatCurrency, formatNumber } from '../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  indigo: '#6366f1', violet: '#8b5cf6', cyan: '#0ea5e9',
  teal: '#14b8a6', emerald: '#10b981', amber: '#f59e0b',
  orange: '#f97316', rose: '#f43f5e', sky: '#38bdf8',
};
const BRANCH_PAL = [
  '#6366f1','#0ea5e9','#14b8a6','#10b981',
  '#f59e0b','#f43f5e','#8b5cf6','#f97316',
  '#38bdf8','#ec4899','#84cc16','#06b6d4',
];
const css = {
  card: 'hsl(var(--card))', cardFg: 'hsl(var(--card-foreground))',
  border: 'hsl(var(--border))', muted: 'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--background))',
  fg: 'hsl(var(--foreground))',
};
const card: React.CSSProperties = {
  background: css.card, borderRadius: 16, padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border: `1px solid ${css.border}`,
};
const ax = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const legendStyle = { fontSize: 11, paddingTop: 8 };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const num = (v: unknown): number => { const n = Number(v); return isFinite(n) ? n : 0; };
const pct = (a: number, b: number) => b > 0 ? +((a / b) * 100).toFixed(1) : 0;
function auth() {
  const t = localStorage.getItem('fasi_access_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────
function Spin() {
  return <Loader2 size={20} className="animate-spin" style={{ color: C.indigo }} />;
}

function Empty({ text = 'No data', h = 200 }: { text?: string; h?: number }) {
  return (
    <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 13, flexDirection: 'column', gap: 8 }}>
      <BarChart3 size={24} style={{ opacity: .25 }} />{text}
    </div>
  );
}

function Tip({ active, payload, label, isCurrency = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', boxShadow: '0 10px 30px rgba(0,0,0,.15)', fontSize: 12, minWidth: 180 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 8 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill ?? p.color, flexShrink: 0 }} />
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
        <h2 style={{ fontSize: 18, fontWeight: 800, color: css.fg, margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: css.mutedFg, margin: '4px 0 0', lineHeight: 1.5 }}>{sub}</p>}
      </div>
    </div>
  );
}

function KCard({ label, value, sub, accent, Icon, badge }: { label: string; value: string; sub?: string; accent: string; Icon: any; badge?: { text: string; good: boolean } }) {
  return (
    <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: accent, opacity: .08, filter: 'blur(20px)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} style={{ color: accent }} />
        </div>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: badge.good ? `${C.emerald}18` : `${C.rose}18`, color: badge.good ? C.emerald : C.rose }}>
            {badge.text}
          </span>
        )}
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: css.mutedFg, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 900, color: accent, margin: '4px 0 0', letterSpacing: '-0.03em' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: css.mutedFg, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function StyledDropdown({ label, options, value, onChange, isOpen, onToggle, onClose }: {
  label: string; options: { key: string; label: string }[];
  value: string; onChange: (v: string) => void;
  isOpen: boolean; onToggle: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const current = options.find(o => o.key === value)?.label ?? label;

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen, onClose]);

  const menu = isOpen ? createPortal(
    <div style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: 280, overflowY: 'auto', padding: 6 }}>
      {options.map(opt => (
        <button key={opt.key} onMouseDown={e => e.stopPropagation()} onClick={() => { onChange(opt.key); onClose(); }}
          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: value === opt.key ? `${C.indigo}15` : 'transparent', color: value === opt.key ? C.indigo : '#111827', fontWeight: value === opt.key ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {opt.label}
          {value === opt.key && <span style={{ color: C.indigo, fontSize: 12 }}>✓</span>}
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 160 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: css.mutedFg, marginBottom: 6 }}>{label}</p>
      <button ref={btnRef} onClick={onToggle} style={{ width: '100%', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: 8, color: css.mutedFg, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {menu}
    </div>
  );
}

function RankBar({ value, max, accent, label, sub, rank }: { value: number; max: number; accent: string; label: string; sub?: string; rank: number }) {
  const share = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: rank <= 3 ? `${accent}18` : css.muted, color: rank <= 3 ? accent : css.mutedFg, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {rank}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</p>
            {sub && <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>{sub}</p>}
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: accent, flexShrink: 0, marginLeft: 12 }}>{formatCurrency(value)}</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${share}%`, background: `linear-gradient(90deg, ${accent}60, ${accent})`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function ProfitBadge({ value }: { value: number }) {
  const color = value >= 30 ? C.emerald : value >= 15 ? C.amber : C.rose;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap' }}>
      {value.toFixed(1)}%
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main report component
// ─────────────────────────────────────────────────────────────────────────────
export function PricingProfitabilityReport() {
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2].map(y => ({ key: String(y), label: String(y) }));

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [openDropdown, setOpenDropdown] = useState<'year' | 'branch' | null>(null);

  // ── Data state ──────────────────────────────────────────────────────────
  const [salesKPI, setSalesKPI]             = useState<any>(null);
  const [saleBranches, setSaleBranches]     = useState<any[]>([]);
  const [branchMonthlySales, setBranchMonthlySales]   = useState<any[]>([]);
  const [salesBranchNames, setSalesBranchNames]       = useState<string[]>([]);
  const [availableBranches, setAvailableBranches]     = useState<string[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    const year = Number(selectedYear);
    try {
      const [sales, saleBrRes, salesMonthly, summRes, branchesRes] = await Promise.all([
        salesKpiApi.getAll({ year, top_n: 20 }),
        axios.get('/api/transactions/branch-breakdown/', { headers: auth(), params: { movement_type: MOVEMENT_TYPES.SALE, year } }),
        axios.get('/api/transactions/branch-monthly/', { headers: auth(), params: { movement_type: MOVEMENT_TYPES.SALE, year } }),
        axios.get('/api/transactions/summary/', { headers: auth(), params: { year } }),
        axios.get('/api/transactions/branches/', { headers: auth() }),
      ]);
      setSalesKPI(sales);
      setSaleBranches(saleBrRes.data.branches ?? []);
      setBranchMonthlySales(salesMonthly.data.monthly_data ?? []);
      setSalesBranchNames(salesMonthly.data.branches ?? []);
      setMonthlySummary(summRes.data.summary ?? []);
      setAvailableBranches(branchesRes.data.branches ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const totalRevenue   = num(salesKPI?.ca?.total);
  const totalQty       = num(salesKPI?.qty?.total);
  
  // Profit data from sales KPI (if available)
  const totalProfit    = num(salesKPI?.profit?.total ?? 0);
  const profitMargin   = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const visibleSalesBranchNames = selectedBranch === 'all'
    ? salesBranchNames
    : salesBranchNames.filter(b => b === selectedBranch);

  // Monthly combined for sales vs profit chart
  const combinedMonthly = useMemo(() => {
    const months = monthlySummary
      .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))
      .slice(-12);
    return months.map(m => ({
      month: m.month_label,
      qty: num(m.total_qty ?? 0),
      sales: num(m.total_sales),
      profit: num(m.total_profit ?? (num(m.total_sales) - num(m.total_purchases))),
      profitRatio: num(m.total_sales) > 0 ? ((num(m.total_profit ?? (num(m.total_sales) - num(m.total_purchases))) / num(m.total_sales)) * 100) : 0,
    }));
  }, [monthlySummary]);

  // Products with profitability
  const productProfitability = useMemo(() =>
    (salesKPI?.product_margins ?? []).map((p: any) => ({
      name: (p.material_name ?? '').slice(0, 32),
      revenue: num(p.total_revenue),
      profit: num(p.profit ?? (p.total_revenue - num(p.cost ?? 0))),
      profitRatio: num(p.total_revenue) > 0 ? ((num(p.profit ?? (p.total_revenue - num(p.cost ?? 0))) / num(p.total_revenue)) * 100) : 0,
      qty: num(p.total_qty),
    })).sort((a: any, b: any) => b.profitRatio - a.profitRatio),
    [salesKPI]
  );
  const topProfitProducts  = productProfitability.slice(0, 10);
  const lowProfitProducts = [...productProfitability].sort((a: any, b: any) => a.profitRatio - b.profitRatio).slice(0, 8);

  // Top customers by profit
  const topCustomers = useMemo(() =>
    (salesKPI?.top_clients ?? []).slice(0, 12).map((c: any, i: number) => ({
      name: (c.customer_name ?? '').slice(0, 32),
      revenue: num(c.total_revenue),
      profit: num(c.profit ?? (c.total_revenue * (profitMargin / 100))),
      profitRatio: num(c.total_revenue) > 0 ? ((num(c.profit ?? (c.total_revenue * (profitMargin / 100))) / num(c.total_revenue)) * 100) : 0,
      txCount: num(c.transaction_count),
      share: num(c.revenue_share),
      color: BRANCH_PAL[i % BRANCH_PAL.length],
    })),
    [salesKPI, profitMargin]
  );
  const maxCustomerProfit = topCustomers[0]?.profit ?? 1;

  // Branch sales comparison
  const branchCompare = useMemo(() => {
    const names = Array.from(new Set(saleBranches.map(b => b.branch)));
    return names
      .filter(n => selectedBranch === 'all' || n === selectedBranch)
      .map((n, i) => {
        const branchData = saleBranches.find(b => b.branch === n);
        const branchRevenue = num(branchData?.total);
        const branchProfit = branchRevenue * (profitMargin / 100);
        return {
          branch: n.slice(0, 14),
          revenue: branchRevenue,
          profit: branchProfit,
          profitRatio: branchRevenue > 0 ? (branchProfit / branchRevenue) * 100 : 0,
          color: BRANCH_PAL[i % BRANCH_PAL.length],
        };
      }).sort((a, b) => b.revenue - a.revenue);
  }, [saleBranches, selectedBranch, profitMargin]);

  const branchOptions = [
    { key: 'all', label: 'All Branches' },
    ...availableBranches.map(b => ({ key: b, label: b })),
  ];

  // ── Print ────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printable = document.getElementById('ppr-printable');
    if (!printable) return;
    const clone = printable.cloneNode(true) as HTMLElement;

    const replaceVars = (el: HTMLElement) => {
      if (el.style?.cssText) {
        el.style.cssText = el.style.cssText
          .replace(/hsl\(var\(--card\)\)/g, '#fff')
          .replace(/hsl\(var\(--card-foreground\)\)/g, '#111827')
          .replace(/hsl\(var\(--border\)\)/g, '#e5e7eb')
          .replace(/hsl\(var\(--muted\)\)/g, '#f3f4f6')
          .replace(/hsl\(var\(--muted-foreground\)\)/g, '#6b7280')
          .replace(/hsl\(var\(--background\)\)/g, '#fff')
          .replace(/hsl\(var\(--foreground\)\)/g, '#111827');
      }
      Array.from(el.children).forEach(c => replaceVars(c as HTMLElement));
    };
    replaceVars(clone);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Pricing & Profitability — ${selectedYear}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:#fff;color:#111827;padding:16px 20px;font-size:13px;}
  @page{size:A4 landscape;margin:8mm 10mm;}
  .cover{width:100%;height:190mm;display:grid;break-after:page!important;page-break-after:always!important;position:relative;overflow:hidden;}
  .cover-stripe{position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,${C.violet} 0%,${C.indigo} 45%,${C.cyan} 100%);z-index:3;}
  .cover-left-bar{position:absolute;top:0;left:0;width:5px;height:100%;background:linear-gradient(180deg,${C.violet} 0%,${C.indigo} 55%,${C.cyan} 100%);z-index:3;}
  .cover-bg{position:absolute;top:0;right:0;width:52%;height:100%;background:linear-gradient(148deg,#f3e8ff 0%,#ede9fe 40%,#ddd6fe 80%,#c4b5fd 100%);clip-path:polygon(15% 0,100% 0,100% 100%,0% 100%);z-index:0;}
  .cover-inner{position:relative;z-index:4;display:grid;grid-template-rows:auto 1fr auto;height:100%;padding:28px 48px 26px;}
  .cover-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #e5e7eb;}
  .cover-company{font-size:12px;font-weight:700;color:#374151;letter-spacing:0.08em;text-transform:uppercase;}
  .cover-pill{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${C.violet};background:#f3e8ff;border:1.5px solid #ddd6fe;padding:4px 13px;border-radius:20px;}
  .cover-title{font-family:'Playfair Display',Georgia,serif;font-size:52px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1.0;}
  .cover-title-accent{color:${C.violet};font-style:italic;}
  .cover-subtitle{font-size:15px;color:#6b7280;margin:12px 0 20px;}
  .cover-desc{font-size:12px;color:#9ca3af;line-height:1.85;border-left:3px solid #c4b5fd;padding-left:16px;max-width:380px;}
  .cover-kpi{background:rgba(255,255,255,0.75);border:1px solid rgba(255,255,255,0.9);border-radius:14px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;box-shadow:0 2px 12px rgba(139,92,246,0.07);}
  .ck-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.11em;color:#9ca3af;}
  .ck-value{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;line-height:1.1;}
  .ck-note{font-size:10px;color:#9ca3af;}
  .badge-good{background:#ddd6fe;color:#7c3aed;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;}
  .badge-warn{background:#fef3c7;color:#d97706;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;}
  .cover-bottom{border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center;}
  .cover-meta{display:flex;align-items:center;gap:12px;font-size:10px;color:#9ca3af;}
  .cover-confidential{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#a78bfa;border:1.5px solid #ddd6fe;padding:3px 10px;border-radius:20px;background:#faf5ff;}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-shadow:none!important;}
  div[data-print="section"]{break-before:page!important;page-break-before:always!important;break-inside:avoid!important;}
  div[style*="border-radius:16px"]{break-inside:avoid!important;border:1px solid #e5e7eb!important;margin-bottom:12px;}
  div[style*="1fr 1fr"],div[style*="repeat(3"],div[style*="repeat(4"]{break-inside:avoid!important;}
</style></head><body>
<div class="cover">
  <div class="cover-stripe"></div><div class="cover-left-bar"></div><div class="cover-bg"></div>
  <div class="cover-inner">
    <div class="cover-top">
      <span class="cover-company">WEEG Financial</span>
      <span class="cover-pill">Financial Report</span>
    </div>
    <div class="cover-main">
      <div>
        <h1 class="cover-title">Pricing &amp;<br/><span class="cover-title-accent">Profitability</span></h1>
        <p class="cover-subtitle">Complete Profit Analysis — ${selectedYear}${selectedBranch !== 'all' ? ` · ${selectedBranch}` : ''}</p>
        <p class="cover-desc">Sales quantity & revenue, profit margins, product & customer profitability, branch-level analysis — comprehensive view of your business profitability.</p>
      </div>
      <div>
        <div class="cover-kpi"><div><span class="ck-label">Total Revenue</span><p class="ck-value">${formatCurrency(totalRevenue)}</p><span class="ck-note">${selectedYear} · all branches</span></div><span class="badge-good">Revenue</span></div>
        <div class="cover-kpi"><div><span class="ck-label">Profit</span><p class="ck-value" style="color:${C.violet}">${formatCurrency(totalProfit)}</p><span class="ck-note">Total profit</span></div><span class="${profitMargin >= 20 ? 'badge-good' : 'badge-warn'}">${profitMargin.toFixed(1)}% ratio</span></div>
        <div class="cover-kpi"><div><span class="ck-label">Sales Quantity</span><p class="ck-value">${formatNumber(totalQty)}</p><span class="ck-note">Units sold</span></div></div>
        <div class="cover-kpi"><div><span class="ck-label">Avg Profit/Unit</span><p class="ck-value" style="font-size:16px;color:${C.indigo}">${formatCurrency(totalQty > 0 ? totalProfit / totalQty : 0)}</p><span class="ck-note">Per unit profit</span></div></div>
      </div>
    </div>
    <div class="cover-bottom">
      <div class="cover-meta">
        <span>Generated ${genDate}</span><span>·</span>
        <span>Year: ${selectedYear}</span><span>·</span>
        <span>${selectedBranch !== 'all' ? selectedBranch : availableBranches.length + ' branches'}</span><span>·</span>
        <span>${productProfitability.length} products tracked</span>
      </div>
      <span class="cover-confidential">Confidential</span>
    </div>
  </div>
</div>
${clone.outerHTML}
</body></html>`);
    doc.close();
    iframe.style.visibility = 'visible'; iframe.style.zIndex = '9999';
    const cleanup = () => { iframe.style.visibility = 'hidden'; setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500); };
    const triggerPrint = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.print(); } };
    iframe.onload = () => setTimeout(triggerPrint, 800);
    setTimeout(triggerPrint, 1800);
    if (iframe.contentWindow) { iframe.contentWindow.onafterprint = cleanup; setTimeout(cleanup, 90000); }
  };

  // ── Early states ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, minHeight: 400, justifyContent: 'center' }}>
      <Spin /><p style={{ fontSize: 14, color: css.mutedFg }}>Loading pricing & profitability data…</p>
    </div>
  );
  if (error) return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, color: C.rose }}>
      <AlertCircle size={18} />
      <span style={{ flex: 1, fontSize: 13 }}>{error}</span>
      <button onClick={fetchAll} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 9, border: `1px solid ${css.border}`, background: css.card, cursor: 'pointer', color: css.cardFg }}>Retry</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ══ REPORT HEADER ══ */}
      <div style={{ ...card, background: `linear-gradient(135deg, ${C.violet}08, ${C.indigo}05)`, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.violet}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} style={{ color: C.violet }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: css.fg, margin: 0, letterSpacing: '-0.03em' }}>Pricing & Profitability Report</h1>
              <p style={{ fontSize: 12, color: css.mutedFg, margin: '3px 0 0' }}>
                Year: <strong>{selectedYear}</strong> &nbsp;·&nbsp; {selectedBranch !== 'all' ? selectedBranch : `${availableBranches.length} branches`} &nbsp;·&nbsp; Profit Ratio: <strong>{profitMargin.toFixed(1)}%</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} />Refresh
            </button>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.violet}40`, background: `${C.violet}10`, color: C.violet, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={13} />Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 16, borderTop: `1px solid ${css.border}` }}>
          <StyledDropdown label="Year" options={yearOptions} value={selectedYear}
            onChange={v => setSelectedYear(v)}
            isOpen={openDropdown === 'year'} onToggle={() => setOpenDropdown(o => o === 'year' ? null : 'year')} onClose={() => setOpenDropdown(null)} />
          <StyledDropdown label="Branch" options={branchOptions} value={selectedBranch}
            onChange={v => setSelectedBranch(v)}
            isOpen={openDropdown === 'branch'} onToggle={() => setOpenDropdown(o => o === 'branch' ? null : 'branch')} onClose={() => setOpenDropdown(null)} />
        </div>
      </div>

      {/* ══ PRINTABLE CONTENT ══ */}
      <div id="ppr-printable">

        {/* ── GLOBAL KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }}>
          <KCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub={`${selectedYear} sales`} accent={C.indigo} Icon={TrendingUp} />
          <KCard label="Total Profit" value={formatCurrency(totalProfit)} sub="Revenue − Cost" accent={C.violet} Icon={DollarSign}
            badge={{ text: `${profitMargin.toFixed(1)}% ratio`, good: profitMargin >= 20 }} />
          <KCard label="Sales Quantity" value={formatNumber(totalQty)} sub="Total units sold" accent={C.cyan} Icon={Package} />
          <KCard label="Avg Profit/Unit" value={formatCurrency(totalQty > 0 ? totalProfit / totalQty : 0)} sub={`${selectedYear}`} accent={C.teal} Icon={Star} />
        </div>

        {/* ════════════════════════════════════════
            SECTION 1 — SALES & PROFIT ANALYSIS
        ════════════════════════════════════════ */}
        <div style={{ marginBottom: 52 }}>
          <SecHead n={1} title="Sales & Profit Analysis" sub="Sales quantity · total revenue · profit · profit ratio (by month & branch)" color={C.indigo} />

          {/* Sales & Profit KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <KCard label="Avg Monthly Revenue" value={formatCurrency(num(salesKPI?.sales_velocity?.avg_daily_revenue) * 30)} sub={`Over ${num(salesKPI?.sales_velocity?.n_days)} days`} accent={C.indigo} Icon={BarChart3} />
            <KCard label="Avg Monthly Qty" value={formatNumber(num(salesKPI?.sales_velocity?.avg_daily_qty) * 30)} sub="Units sold per month" accent={C.cyan} Icon={Package} />
            <KCard label="Profit Ratio" value={`${profitMargin.toFixed(1)}%`} sub="Overall profit margin" accent={C.violet} Icon={Target}
              badge={{ text: profitMargin >= 20 ? 'Healthy' : 'Monitor', good: profitMargin >= 20 }} />
          </div>

          {/* Monthly trend chart */}
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Monthly Sales, Profit & Quantity</h3>
            <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Revenue vs profit & sales quantity trend — {selectedYear}</p>
            {combinedMonthly.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={combinedMonthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pprRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.indigo} stopOpacity={0.2} /><stop offset="95%" stopColor={C.indigo} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pprProfitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.violet} stopOpacity={0.2} /><stop offset="95%" stopColor={C.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                  <XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
                  <RTooltip content={<Tip />} />
                  <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
                  <Area yAxisId="left" type="monotone" dataKey="sales" stroke={C.indigo} strokeWidth={2.5} fill="url(#pprRevGrad)" name="Sales" dot={false} />
                  <Area yAxisId="left" type="monotone" dataKey="profit" stroke={C.violet} strokeWidth={2} fill="url(#pprProfitGrad)" name="Profit" dot={false} />
                  <Bar dataKey="qty" name="Quantity" fill={C.cyan} fillOpacity={0.4} radius={[3, 3, 0, 0]} yAxisId="right" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Branch comparison */}
          {branchCompare.length > 0 && (
            <div style={{ ...card, marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Sales & Profit by Branch</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Branch-level comparison — {selectedYear}</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={branchCompare} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                  <XAxis dataKey="branch" tick={ax} axisLine={false} tickLine={false} />
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <RTooltip content={<Tip />} />
                  <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
                  <Bar dataKey="revenue" name="Revenue" fill={C.indigo} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill={C.violet} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — PRODUCT PROFITABILITY
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={2} title="Product Profitability" sub="Most & least profitable products · profit by product" color={C.violet} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <KCard label="Total Product Profit" value={formatCurrency(productProfitability.reduce((s: number, p: any) => s + p.profit, 0))} sub={`${productProfitability.length} products`} accent={C.violet} Icon={DollarSign} />
            <KCard label="Avg Product Profit Ratio" value={`${productProfitability.length > 0 ? (productProfitability.reduce((s: number, p: any) => s + p.profitRatio, 0) / productProfitability.length).toFixed(1) : 0}%`} sub="Across all products" accent={C.indigo} Icon={Target} />
            <KCard label="High-Profit Products" value={String(productProfitability.filter((p: any) => p.profitRatio >= 30).length)} sub="Profit ratio ≥ 30%" accent={C.emerald} Icon={Star} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Most profitable */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.emerald, margin: '0 0 4px' }}>🏆 Most Profitable Products</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Highest profit ratio — top performers</p>
              {topProfitProducts.length === 0 ? <Empty /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topProfitProducts.slice(0, 8).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: i < 3 ? `${C.emerald}08` : css.bg, border: `1px solid ${i < 3 ? C.emerald + '20' : css.border}` }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: i < 3 ? `${C.emerald}18` : css.muted, color: i < 3 ? C.emerald : css.mutedFg, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>{formatCurrency(p.profit)} profit</p>
                      </div>
                      <ProfitBadge value={p.profitRatio} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Least profitable */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.rose, margin: '0 0 4px' }}>⚠️ Low-Profit Products</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Lowest profit ratio — review pricing</p>
              {lowProfitProducts.length === 0 ? <Empty /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {lowProfitProducts.slice(0, 8).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: p.profitRatio < 10 ? `${C.rose}08` : css.bg, border: `1px solid ${p.profitRatio < 10 ? C.rose + '25' : css.border}` }}>
                      <AlertTriangle size={14} style={{ color: p.profitRatio < 10 ? C.rose : C.amber, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>{formatCurrency(p.profit)} profit</p>
                      </div>
                      <ProfitBadge value={p.profitRatio} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product profit distribution */}
          {productProfitability.length > 0 && (
            <div style={{ ...card, marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Profit Ratio Distribution</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Profit ratio across top products</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productProfitability.slice(0, 12)} margin={{ left: 0, right: 4, top: 4, bottom: 40 }} barCategoryGap="8%">
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={54} />
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <RTooltip content={<Tip isCurrency={false} />} />
                  <Bar dataKey="profitRatio" name="Profit %" radius={[5, 5, 0, 0]}>
                    {productProfitability.slice(0, 12).map((p: any, i: number) => (
                      <Cell key={i} fill={p.profitRatio >= 30 ? C.emerald : p.profitRatio >= 15 ? C.amber : C.rose} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════
            SECTION 3 — CUSTOMER PROFITABILITY
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={3} title="Customer Profitability" sub="Profit by customer · top profitable customers" color={C.rose} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <KCard label="Top Customer Profit" value={formatCurrency(topCustomers[0]?.profit ?? 0)} sub={topCustomers[0]?.name ?? '—'} accent={C.rose} Icon={Users} />
            <KCard label="Total Customer Profit" value={formatCurrency(topCustomers.reduce((s: number, c: any) => s + c.profit, 0))} sub="Top customers" accent={C.violet} Icon={DollarSign} />
            <KCard label="Tracked Customers" value={String(topCustomers.length)} sub="With profit data" accent={C.cyan} Icon={Users} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Top Customers by Profit</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Profit ranking — highest profit customers</p>
              {topCustomers.length === 0 ? <Empty /> : (
                <div>
                  {topCustomers.slice(0, 10).map((c: any, i: number) => (
                    <RankBar key={i} rank={i + 1} label={c.name} sub={`${formatNumber(c.txCount)} transactions · ${c.share.toFixed(1)}% of revenue`} value={c.profit} max={maxCustomerProfit} accent={c.color} />
                  ))}
                </div>
              )}
            </div>

            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Customer Profit Chart</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 10 }}>Bar chart by profit contribution</p>
              {topCustomers.length === 0 ? <Empty h={240} /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topCustomers.slice(0, 8)} layout="vertical" barCategoryGap="18%" margin={{ left: 0, right: 12, top: 2, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false} />
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <RTooltip content={<Tip />} />
                    <Bar dataKey="profit" name="Profit" radius={[0, 6, 6, 0]}>
                      {topCustomers.slice(0, 8).map((c: any, i: number) => <Cell key={i} fill={c.color} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 4 — BRANCH PROFITABILITY
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={4} title="Branch Profitability Analysis" sub="Most & least profitable products by branch · branch-level profit" color={C.orange} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Branch profit table */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Profit by Branch</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Profit contribution per branch — {selectedYear}</p>
              {branchCompare.length === 0 ? <Empty /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {branchCompare.map((b: any, i: number) => {
                    const share = num(b.profit) > 0 ? (b.profit / totalProfit) * 100 : 0;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: css.cardFg }}>{b.branch}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, color: css.mutedFg }}>{b.profitRatio.toFixed(1)}% ratio</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: b.color }}>{formatCurrency(b.profit)}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: `${b.color}18`, color: b.color }}>{share.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(100, (b.profit / (branchCompare[0]?.profit ?? 1)) * 100)}%`, background: `linear-gradient(90deg, ${b.color}70, ${b.color})`, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Branch profit trend */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Branch Profit Trend</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Profit evolution by branch — {selectedYear}</p>
              {branchMonthlySales.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={branchMonthlySales.slice(-12)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                    <XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} />
                    <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <RTooltip content={<Tip />} />
                    <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
                    {visibleSalesBranchNames.map((b) => (
                      <Line key={b} type="monotone" dataKey={b} stroke={BRANCH_PAL[salesBranchNames.indexOf(b) % BRANCH_PAL.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name={b} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Branch KPI summary table */}
          {branchCompare.length > 0 && (
            <div style={{ ...card, marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 16px' }}>Branch Profitability Summary</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${css.border}` }}>
                      {['Branch', 'Revenue', 'Profit', 'Profit Ratio', '% of Total', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: css.mutedFg }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branchCompare.map((b: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${css.border}`, background: i % 2 === 0 ? 'transparent' : `${css.muted}40` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: css.cardFg }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />{b.branch}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: C.indigo }}>{formatCurrency(b.revenue)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: b.color }}>{formatCurrency(b.profit)}</td>
                        <td style={{ padding: '10px 12px', color: css.cardFg }}><ProfitBadge value={b.profitRatio} /></td>
                        <td style={{ padding: '10px 12px', color: css.mutedFg }}>{pct(b.profit, totalProfit)}%</td>
                        <td style={{ padding: '10px 12px', color: css.cardFg }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: b.profitRatio >= 20 ? `${C.emerald}18` : `${C.amber}18`, color: b.profitRatio >= 20 ? C.emerald : C.amber }}>
                            {b.profitRatio >= 20 ? 'Healthy' : 'Monitor'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${css.border}`, background: `${C.violet}08` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: css.cardFg }}>TOTAL</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: C.indigo }}>{formatCurrency(totalRevenue)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: C.violet }}>{formatCurrency(totalProfit)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: C.violet }}>{profitMargin.toFixed(1)}%</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: C.violet }}>100%</td>
                      <td style={{ padding: '10px 12px' }} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
