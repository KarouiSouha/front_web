
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
export function SupplyPolicyPage() {
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
    const fC = formatCurrency;
    const fN = formatNumber;
    const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });

    // ── Shared CSS ────────────────────────────────────────────
    const sharedCSS = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'DM Sans',sans-serif;background:#fff;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{size:A4 landscape;margin:0}
      .cover{width:100%;height:210mm;background:#fff;break-after:page!important;page-break-after:always!important;position:relative;overflow:hidden;}
      .cover-stripe{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#0ea5e9,#14b8a6,#10b981);}
      .cover-bg{position:absolute;top:0;right:0;width:48%;height:100%;background:linear-gradient(148deg,#ecfeff,#cffafe,#a5f3fc,#67e8f9);clip-path:polygon(12% 0,100% 0,100% 100%,0% 100%);}
      .cover-inner{position:relative;z-index:2;display:grid;grid-template-rows:auto 1fr auto;height:100%;padding:28px 48px 24px;}
      .cover-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #e2e8f0;}
      .cover-main{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:20px 0;}
      .cover-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:#0f172a;line-height:1.0;}
      .cover-title em{color:#0ea5e9;font-style:italic;}
      .cover-kc{background:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.95);border-radius:12px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
      .kc-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;}
      .kc-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1;}
      .kc-note{font-size:10px;color:#94a3b8;margin-top:2px;}
      .badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;}
      .cover-footer{border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;}
      .page{width:297mm;min-height:210mm;padding:30px 42px 24px;page-break-after:always;break-after:page}
      .page:last-child{page-break-after:auto;break-after:auto}
      .page-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #f59e0b}
      .sec-num{width:26px;height:26px;border-radius:8px;background:#f59e0b;color:#0f172a;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;margin-right:10px;flex-shrink:0}
      .sec-title{font-size:15px;font-weight:800;color:#0f172a;display:inline}
      .sec-sub{font-size:11px;color:#94a3b8;margin-top:2px;margin-left:36px}
      .page-ref{font-size:9px;color:#cbd5e1;letter-spacing:.06em}
      .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
      .kc{background:#f8fafc;border-radius:12px;padding:15px 17px;border:1px solid #e2e8f0;border-top:3px solid #f59e0b;break-inside:avoid;page-break-inside:avoid}
      .kc .l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#64748b}
      .kc .v{font-size:17px;font-weight:800;color:#0f172a;margin-top:5px;letter-spacing:-.03em}
      .kc .s{font-size:10px;color:#94a3b8;margin-top:2px}
      table{width:100%;border-collapse:collapse;font-size:11.5px}
      thead tr{background:#f1f5f9}
      th{padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;border-bottom:2px solid #e2e8f0;white-space:nowrap}
      th.l{text-align:left} th.r{text-align:right}
      tr{break-inside:avoid;page-break-inside:avoid}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;break-inside:avoid;page-break-inside:avoid}
      .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
      .cd{background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;break-inside:avoid;page-break-inside:avoid}
      .cd h3{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:12px;padding-bottom:7px;border-bottom:1px solid #e2e8f0}
      .insights{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px;background:#fffbeb;border-radius:12px;padding:14px;border:1px solid #fde68a;break-inside:avoid;page-break-inside:avoid}
      .ic{background:#fff;border-radius:10px;padding:11px 13px;border:1px solid #fde68a}
      .ic .l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#92400e;margin-bottom:3px}
      .ic .v{font-size:13px;font-weight:800;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ic .s{font-size:10px;color:#92400e;margin-top:1px}
      .status-out{color:#ef4444;background:#fef2f2;border:1px solid #fecaca;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
      .status-critical{color:#f97316;background:#fff7ed;border:1px solid #fed7aa;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
      .status-low{color:#f59e0b;background:#fffbeb;border:1px solid #fde68a;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
      .status-ok{color:#10b981;background:#f0fdf4;border:1px solid #bbf7d0;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    `;

    // ── PAGE HEADER helper ────────────────────────────────────
    const pageHdr = (num: number, title: string, sub: string, pageLabel: string) => `
      <div class="page-hdr">
        <div>
          <div><span class="sec-num">${num}</span><span class="sec-title">${title}</span></div>
          <div class="sec-sub">${sub}</div>
        </div>
        <div class="page-ref">SUPPLY REPORT · ${yearFilter==='all'?'ALL YEARS':yearFilter} · ${pageLabel}</div>
      </div>`;

    // ── Row builders ──────────────────────────────────────────

    // Supplier rows
    const supplierRows = bySupplier.slice(0, 15).map((s, i) => {
      const share = totalValue > 0 ? (s.value / totalValue * 100).toFixed(1) : '0';
      const col = PAL[i % PAL.length];
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:6px 8px;text-align:center;color:#64748b;font-weight:700;font-size:11px">${i+1}</td>
        <td style="padding:6px 8px;font-weight:600;color:#0f172a;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name.length>46?s.name.slice(0,46)+'…':s.name}</td>
        <td style="padding:6px 8px;text-align:right;color:#64748b">${s.sku_count}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:800;color:#0f172a">${fC(s.value)}</td>
        <td style="padding:6px 8px;text-align:right">
          <span style="font-weight:700;color:${col};background:${col}18;padding:2px 8px;border-radius:20px;font-size:10px">${share}%</span>
        </td>
      </tr>`;
    }).join('');

    // Branch rows
    const branchRows = byBranch.map((b, i) => {
      const share = totalValue > 0 ? (b.value / totalValue * 100).toFixed(1) : '0';
      const col = branchColor(b.branch);
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:6px 8px;font-weight:600;color:#0f172a">
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></span>${b.branch}
          </span>
        </td>
        <td style="padding:6px 8px;text-align:right;font-weight:800;color:#0f172a">${fC(b.value)}</td>
        <td style="padding:6px 8px;text-align:right">
          <div style="display:flex;align-items:center;gap:5px;justify-content:flex-end">
            <div style="width:44px;height:4px;background:#e2e8f0;border-radius:999px">
              <div style="height:100%;width:${Math.min(100,parseFloat(share))}%;background:${col};border-radius:999px"></div>
            </div>
            <span style="font-weight:700;color:${col};font-size:10px">${share}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Category rows
    const catRows = byCategory.slice(0, 10).map((c, i) => {
      const share = totalValue > 0 ? (c.value / totalValue * 100).toFixed(1) : '0';
      const col = PAL[i % PAL.length];
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:6px 8px">
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></span>
            <span style="font-weight:600;color:#0f172a">${c.name||'Other'}</span>
          </span>
        </td>
        <td style="padding:6px 8px;text-align:right;font-weight:800;color:#0f172a">${fC(c.value)}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:700;color:${col}">${share}%</td>
      </tr>`;
    }).join('');

    // Branch × Month
    const bxmHeaderCells = allMonths.slice(-6).map(m =>
      `<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;white-space:nowrap">${m}</th>`
    ).join('');
    const bxmBodyRows = allBranches.map((branch, bi) => {
      const col = branchColor(branch);
      const cells = allMonths.slice(-6).map(m => {
        const d = branchMonth.find(r => r.branch === branch && r.month === m);
        return `<td style="padding:6px 8px;text-align:right;font-size:10px;color:#6366f1;font-weight:${d?'700':'400'}">${d ? fC(d.value) : '—'}</td>`;
      }).join('');
      return `<tr style="background:${bi%2===0?'#fff':'#f8fafc'}">
        <td style="padding:6px 8px;white-space:nowrap">
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${col}"></span>
            <span style="font-weight:600;color:#0f172a">${branch}</span>
          </span>
        </td>${cells}
      </tr>`;
    }).join('');

    // Supplier SKUs cards
    const skuCards = supplierSKUs.map((s, si) => {
      const col = PAL[si % PAL.length];
      const itemRows = s.items.map((item, ii) =>
        `<tr style="border-top:1px solid #e2e8f0">
          <td style="padding:4px 0;color:#0f172a;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px">${item.name.length>28?item.name.slice(0,28)+'…':item.name}</td>
          <td style="padding:4px 0;text-align:right;color:#64748b;font-size:10px">${fN(Math.round(item.qty))}</td>
          <td style="padding:4px 0;text-align:right;font-weight:700;color:#6366f1;font-size:10px">${fC(item.value)}</td>
        </tr>`
      ).join('');
      return `<div style="background:#f8fafc;border-radius:10px;padding:12px 14px;border:1px solid #e2e8f0;break-inside:avoid">
        <p style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          <span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block;margin-right:6px"></span>
          ${s.supplier.length>38?s.supplier.slice(0,38)+'…':s.supplier}
        </p>
        <table style="font-size:10px">
          <thead><tr>
            <th style="text-align:left;color:#94a3b8;padding:2px 0;font-size:9px;font-weight:600;border-bottom:1px solid #e2e8f0">Item</th>
            <th style="text-align:right;color:#94a3b8;padding:2px 0;font-size:9px;font-weight:600;border-bottom:1px solid #e2e8f0">Qty</th>
            <th style="text-align:right;color:#94a3b8;padding:2px 0;font-size:9px;font-weight:600;border-bottom:1px solid #e2e8f0">Value</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>`;
    }).join('');

    // Lead time rows — filter 0 days
    const validLeadTimes = leadTimes.filter(s => s.avg_days > 0);
    const leadRows = validLeadTimes.map((s, i) => {
      const freq = s.avg_days<=7  ? {lbl:'Weekly',    col:'#10b981'}
                 : s.avg_days<=14 ? {lbl:'Bi-weekly', col:'#14b8a6'}
                 : s.avg_days<=31 ? {lbl:'Monthly',   col:'#f59e0b'}
                 : s.avg_days<=90 ? {lbl:'Quarterly', col:'#f97316'}
                 :                  {lbl:'Rare',       col:'#f43f5e'};
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:6px 10px;font-weight:600;color:#0f172a;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.supplier.length>52?s.supplier.slice(0,52)+'…':s.supplier}</td>
        <td style="padding:6px 10px;text-align:right;color:#64748b">${s.orders}</td>
        <td style="padding:6px 10px;text-align:right">
          <span style="font-size:14px;font-weight:800;color:#6366f1">${s.avg_days}</span>
          <span style="font-size:10px;color:#94a3b8;margin-left:3px">days</span>
        </td>
        <td style="padding:6px 10px;text-align:right">
          <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;background:${freq.col}18;color:${freq.col};border:1px solid ${freq.col}35">${freq.lbl}</span>
        </td>
      </tr>`;
    }).join('');

    // Reorder rows — top 30 urgent items (out + critical + low)
    const urgentItems = [...reorderList]
      .filter(i => i.status !== 'ok')
      .sort((a,b) => { const o: Record<string,number>={out:0,critical:1,low:2,ok:3}; return o[a.status]-o[b.status]; })
      .slice(0, 30);

    const reorderRows = urgentItems.map((item, i) => {
      const statusCls = item.status === 'out' ? 'status-out' : item.status === 'critical' ? 'status-critical' : 'status-low';
      const statusLbl = item.status === 'out' ? '🔴 Out' : item.status === 'critical' ? '🟠 Critical' : '🟡 Low';
      const hasUsage = item.monthly_usage > 0;
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:6px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          <div style="font-weight:600;color:#0f172a;font-size:11px">${item.product_name.length>30?item.product_name.slice(0,30)+'…':item.product_name}</div>
          <div style="font-size:9px;color:#94a3b8;font-family:monospace">${item.material_code}</div>
        </td>
        <td style="padding:6px 8px;font-size:10px;color:#64748b">${item.category||'—'}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:800;color:${item.stock_qty===0?'#ef4444':item.stock_qty<=item.min_stock?'#f97316':'#0f172a'}">${fN(Math.round(item.stock_qty))}</td>
        <td style="padding:6px 8px;text-align:right;color:#64748b">${hasUsage?fN(item.min_stock):'—'}</td>
        <td style="padding:6px 8px;text-align:right;color:#64748b">${hasUsage?fN(item.monthly_usage):'—'}</td>
        <td style="padding:6px 8px;text-align:right">
          ${item.days_of_stock!==null?`<span style="font-weight:700;color:${item.days_of_stock<=14?'#ef4444':item.days_of_stock<=30?'#f59e0b':'#10b981'}">${item.days_of_stock}d</span>`:'—'}
        </td>
        <td style="padding:6px 8px;text-align:right;font-weight:800;color:#6366f1">${item.reorder_qty>0?fN(item.reorder_qty):'—'}</td>
        <td style="padding:6px 8px;text-align:right"><span class="${statusCls}">${statusLbl}</span></td>
      </tr>`;
    }).join('');

    // ── FULL HTML ─────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Supply Policy Report — ${yearFilter === 'all' ? 'All Years' : yearFilter}</title>
  <style>${sharedCSS}</style>
</head>
<body>

<!-- ══ COVER ══ -->
<div class="cover">
  <div class="cover-stripe"></div>
  <div class="cover-bg"></div>
  <div class="cover-inner">
    <div class="cover-top">
      <span style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#374151;">WEEG Financial · Supply Division</span>
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#0ea5e9;background:#ecfeff;border:1.5px solid #a5f3fc;padding:4px 13px;border-radius:20px;">Financial Report</span>
    </div>
    <div class="cover-main">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:14px;">Supply Chain Management</div>
        <h1 class="cover-title">Supply<br/><em>Policy</em><br/>Report</h1>
        <p style="font-size:14px;color:#64748b;margin:14px 0 18px;">
          ${yearFilter==='all'?'All Years':yearFilter}${branchFilter!=='all'?' · '+branchFilter:''}${catFilter!=='all'?' · '+catFilter:''}
        </p>
        <p style="font-size:12px;color:#94a3b8;line-height:1.85;border-left:3px solid #a5f3fc;padding-left:16px;">
          Purchases (ف شراء) · Supplier performance &amp; lead times · Stock levels · Reorder recommendations across ${meta?.branches?.length??0} branches.
        </p>
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#ecfeff;color:#0ea5e9;border:1px solid #a5f3fc;">${meta?.total_transactions??0} invoices</span>
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;">${fN(meta?.unique_suppliers??0)} suppliers</span>
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:#fef3c7;color:#d97706;border:1px solid #fde68a;">${outCount+criticalCount+lowCount} stock alerts</span>
        </div>
      </div>
      <div style="padding-left:16px;">
        <div class="cover-kc">
          <div><div class="kc-lbl">Total Purchase Value</div><div class="kc-val" style="color:#0ea5e9;">${fC(meta?.total_value??0)}</div><div class="kc-note">${meta?.total_transactions??0} invoices · ${meta?.unique_skus??0} SKUs</div></div>
          <span class="badge" style="background:#ecfeff;color:#0ea5e9;border:1px solid #a5f3fc;">Purchases</span>
        </div>
        <div class="cover-kc">
          <div><div class="kc-lbl">Active Suppliers</div><div class="kc-val" style="color:#14b8a6;">${fN(meta?.unique_suppliers??0)}</div><div class="kc-note">Unique vendor names</div></div>
          <span class="badge" style="background:#f0fdfa;color:#0d9488;border:1px solid #99f6e4;">Vendors</span>
        </div>
        <div class="cover-kc">
          <div><div class="kc-lbl">Most Active Month</div><div class="kc-val" style="color:#10b981;font-size:22px;">${mostActiveMonth}</div><div class="kc-note">Highest purchase value</div></div>
          <span class="badge" style="background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;">Peak</span>
        </div>
        <div class="cover-kc">
          <div><div class="kc-lbl">Stock Alerts</div><div class="kc-val" style="color:${outCount+criticalCount>0?'#f97316':'#10b981'};">${outCount+criticalCount+lowCount}</div><div class="kc-note">${outCount} out · ${criticalCount} critical · ${lowCount} low</div></div>
          <span class="badge" style="background:${outCount+criticalCount>0?'#fff7ed':'#f0fdf4'};color:${outCount+criticalCount>0?'#f97316':'#059669'};border:1px solid ${outCount+criticalCount>0?'#fed7aa':'#bbf7d0'};">${outCount+criticalCount>0?'⚠ Action':'✓ OK'}</span>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      <div style="display:flex;align-items:center;gap:12px;font-size:10px;color:#94a3b8;">
        <span>Generated ${today}</span>
        <span style="width:3px;height:3px;border-radius:50%;background:#cbd5e1;display:inline-block;"></span>
        <span>${meta?.branches?.length??0} branches · ${fN(meta?.unique_suppliers??0)} suppliers</span>
        <span style="width:3px;height:3px;border-radius:50%;background:#cbd5e1;display:inline-block;"></span>
        <span>Period: ${yearFilter==='all'?'All Years':yearFilter}</span>
      </div>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#0ea5e9;border:1.5px solid #a5f3fc;padding:3px 10px;border-radius:20px;background:#ecfeff;">Confidential</span>
    </div>
  </div>
</div>

<!-- ══ PAGE 1 — KPIs + Suppliers ══ -->
<div class="page">
  ${pageHdr(1,'Purchase Overview & Supplier Performance',`${meta?.total_transactions??0} transactions · top 15 suppliers ranked by value`,'PAGE 1')}
  <div class="kpi-row">
    <div class="kc"><div class="l">Total Purchase Value</div><div class="v">${fC(meta?.total_value??0)}</div><div class="s">${meta?.total_transactions??0} invoices</div></div>
    <div class="kc"><div class="l">Total Qty Received</div><div class="v">${fN(Math.round(meta?.total_qty??0))}</div><div class="s">${meta?.unique_skus??0} SKUs</div></div>
    <div class="kc"><div class="l">Active Suppliers</div><div class="v">${fN(meta?.unique_suppliers??0)}</div><div class="s">Unique vendors</div></div>
    <div class="kc"><div class="l">Stock Alerts</div><div class="v">${outCount+criticalCount+lowCount}</div><div class="s">${outCount} out · ${criticalCount} crit · ${lowCount} low</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="l" style="width:28px">#</th>
      <th class="l">Supplier</th>
      <th class="r">SKUs</th>
      <th class="r">Total Value</th>
      <th class="r">% Share</th>
    </tr></thead>
    <tbody>${supplierRows}</tbody>
  </table>
</div>

<!-- ══ PAGE 2 — Categories + Branch Analysis ══ -->
<div class="page">
  ${pageHdr(2,'Purchase Value by Category & Branch Analysis',`${byCategory.length} categories · ${byBranch.length} branches`,'PAGE 2')}
  <div class="two-col" style="margin-bottom:14px">
    <div class="cd">
      <h3>Top Categories</h3>
      <table>
        <thead><tr><th class="l">Category</th><th class="r">Value</th><th class="r">%</th></tr></thead>
        <tbody>${catRows}</tbody>
      </table>
    </div>
    <div class="cd">
      <h3>Purchase Value by Branch</h3>
      <table>
        <thead><tr><th class="l">Branch</th><th class="r">Value</th><th class="r">Share</th></tr></thead>
        <tbody>${branchRows}</tbody>
      </table>
    </div>
  </div>
</div>

<!-- ══ PAGE 3 — Supplier SKUs ══ -->
<div class="page">
  ${pageHdr(3,'Supplier × Top SKUs','Top 5 items per top 10 suppliers','PAGE 3')}
  <div class="cd">
    <h3>Purchase by Branch — Last 6 Months</h3>
    <table>
      <thead><tr><th class="l">Branch</th>${bxmHeaderCells}</tr></thead>
      <tbody>${bxmBodyRows}</tbody>
    </table>
  </div>
  <div class="insights">
    <div class="ic"><div class="l">Top Supplier</div><div class="v">${bySupplier[0]?.name?.slice(0,36)??'—'}</div>${bySupplier[0]?`<div class="s">${fC(bySupplier[0].value)}</div>`:''}</div>
    <div class="ic"><div class="l">Critical Reorders</div><div class="v">${outCount+criticalCount} products</div><div class="s">Need immediate replenishment</div></div>
    <div class="ic"><div class="l">Most Active Month</div><div class="v">${mostActiveMonth}</div><div class="s">Highest purchase value</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    ${skuCards}
  </div>
</div>

<!-- ══ PAGE 4 — Lead Times + Inventory ══ -->
<div class="page">
  ${pageHdr(4,'Lead Times & Inventory Status',`${validLeadTimes.length} suppliers with lead time data · current stock alerts`,'PAGE 4')}
  <div class="two-col">
    <div class="cd">
      <h3>Supplier Lead Times — avg days between orders</h3>
      ${validLeadTimes.length===0
        ? '<p style="color:#94a3b8;font-size:12px">Not enough order history to calculate lead times.</p>'
        : `<table>
            <thead><tr><th class="l">Supplier</th><th class="r">Orders</th><th class="r">Avg Days</th><th class="r">Frequency</th></tr></thead>
            <tbody>${leadRows}</tbody>
          </table>`
      }
    </div>
    <div class="cd">
      <h3>Current Inventory Status</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        ${[
          {lbl:'Out of Stock', val:outCount,      col:'#ef4444', sub:'Zero quantity'},
          {lbl:'Critical',     val:criticalCount, col:'#f97316', sub:'Below min level'},
          {lbl:'Low Stock',    val:lowCount,       col:'#f59e0b', sub:'Below safety'},
          {lbl:'Total SKUs',   val:stockSummary?.total_products??0, col:'#10b981', sub:'Tracked'},
        ].map(k=>`
          <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;border:1px solid #e2e8f0;border-top:3px solid ${k.col}">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#64748b">${k.lbl}</div>
            <div style="font-size:18px;font-weight:800;color:${k.col};margin-top:5px">${k.val}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">${k.sub}</div>
          </div>`).join('')}
      </div>
      <div style="padding:11px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:5px">Total Stock Value</div>
        <div style="font-size:20px;font-weight:800;color:#0f172a">${fC(stockSummary?.total_stock_value??0)}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">${stockSummary?.total_products??0} products tracked</div>
      </div>
    </div>
  </div>
</div>

</body></html>`;

    const win = window.open('', '_blank', 'width=1280,height=900');
    if (!win) { alert('Please allow popups to print the report.'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { setTimeout(() => { win.focus(); win.print(); }, 400); };
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ background:css.bg, minHeight:'100vh', padding:'32px 28px', display:'flex', flexDirection:'column', gap:28 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:css.fg, letterSpacing:'-0.03em', margin:0, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:36, height:36, borderRadius:10, background:`${C.indigo}18`, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
              <Truck size={18} style={{ color:C.indigo }} />
            </span>
            Supply Policy Report
          </h1>
          <p style={{ fontSize:13, color:css.mutedFg, marginTop:4 }}>
            Purchases (ف شراء) · Supplier performance · Stock levels · Reorder recommendations
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchAll} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, height:36, padding:'0 14px', borderRadius:10, border:`1px solid ${css.border}`, background:css.card, color:css.cardFg, fontSize:13, cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
          <button onClick={printReport} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, height:36, padding:'0 14px', borderRadius:10, border:`1px solid ${C.indigo}40`, background:`${C.indigo}10`, color:C.indigo, fontSize:13, fontWeight:600, cursor:'pointer', opacity:loading?0.5:1 }}>
            <Printer size={14} /> Print 
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
        <>
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
        </>
      )}
    </div>
  );
}