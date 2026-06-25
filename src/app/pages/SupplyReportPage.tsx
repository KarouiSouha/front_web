import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  ShoppingCart, Package, AlertTriangle, RefreshCw,
  Loader2, ChevronDown, BarChart3, ArrowUpRight,
  Truck, AlertCircle, Printer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { formatCurrency, formatNumber } from '../lib/utils';

function getAuthHeaders() {
  const token = localStorage.getItem('fasi_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const C = {
  indigo:  '#6366f1', violet: '#8b5cf6', cyan:    '#0ea5e9',
  teal:    '#14b8a6', emerald:'#10b981', amber:   '#f59e0b',
  orange:  '#f97316', rose:   '#f43f5e',
};
const css = {
  card:    'hsl(var(--card))',    cardFg:  'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))', muted:   'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--background))',
  fg:      'hsl(var(--foreground))',
};
const card: React.CSSProperties = {
  background: css.card, borderRadius: 16, padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border: `1px solid ${css.border}`,
};
const ax = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

const PAL = [
  '#6366f1','#0ea5e9','#14b8a6','#10b981',
  '#f59e0b','#f43f5e','#8b5cf6','#f97316',
  '#0284c7','#db2777','#84cc16','#06b6d4',
];

function buildBranchColorMap(branches: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  [...branches].sort().forEach((b, i) => { map[b] = PAL[i % PAL.length]; });
  return map;
}

interface SupplyMeta {
  total_value: number; total_qty: number; unique_suppliers: number;
  unique_skus: number; total_transactions: number;
  years: string[]; branches: string[]; categories: string[];
}
interface MonthlyRow   { month: string; value: number; qty: number; count: number }
interface BranchRow    { branch: string; value: number; qty: number; count: number }
interface SupplierRow  { name: string; value: number; qty: number; count: number; sku_count: number }
interface CategoryRow  { name: string; value: number; qty: number; count: number }
interface BranchMonth  { branch: string; month: string; value: number; qty: number }
interface SupSKU       { supplier: string; items: { name: string; value: number; qty: number }[] }
interface LeadTime     { supplier: string; orders: number; avg_days: number }
interface SupplyData {
  meta: SupplyMeta; monthly: MonthlyRow[]; by_branch: BranchRow[];
  by_supplier: SupplierRow[]; by_category: CategoryRow[];
  branch_month: BranchMonth[]; supplier_skus: SupSKU[]; lead_times: LeadTime[];
}
interface StockProduct {
  material_code: string; product_name: string; category: string;
  stock_qty: number; stock_value: number; cost_price: number;
  qty_sold: number; monthly_usage: number; revenue: number;
  rotation_rate: number; coverage_days: number | null;
  min_stock: number; max_stock: number; reorder_qty: number;
  days_of_stock: number | null; status: 'out'|'critical'|'low'|'ok';
}
interface StockSummary {
  total_products: number; total_stock_value: number;
  zero_stock_count: number; critical_count: number; low_count: number;
  avg_rotation_rate: number;
}

function Dropdown({ label, options, value, onChange, isOpen, onToggle, onClose }: {
  label: string; options: { key: string; label: string }[];
  value: string; onChange: (v: string) => void;
  isOpen: boolean; onToggle: () => void; onClose: () => void;
}) {
  const ref    = useRef<HTMLDivElement>(null);
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

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 160 }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: css.mutedFg, marginBottom: 6 }}>{label}</p>
      <button ref={btnRef} onClick={onToggle}
        style={{ width: '100%', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: 8, color: css.mutedFg, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && createPortal(
        <div style={{ position: 'absolute', top: pos.top, left: pos.left, width: Math.max(pos.width, 220), zIndex: 9999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: 280, overflowY: 'auto', padding: 6 }}>
          {options.map(opt => (
            <button key={opt.key} onMouseDown={e => e.stopPropagation()} onClick={() => { onChange(opt.key); onClose(); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: value === opt.key ? `${C.indigo}15` : 'transparent', color: value === opt.key ? C.indigo : '#111827', fontWeight: value === opt.key ? 600 : 400, display: 'flex', justifyContent: 'space-between' }}>
              {opt.label}{value === opt.key && <span style={{ color: C.indigo }}>✓</span>}
            </button>
          ))}
        </div>, document.body
      )}
    </div>
  );
}

function KCard({ label, value, sub, accent, Icon }: { label:string; value:string; sub?:string; accent:string; Icon:React.ElementType }) {
  return (
    <div style={{ ...card, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-24, right:-24, width:80, height:80, borderRadius:'50%', background:accent, opacity:0.08, filter:'blur(20px)', pointerEvents:'none' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={17} style={{ color:accent }} />
        </div>
        <ArrowUpRight size={13} style={{ color:C.emerald }} />
      </div>
      <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:css.mutedFg, margin:0 }}>{label}</p>
      <p style={{ fontSize:20, fontWeight:800, color:css.cardFg, margin:'4px 0 0', letterSpacing:'-0.03em' }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:css.mutedFg, marginTop:4 }}>{sub}</p>}
    </div>
  );
}

function SH({ n, title, sub, color }: { n:number; title:string; sub?:string; color:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
      <div style={{ width:32, height:32, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:800, color }}>{n}</span>
      </div>
      <div>
        <h2 style={{ fontSize:15, fontWeight:800, color:css.fg, letterSpacing:'-0.02em', margin:0 }}>{title}</h2>
        {sub && <p style={{ fontSize:12, color:css.mutedFg, margin:0 }}>{sub}</p>}
      </div>
    </div>
  );
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'10px 14px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', fontSize:12 }}>
      <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#6b7280', marginBottom:6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:p.fill??p.color }} />
          <span style={{ color:'#6b7280' }}>{p.name}</span>
          <span style={{ marginLeft:'auto', paddingLeft:12, fontWeight:700, color:'#111' }}>
            {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Empty({ h=200, text='No data' }: { h?:number; text?:string }) {
  return <div style={{ height:h, display:'flex', alignItems:'center', justifyContent:'center', color:css.mutedFg, fontSize:13 }}>{text}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string,[string,string]> = {
    out:      [C.rose,    '🔴 Out of Stock'],
    critical: [C.orange,  '🟠 Critical'],
    low:      [C.amber,   '🟡 Low Stock'],
    ok:       [C.emerald, '🟢 OK'],
  };
  const [color, lbl] = cfg[status] ?? [css.mutedFg, status];
  return <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${color}18`, color, border:`1px solid ${color}35`, whiteSpace:'nowrap' }}>{lbl}</span>;
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export function SupplyReportPage() {
  const [supply,       setSupply]       = useState<SupplyData | null>(null);
  const [reorderList,  setReorderList]  = useState<StockProduct[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const [yearFilter,    setYearFilter]    = useState('2025');
  const [branchFilter,  setBranchFilter]  = useState('all');
  const [catFilter,     setCatFilter]     = useState('all');
  const [openDD,        setOpenDD]        = useState<string | null>(null);
  const [reorderPage,   setReorderPage]   = useState(1);
  const [reorderStatus, setReorderStatus] = useState('all');
  const REORDER_PAGE_SIZE = 20;

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const headers = getAuthHeaders();
      const [supRes, stockRes] = await Promise.all([
        axios.get('/api/kpi/supply/', { headers, params: { year: yearFilter, branch: branchFilter, category: catFilter } }),
        axios.get('/api/kpi/stock/',  { headers, params: { year: yearFilter === 'all' ? undefined : yearFilter } }),
      ]);
      setSupply(supRes.data as SupplyData);
      const reorderRaw: StockProduct[] = (stockRes.data.reorder_list ?? []).map((p: any) => ({
        material_code: p.material_code ?? '', product_name:  p.product_name  ?? '',
        category:      p.category      ?? '',
        stock_qty:     parseFloat(p.stock_qty)     || 0, stock_value:   parseFloat(p.stock_value)   || 0,
        cost_price:    parseFloat(p.cost_price)    || 0, qty_sold:      parseFloat(p.qty_sold)      || 0,
        monthly_usage: parseFloat(p.monthly_usage) || 0, revenue:       parseFloat(p.revenue)       || 0,
        rotation_rate: parseFloat(p.rotation_rate) || 0,
        coverage_days: p.coverage_days != null ? parseFloat(p.coverage_days) : null,
        min_stock:     parseInt(p.min_stock) || 0, max_stock: parseInt(p.max_stock) || 0,
        reorder_qty:   parseFloat(p.reorder_qty) || 0,
        days_of_stock: p.days_of_stock != null ? parseInt(p.days_of_stock) : null,
        status:        p.status ?? 'ok',
      }));
      setReorderList(reorderRaw);
      setStockSummary(stockRes.data.stock_summary ?? null);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message ?? 'Failed to load supply data');
    } finally { setLoading(false); }
  }, [yearFilter, branchFilter, catFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const meta         = supply?.meta;
  const monthly      = supply?.monthly       ?? [];
  const byBranch     = supply?.by_branch     ?? [];
  const bySupplier   = supply?.by_supplier   ?? [];
  const byCategory   = supply?.by_category   ?? [];
  const branchMonth  = supply?.branch_month  ?? [];
  const supplierSKUs = supply?.supplier_skus ?? [];
  const leadTimes    = supply?.lead_times    ?? [];

  const branchColorMap = useMemo(() => {
    const allBranchNames = [
      ...new Set([
        ...(meta?.branches ?? []),
        ...byBranch.map(b => b.branch),
        ...branchMonth.map(r => r.branch),
      ])
    ].filter(Boolean);
    return buildBranchColorMap(allBranchNames);
  }, [meta?.branches, byBranch, branchMonth]);

  const branchColor = (name: string) => branchColorMap[name] ?? PAL[0];

  const allMonths   = [...new Set(branchMonth.map(r => r.month))].sort();
  const allBranches = [...new Set(branchMonth.map(r => r.branch))].sort();

  const bxmPivot: Record<string, Record<string, number>> = {};
  branchMonth.forEach(r => {
    if (!bxmPivot[r.branch]) bxmPivot[r.branch] = {};
    bxmPivot[r.branch][r.month] = r.value;
  });
  const bxmChartData = allMonths.map(month => {
    const obj: any = { month };
    allBranches.forEach(b => { obj[b] = bxmPivot[b]?.[month] ?? 0; });
    return obj;
  });

  const outCount      = stockSummary?.zero_stock_count ?? 0;
  const criticalCount = stockSummary?.critical_count   ?? 0;
  const lowCount      = stockSummary?.low_count        ?? 0;

  const reorderFiltered = reorderStatus === 'all' ? reorderList : reorderList.filter(i => i.status === reorderStatus);
  const reorderSorted   = [...reorderFiltered].sort((a,b) => {
    const o: Record<string,number> = { out:0, critical:1, low:2, ok:3 };
    return o[a.status] - o[b.status];
  });
  const reorderStart   = (reorderPage - 1) * REORDER_PAGE_SIZE;
  const reorderPaged   = reorderSorted.slice(reorderStart, reorderStart + REORDER_PAGE_SIZE);
  const reorderTotal   = reorderSorted.length;
  const itemsWithUsage = reorderList.filter(i => i.monthly_usage > 0).length;

  const yearOptions   = [{ key:'all', label:'All Years' },     ...(meta?.years      ?? []).map(y => ({ key:y, label:y }))];
  const branchOptions = [{ key:'all', label:'All Branches' },  ...(meta?.branches   ?? []).sort().map(b => ({ key:b, label:b }))];
  const catOptions    = [{ key:'all', label:'All Categories' },...(meta?.categories ?? []).sort().map(c => ({ key:c, label:c }))];

  const totalValue = meta?.total_value ?? 0;
  const mostActiveMonth = monthly.length
    ? monthly.reduce((a, b) => b.value > a.value ? b : a).month : '—';

  // ── Print Report ─────────────────────────────────────────────
  const printReport = () => {
    const printable = document.getElementById('spr-printable');
    if (!printable) return;

    const clone = printable.cloneNode(true) as HTMLElement;

    const resolveVars = (el: HTMLElement) => {
      if (el.style?.cssText) {
        el.style.cssText = el.style.cssText
          .replace(/hsl\(var\(--card\)\)/g,              '#ffffff')
          .replace(/hsl\(var\(--card-foreground\)\)/g,   '#111827')
          .replace(/hsl\(var\(--border\)\)/g,            '#e5e7eb')
          .replace(/hsl\(var\(--muted\)\)/g,             '#f3f4f6')
          .replace(/hsl\(var\(--muted-foreground\)\)/g,  '#6b7280')
          .replace(/hsl\(var\(--background\)\)/g,        '#ffffff')
          .replace(/hsl\(var\(--foreground\)\)/g,        '#111827');
      }
      Array.from(el.children).forEach(c => resolveVars(c as HTMLElement));
    };
    resolveVars(clone);

    const fC  = formatCurrency;
    const fN  = formatNumber;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    const totalAlerts = outCount + criticalCount + lowCount;

    const PRINT_CSS = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
      *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', sans-serif; background: #fff; color: #111827; padding: 16px 20px; font-size: 13px; }
      @page { size: A4 landscape; margin: 8mm 10mm; }
      div[style*="border-radius:16px"], div[style*="border-radius: 16px"],
      div[style*="border-radius:14px"], div[style*="border-radius: 14px"],
      div[style*="border-radius:12px"], div[style*="border-radius: 12px"],
      div[style*="border-radius:11px"], div[style*="border-radius: 11px"] {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        border: 1px solid #e5e7eb !important;
        margin-bottom: 12px;
      }
      .recharts-wrapper, .recharts-responsive-container {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      div[style*="1fr 1fr"], div[style*="repeat(3"],
      div[style*="repeat(4"], div[style*="grid-template"],
      div[style*="display: grid"], div[style*="display:grid"] {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      [data-no-break] { break-inside: avoid !important; page-break-inside: avoid !important; }
      div[data-print="section"] {
        break-before: page !important;
        page-break-before: always !important;
        break-inside: avoid !important;
      }
      table { break-inside: avoid !important; page-break-inside: avoid !important; }
      tr    { break-inside: avoid !important; page-break-inside: avoid !important; }
      .cover {
        width: 100%; height: 190mm;
        display: grid;
        break-after: page !important;
        page-break-after: always !important;
        position: relative; overflow: hidden;
      }
      .cover-stripe {
        position: absolute; top: 0; left: 0; right: 0; height: 5px;
        background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 45%, #0ea5e9 100%);
        z-index: 3;
      }
      .cover-left-bar {
        position: absolute; top: 0; left: 0; width: 5px; height: 100%;
        background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 55%, #0ea5e9 100%);
        z-index: 3;
      }
      .cover-bg {
        position: absolute; top: 0; right: 0; width: 52%; height: 100%;
        background: linear-gradient(148deg, #eef2ff 0%, #e0e7ff 40%, #c7d2fe 80%, #a5b4fc 100%);
        clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);
        z-index: 0;
      }
      .cover-inner {
        position: relative; z-index: 4;
        display: grid; grid-template-rows: auto 1fr auto;
        height: 100%; padding: 28px 48px 26px;
      }
      .cover-top {
        display: flex; align-items: center; justify-content: space-between;
        padding-bottom: 18px; border-bottom: 1px solid #e5e7eb;
      }
      .cover-company { font-size: 12px; font-weight: 700; color: #374151; letter-spacing: 0.08em; text-transform: uppercase; }
      .cover-pill {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.12em; color: #6366f1; background: #eef2ff;
        border: 1.5px solid #c7d2fe; padding: 4px 13px; border-radius: 20px;
      }
      .cover-main { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; padding: 24px 0 20px; }
      .cover-title { font-family: 'Playfair Display', Georgia, serif; font-size: 52px; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; line-height: 1.0; }
      .cover-title-accent { color: #6366f1; font-style: italic; }
      .cover-subtitle { font-size: 15px; color: #6b7280; margin: 12px 0 20px; }
      .cover-desc { font-size: 12px; color: #9ca3af; line-height: 1.85; border-left: 3px solid #c7d2fe; padding-left: 16px; max-width: 380px; }
      .cover-kpi {
        background: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.9);
        border-radius: 14px; padding: 14px 18px;
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 10px; box-shadow: 0 2px 12px rgba(99,102,241,0.07);
      }
      .ck-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.11em; color: #9ca3af; }
      .ck-value { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0f172a; line-height: 1.1; }
      .ck-note  { font-size: 10px; color: #9ca3af; }
      .badge-ok   { background: #d1fae5; color: #059669; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
      .badge-warn { background: #fef3c7; color: #d97706; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
      .badge-err  { background: #fee2e2; color: #dc2626; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
      .badge-info { background: #eef2ff; color: #6366f1; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
      .cover-bottom { border-top: 1px solid #e5e7eb; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; }
      .cover-meta   { display: flex; align-items: center; gap: 12px; font-size: 10px; color: #9ca3af; }
      .cover-confidential {
        font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em;
        color: #6366f1; border: 1.5px solid #c7d2fe; padding: 3px 10px;
        border-radius: 20px; background: #eef2ff;
      }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-shadow: none !important; }
    `;

    const alertBadgeClass = (outCount + criticalCount) > 0 ? 'badge-err' : totalAlerts > 0 ? 'badge-warn' : 'badge-ok';
    const alertBadgeText  = (outCount + criticalCount) > 0 ? '⚠ Action Required' : totalAlerts > 0 ? '⚠ Low Stock' : '✓ Stock OK';

    const coverHTML = `
  <div class="cover">
    <div class="cover-stripe"></div>
    <div class="cover-left-bar"></div>
    <div class="cover-bg"></div>
    <div class="cover-inner">
      <div class="cover-top">
        <span class="cover-company">WEEG Financial · Supply Division</span>
        <span class="cover-pill">Supply Report</span>
      </div>
      <div class="cover-main">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:14px;">
            Supply Chain Management
          </div>
          <h1 class="cover-title">
            Supply<br/><span class="cover-title-accent">Policy</span><br/>Report
          </h1>
          <p class="cover-subtitle">
            ${yearFilter === 'all' ? 'All Years' : yearFilter}${branchFilter !== 'all' ? ' · ' + branchFilter : ''}${catFilter !== 'all' ? ' · ' + catFilter : ''}
          </p>
          <p class="cover-desc">
            Purchases (ف شراء) · Supplier performance &amp; lead times ·
            Stock levels · Reorder recommendations across ${meta?.branches?.length ?? 0} branches.
          </p>
          <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
            <span class="badge-info">${meta?.total_transactions ?? 0} invoices</span>
            <span class="badge-ok">${fN(meta?.unique_suppliers ?? 0)} suppliers</span>
            <span class="${alertBadgeClass}">${totalAlerts} stock alerts</span>
          </div>
        </div>
        <div>
          <div class="cover-kpi">
            <div>
              <span class="ck-label">Total Purchase Value</span>
              <p class="ck-value" style="color:#6366f1;">${fC(meta?.total_value ?? 0)}</p>
              <span class="ck-note">${meta?.total_transactions ?? 0} invoices · ${meta?.unique_skus ?? 0} SKUs</span>
            </div>
            <span class="badge-info">Purchases</span>
          </div>
          <div class="cover-kpi">
            <div>
              <span class="ck-label">Active Suppliers</span>
              <p class="ck-value" style="color:#14b8a6;">${fN(meta?.unique_suppliers ?? 0)}</p>
              <span class="ck-note">Unique vendor names</span>
            </div>
            <span class="badge-ok">Vendors</span>
          </div>
          <div class="cover-kpi">
            <div>
              <span class="ck-label">Most Active Month</span>
              <p class="ck-value" style="color:#10b981;font-size:22px;">${mostActiveMonth}</p>
              <span class="ck-note">Highest purchase value</span>
            </div>
            <span class="badge-ok">Peak</span>
          </div>
          <div class="cover-kpi">
            <div>
              <span class="ck-label">Stock Alerts</span>
              <p class="ck-value" style="color:${(outCount + criticalCount) > 0 ? '#f97316' : '#10b981'};">
                ${totalAlerts}
              </p>
              <span class="ck-note">${outCount} out · ${criticalCount} critical · ${lowCount} low</span>
            </div>
            <span class="${alertBadgeClass}">${alertBadgeText}</span>
          </div>
        </div>
      </div>
      <div class="cover-bottom">
        <div class="cover-meta">
          <span>Generated ${today}</span>
          <span>·</span>
          <span>${meta?.branches?.length ?? 0} branches · ${fN(meta?.unique_suppliers ?? 0)} suppliers</span>
          <span>·</span>
          <span>Period: ${yearFilter === 'all' ? 'All Years' : yearFilter}</span>
        </div>
        <span class="cover-confidential">Confidential</span>
      </div>
    </div>
  </div>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;

    doc.open();
    doc.write(`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>Supply Policy Report — ${yearFilter === 'all' ? 'All Years' : yearFilter}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
    <style>${PRINT_CSS}</style>
  </head>
  <body>
    ${coverHTML}
    ${clone.outerHTML}
  </body>
  </html>`);
    doc.close();

    iframe.style.visibility = 'visible';
    iframe.style.zIndex = '9999';

    const cleanup = () => {
      iframe.style.visibility = 'hidden';
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500);
    };

    const triggerPrint = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
      catch { window.print(); }
    };

    iframe.onload = () => setTimeout(triggerPrint, 800);
    setTimeout(triggerPrint, 1800);

    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = cleanup;
      setTimeout(cleanup, 90000);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ background:css.bg, minHeight:'100vh', padding:'32px 28px', display:'flex', flexDirection:'column', gap:28 }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        minWidth: 0,
      }}>
        {/* Left: title + subtitle — flex:1 + minWidth:0 pour laisser la place aux boutons */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: css.fg,
            letterSpacing: '-0.03em', margin: 0,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${C.indigo}18`,
              display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              <Truck size={18} style={{ color: C.indigo }} />
            </span>
            Supply Policy Report
          </h1>
          <p style={{ fontSize: 13, color: css.mutedFg, margin: '4px 0 0' }}>
            Purchases (ف شراء) · Supplier performance · Stock levels · Reorder recommendations
          </p>
        </div>

        {/* Right: boutons — flexShrink:0 garantit qu'ils ne disparaissent jamais */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          flexShrink: 0,
          flexWrap: 'nowrap',
          alignItems: 'center',
        }}>
          {/* Refresh */}
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px', borderRadius: 10,
              border: `1px solid ${css.border}`,
              background: css.card, color: css.cardFg,
              fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />
            }
            Refresh
          </button>

          {/* Print Report */}
          <button
            onClick={printReport}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 16px', borderRadius: 10,
              border: `1.5px solid ${C.cyan}`,
              background: `${C.cyan}15`, color: C.cyan,
              fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Printer size={14} />
            Print Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={card}>
        <h3 style={{ fontSize:14, fontWeight:700, color:css.cardFg, margin:'0 0 14px' }}>
          Filters <span style={{ fontSize:12, fontWeight:400, color:css.mutedFg, marginLeft:8 }}>— sent to server, all sections update</span>
        </h3>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <Dropdown label="Year"     options={yearOptions}   value={yearFilter}   onChange={v=>{setYearFilter(v);   setReorderPage(1);}} isOpen={openDD==='year'}   onToggle={()=>setOpenDD(o=>o==='year'  ?null:'year')}   onClose={()=>setOpenDD(null)} />
          <Dropdown label="Branch"   options={branchOptions} value={branchFilter} onChange={v=>{setBranchFilter(v); setReorderPage(1);}} isOpen={openDD==='branch'} onToggle={()=>setOpenDD(o=>o==='branch'?null:'branch')} onClose={()=>setOpenDD(null)} />
          <Dropdown label="Category" options={catOptions}    value={catFilter}    onChange={v=>{setCatFilter(v);    setReorderPage(1);}} isOpen={openDD==='cat'}    onToggle={()=>setOpenDD(o=>o==='cat'   ?null:'cat')}    onClose={()=>setOpenDD(null)} />
        </div>
      </div>

      {error && (
        <div style={{ ...card, display:'flex', alignItems:'center', gap:10, color:C.rose }}>
          <AlertCircle size={16} />
          <span style={{ fontSize:13 }}>{error}</span>
        </div>
      )}

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:64, gap:12 }}>
          <Loader2 size={20} className="animate-spin" style={{ color:C.indigo }} />
          <span style={{ fontSize:14, color:css.mutedFg }}>Loading supply data…</span>
        </div>
      )}

      {!loading && !error && supply && (
        <div id="spr-printable" style={{ display:'flex', flexDirection:'column', gap:28 }}>

          {/* §1 — KPIs */}
          <div>
            <SH n={1} title="Total Purchase Overview" sub={`${meta?.total_transactions??0} transactions · ${yearFilter==='all'?'all years':yearFilter}`} color={C.indigo} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              <KCard label="Total Purchase Value" value={formatCurrency(meta?.total_value??0)} sub={`${meta?.total_transactions??0} invoices`} accent={C.indigo} Icon={ShoppingCart} />
              <KCard label="Total Qty Received"   value={formatNumber(Math.round(meta?.total_qty??0))} sub={`${meta?.unique_skus??0} distinct SKUs`} accent={C.cyan} Icon={Package} />
              <KCard label="Active Suppliers"     value={formatNumber(meta?.unique_suppliers??0)} sub="Unique vendor names" accent={C.teal} Icon={Truck} />
              <KCard label="Stock Alerts"         value={String(outCount+criticalCount+lowCount)} sub={`${outCount} out · ${criticalCount} critical · ${lowCount} low`} accent={C.rose} Icon={AlertTriangle} />
            </div>
          </div>

          {/* §2 — Categories */}
          <div>
            <SH n={2} title="Purchase Value by Category" sub="Top categories (الفهرس)" color={C.teal} />
            <div style={card}>
              {byCategory.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byCategory.slice(0,8).map((c,i)=>({name:c.name,value:c.value,color:PAL[i%PAL.length]}))} layout="vertical" margin={{left:0,right:80,top:4,bottom:4}}>
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false} />
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={150} tick={{fontSize:11,fill:css.mutedFg}} axisLine={false} tickLine={false} />
                    <RTooltip content={<Tip />} />
                    <Bar dataKey="value" name="Value" radius={[0,5,5,0]}>
                      {byCategory.slice(0,8).map((_,i)=><Cell key={`cat-${i}`} fill={PAL[i%PAL.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* §3 — Branch × Month */}
          <div>
            <SH n={3} title="Branch Purchase Analysis" sub="Monthly purchase value by branch" color={C.cyan} />
            <div style={card}>
              <h3 style={{ fontSize:14, fontWeight:700, color:css.cardFg, margin:'0 0 4px' }}>Monthly Value by Branch</h3>
              <p style={{ fontSize:12, color:css.mutedFg, marginBottom:16 }}>{allBranches.length} branches · {allMonths.length} months</p>
              {bxmChartData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={bxmChartData} margin={{top:4,right:4,left:0,bottom:4}}>
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                    <XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} />
                    <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                    <RTooltip content={<Tip />} />
                    <Legend wrapperStyle={{fontSize:11}} iconType="circle" iconSize={8} />
                    {allBranches.map((b)=>(
                      <Line key={`line-${b}`} type="monotone" dataKey={b} stroke={branchColor(b)} strokeWidth={2} dot={false} activeDot={{r:4,strokeWidth:0}} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{...card, marginTop:16}}>
              <h3 style={{ fontSize:14, fontWeight:700, color:css.cardFg, margin:'0 0 4px' }}>Branch · Month Detail</h3>
              <p style={{ fontSize:12, color:css.mutedFg, marginBottom:14 }}>Last 6 months</p>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:css.muted }}>
                      <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:css.mutedFg, borderBottom:`2px solid ${css.border}`, fontSize:11, textTransform:'uppercase', whiteSpace:'nowrap' }}>Branch</th>
                      {allMonths.slice(-6).map(m=>(
                        <th key={`hdr-${m}`} colSpan={2} style={{ padding:'8px 12px', textAlign:'center', fontWeight:700, color:css.mutedFg, borderBottom:`2px solid ${css.border}`, fontSize:11, textTransform:'uppercase', whiteSpace:'nowrap' }}>{m}</th>
                      ))}
                    </tr>
                    <tr style={{ background:`${css.muted}60` }}>
                      <th style={{ padding:'4px 12px', borderBottom:`1px solid ${css.border}` }} />
                      {allMonths.slice(-6).map(m=>(
                        <th key={`sub-${m}`} colSpan={2} style={{ padding:'4px 10px', borderBottom:`1px solid ${css.border}`, fontSize:10, color:css.mutedFg, textAlign:'center', fontWeight:600 }}>Qty / Value</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allBranches.map((branch,bi)=>{
                      const bc = branchColor(branch);
                      return (
                        <tr key={`row-${branch}`} style={{ background:bi%2===0?'transparent':`${css.muted}40` }}>
                          <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ width:8, height:8, borderRadius:'50%', background:bc, flexShrink:0 }} />
                              <span style={{ fontWeight:600, color:css.cardFg }}>{branch}</span>
                            </span>
                          </td>
                          {allMonths.slice(-6).map(m=>{
                            const d = branchMonth.find(r=>r.branch===branch && r.month===m);
                            return (
                              <td key={`cell-${branch}-${m}`} colSpan={2} style={{ padding:'8px 10px', textAlign:'right' }}>
                                {d ? (
                                  <span>
                                    <span style={{ color:css.cardFg, fontWeight:600 }}>{formatNumber(Math.round(d.qty))}</span>
                                    <span style={{ color:css.mutedFg, margin:'0 4px' }}>/</span>
                                    <span style={{ color:C.indigo, fontWeight:700 }}>{formatCurrency(d.value)}</span>
                                  </span>
                                ) : <span style={{ color:css.mutedFg }}>—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* §4 — Supplier Performance */}
          <div>
            <SH n={4} title="Supplier Performance" sub="Ranked by total purchase value · العميل field on purchase invoices" color={C.amber} />
            <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16 }}>
              <div style={{...card, alignSelf:'start'}}>
                <h3 style={{ fontSize:14, fontWeight:700, color:css.cardFg, margin:'0 0 16px' }}>Top {bySupplier.length} Suppliers</h3>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:css.muted }}>
                        {['#','Supplier','SKUs','Total Value','% Share'].map(h=>(
                          <th key={h} style={{ padding:'7px 10px', textAlign:h==='Supplier'?'left':'right', fontSize:10, fontWeight:700, color:css.mutedFg, borderBottom:`2px solid ${css.border}`, textTransform:'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bySupplier.map((s,i)=>{
                        const share = totalValue > 0 ? (s.value/totalValue*100).toFixed(1) : '0';
                        const color = PAL[i%PAL.length];
                        return (
                          <tr key={`sup-${i}`} style={{ background:i%2===0?'transparent':`${css.muted}40` }}>
                            <td style={{ padding:'7px 10px', textAlign:'right', color:css.mutedFg, fontWeight:700 }}>{i+1}</td>
                            <td style={{ padding:'7px 10px', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:600, color:css.cardFg }} title={s.name}>
                              {s.name.length>40?s.name.slice(0,40)+'…':s.name}
                            </td>
                            <td style={{ padding:'7px 10px', textAlign:'right', color:css.mutedFg }}>{s.sku_count}</td>
                            <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:800, color:css.cardFg }}>{formatCurrency(s.value)}</td>
                            <td style={{ padding:'7px 10px', textAlign:'right' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                                <div style={{ width:40, height:4, borderRadius:999, background:css.muted }}>
                                  <div style={{ height:'100%', borderRadius:999, width:`${Math.min(100,parseFloat(share))}%`, background:color }} />
                                </div>
                                <span style={{ fontWeight:700, color, fontSize:11 }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{...card, alignSelf:'start'}}>
                <h3 style={{ fontSize:14, fontWeight:700, color:css.cardFg, margin:'0 0 4px' }}>Top 5 by Value</h3>
                <p style={{ fontSize:12, color:css.mutedFg, marginBottom:14 }}>Purchase value concentration</p>
                {bySupplier.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={bySupplier.slice(0,5).map((s,i)=>({name:s.name.length>22?s.name.slice(0,22)+'…':s.name,value:s.value,color:PAL[i]}))} layout="vertical" margin={{left:0,right:60,top:4,bottom:4}}>
                      <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false} />
                      <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={140} tick={{fontSize:10,fill:css.mutedFg}} axisLine={false} tickLine={false} />
                      <RTooltip content={<Tip />} />
                      <Bar dataKey="value" name="Purchase Value" radius={[0,5,5,0]}>
                        {bySupplier.slice(0,5).map((_,i)=><Cell key={`sb-${i}`} fill={PAL[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div style={{...card, marginTop:16}}>
              <h3 style={{ fontSize:14, fontWeight:700, color:css.cardFg, margin:'0 0 4px' }}>Supplier × Top SKUs</h3>
              <p style={{ fontSize:12, color:css.mutedFg, marginBottom:16 }}>Top 5 items per top 10 suppliers</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
                {supplierSKUs.map((s,si)=>(
                  <div key={`ssku-${si}`} style={{ padding:14, borderRadius:12, background:css.bg, border:`1px solid ${css.border}` }}>
                    <p style={{ fontSize:12, fontWeight:700, color:css.cardFg, marginBottom:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={s.supplier}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:PAL[si%PAL.length], display:'inline-block', marginRight:6 }} />
                      {s.supplier.length>40?s.supplier.slice(0,40)+'…':s.supplier}
                    </p>
                    {s.items.length===0 ? <span style={{fontSize:11,color:css.mutedFg}}>No items</span> : (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                        <thead><tr>
                          <th style={{ textAlign:'left',  color:css.mutedFg, padding:'2px 0', fontWeight:600 }}>Item</th>
                          <th style={{ textAlign:'right', color:css.mutedFg, padding:'2px 0', fontWeight:600 }}>Qty</th>
                          <th style={{ textAlign:'right', color:css.mutedFg, padding:'2px 0', fontWeight:600 }}>Value</th>
                        </tr></thead>
                        <tbody>
                          {s.items.map((item,ii)=>(
                            <tr key={`sku-${si}-${ii}`} style={{ borderTop:`1px solid ${css.border}` }}>
                              <td style={{ padding:'4px 0', color:css.cardFg, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={item.name}>
                                {item.name.length>30?item.name.slice(0,30)+'…':item.name}
                              </td>
                              <td style={{ padding:'4px 0', textAlign:'right', color:css.mutedFg }}>{formatNumber(Math.round(item.qty))}</td>
                              <td style={{ padding:'4px 0', textAlign:'right', fontWeight:700, color:C.indigo }}>{formatCurrency(item.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* §5 — Lead Time */}
          <div>
            <SH n={5} title="Supplier Lead Time" sub="Average days between purchase orders per supplier" color={C.violet} />
            <div style={card}>
              {leadTimes.filter(s=>s.avg_days>0).length===0 ? <Empty text="Not enough orders to calculate lead time" /> : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:css.muted }}>
                        {['Supplier','Orders','Avg Days Between Orders','Frequency'].map(h=>(
                          <th key={h} style={{ padding:'7px 12px', textAlign:h==='Supplier'?'left':'right', fontSize:10, fontWeight:700, color:css.mutedFg, borderBottom:`2px solid ${css.border}`, textTransform:'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leadTimes.filter(s=>s.avg_days>0).map((s,i)=>{
                        const freq = s.avg_days<=7?{label:'Weekly',color:C.emerald}:s.avg_days<=14?{label:'Bi-weekly',color:C.teal}:s.avg_days<=31?{label:'Monthly',color:C.amber}:s.avg_days<=90?{label:'Quarterly',color:C.orange}:{label:'Rare',color:C.rose};
                        return (
                          <tr key={`lt-${i}`} style={{ background:i%2===0?'transparent':`${css.muted}40` }}>
                            <td style={{ padding:'7px 12px', fontWeight:600, color:css.cardFg, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={s.supplier}>
                              {s.supplier.length>55?s.supplier.slice(0,55)+'…':s.supplier}
                            </td>
                            <td style={{ padding:'7px 12px', textAlign:'right', color:css.mutedFg }}>{s.orders}</td>
                            <td style={{ padding:'7px 12px', textAlign:'right' }}>
                              <span style={{ fontSize:14, fontWeight:800, color:C.indigo }}>{s.avg_days}</span>
                              <span style={{ fontSize:11, color:css.mutedFg, marginLeft:4 }}>days</span>
                            </td>
                            <td style={{ padding:'7px 12px', textAlign:'right' }}>
                              <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${freq.color}18`, color:freq.color, border:`1px solid ${freq.color}35` }}>{freq.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* §6 — Inventory */}
          <div>
            <SH n={6} title="Current Inventory Levels" sub={`${stockSummary?.total_products??0} products · from /api/kpi/stock/`} color={C.emerald} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              <KCard label="Total Stock Value" value={formatCurrency(stockSummary?.total_stock_value??0)} sub={`${stockSummary?.total_products??0} SKUs`} accent={C.emerald} Icon={Package} />
              <KCard label="Out of Stock"      value={String(outCount)}      sub="Zero quantity"          accent={C.rose}   Icon={AlertTriangle} />
              <KCard label="Critical Stock"    value={String(criticalCount)} sub="Below min level"        accent={C.orange} Icon={AlertTriangle} />
              <KCard label="Low Stock"         value={String(lowCount)}      sub="Below safety threshold" accent={C.amber}  Icon={AlertTriangle} />
            </div>
          </div>

          {/* §7 — Reorder */}
          <div>
            <SH n={7} title="Replenishment & Reorder Analysis" sub={`${itemsWithUsage} of ${reorderList.length} products have sales velocity data`} color={C.rose} />
            <div style={card}>
              <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:11, color:css.mutedFg, fontWeight:600 }}>Filter:</span>
                {([
                  {key:'all',      label:'All',             count:reorderList.length,                                  color:C.indigo},
                  {key:'out',      label:'🔴 Out of Stock', count:reorderList.filter(i=>i.status==='out').length,      color:C.rose},
                  {key:'critical', label:'🟠 Critical',     count:reorderList.filter(i=>i.status==='critical').length, color:C.orange},
                  {key:'low',      label:'🟡 Low Stock',    count:reorderList.filter(i=>i.status==='low').length,      color:C.amber},
                  {key:'ok',       label:'🟢 OK',           count:reorderList.filter(i=>i.status==='ok').length,       color:C.emerald},
                ] as const).map(b=>(
                  <button key={`filter-${b.key}`} onClick={()=>{setReorderStatus(b.key);setReorderPage(1);}}
                    style={{ fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:20, cursor:'pointer', border:`1.5px solid ${b.color}40`, background:reorderStatus===b.key?b.color:`${b.color}12`, color:reorderStatus===b.key?'#fff':b.color }}>
                    {b.label}: {b.count}
                  </button>
                ))}
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:css.muted }}>
                      {['Product','Category','Current Stock','Min Level','Max Level','Monthly Usage','Days of Stock','Reorder Qty','Status'].map(h=>(
                        <th key={`th-${h}`} style={{ padding:'8px 10px', textAlign:['Product','Category'].includes(h)?'left':'right', fontSize:10, fontWeight:700, color:css.mutedFg, borderBottom:`2px solid ${css.border}`, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reorderPaged.map((item,i)=>{
                      const hasUsage = item.monthly_usage > 0;
                      return (
                        <tr key={`reorder-${item.material_code}-${i}`} style={{ background:i%2===0?'transparent':`${css.muted}40` }}>
                          <td style={{ padding:'7px 10px', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            <div style={{ fontWeight:600, color:css.cardFg }}>{item.product_name.length>32?item.product_name.slice(0,32)+'…':item.product_name}</div>
                            <div style={{ fontSize:10, color:css.mutedFg, fontFamily:'monospace' }}>{item.material_code}</div>
                          </td>
                          <td style={{ padding:'7px 10px' }}><span style={{ fontSize:10, color:css.mutedFg }}>{item.category||'—'}</span></td>
                          <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:800, color:item.stock_qty===0?C.rose:item.stock_qty<=item.min_stock?C.orange:css.cardFg }}>{formatNumber(Math.round(item.stock_qty))}</td>
                          <td style={{ padding:'7px 10px', textAlign:'right', color:hasUsage?css.cardFg:css.mutedFg, fontWeight:hasUsage?600:400 }}>{hasUsage?formatNumber(item.min_stock):'—'}</td>
                          <td style={{ padding:'7px 10px', textAlign:'right', color:hasUsage?css.cardFg:css.mutedFg, fontWeight:hasUsage?600:400 }}>{hasUsage?formatNumber(item.max_stock):'—'}</td>
                          <td style={{ padding:'7px 10px', textAlign:'right', color:hasUsage?css.cardFg:css.mutedFg }}>{hasUsage?formatNumber(item.monthly_usage):'—'}</td>
                          <td style={{ padding:'7px 10px', textAlign:'right' }}>
                            {item.days_of_stock!==null?<span style={{ fontWeight:700, color:item.days_of_stock<=14?C.rose:item.days_of_stock<=30?C.amber:C.emerald }}>{item.days_of_stock}d</span>:<span style={{ color:css.mutedFg }}>—</span>}
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'right' }}>
                            {item.reorder_qty>0?<span style={{ fontWeight:800, color:C.indigo }}>{formatNumber(item.reorder_qty)}</span>:<span style={{ color:css.mutedFg }}>—</span>}
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'right' }}><StatusBadge status={item.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16, paddingTop:14, borderTop:`1px solid ${css.border}` }}>
                <span style={{ fontSize:12, color:css.mutedFg }}>
                  {reorderTotal} products · Page {reorderPage} / {Math.max(1,Math.ceil(reorderTotal/REORDER_PAGE_SIZE))}
                  {itemsWithUsage>0 && <span style={{ marginLeft:8, color:C.emerald }}>· {itemsWithUsage} with usage data</span>}
                </span>
                <div style={{ display:'flex', gap:8 }}>
                  {(['←','→'] as const).map((lbl,idx)=>{
                    const disabled = idx===0?reorderPage===1:reorderPage>=Math.ceil(reorderTotal/REORDER_PAGE_SIZE);
                    return (
                      <button key={lbl} onClick={()=>setReorderPage(p=>p+(idx===0?-1:1))} disabled={disabled}
                        style={{ width:32, height:32, borderRadius:8, border:`1px solid ${css.border}`, background:css.card, color:disabled?css.mutedFg:css.cardFg, cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.4:1, fontSize:14 }}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div style={{...card, background:`${C.indigo}06`, border:`1px solid ${C.indigo}20`}}>
            <h3 style={{ fontSize:14, fontWeight:700, color:C.indigo, margin:'0 0 12px', display:'flex', alignItems:'center', gap:8 }}>
              <BarChart3 size={16} style={{ color:C.indigo }} /> Key Insights
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                { label:'Top Supplier',      value: bySupplier[0]?.name?.slice(0,40)??'—',  sub: bySupplier[0]?formatCurrency(bySupplier[0].value):'' },
                { label:'Critical Reorders', value: `${outCount+criticalCount} products`,    sub: 'Need immediate replenishment' },
                { label:'Most Active Month', value: mostActiveMonth,                         sub: 'Highest purchase value month' },
              ].map((ins,i)=>(
                <div key={`insight-${i}`} style={{ padding:'12px 14px', borderRadius:10, background:css.card, border:`1px solid ${css.border}` }}>
                  <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:css.mutedFg, margin:'0 0 4px' }}>{ins.label}</p>
                  <p style={{ fontSize:14, fontWeight:800, color:css.cardFg, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ins.value}</p>
                  {ins.sub && <p style={{ fontSize:11, color:css.mutedFg, margin:0 }}>{ins.sub}</p>}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}