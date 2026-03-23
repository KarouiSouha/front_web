
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, TrendingUp, DollarSign, BarChart3, RefreshCw,
  Loader2, AlertCircle, Printer, ChevronDown,
  AlertTriangle, Layers, RotateCcw, Archive,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  inventoryApi, stockKpiApi,
  type BranchSummary, type CategoryBreakdown, type StockKPIData,
} from '../lib/dataApi';
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
  '#6366f1', '#0ea5e9', '#14b8a6', '#10b981',
  '#f59e0b', '#f43f5e', '#8b5cf6', '#f97316',
];
const CAT_PAL = [
  '#6366f1', '#0ea5e9', '#14b8a6', '#10b981',
  '#f59e0b', '#f43f5e', '#8b5cf6', '#f97316', '#38bdf8', '#ec4899',
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

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────
function Spin() {
  return <Loader2 size={20} className="animate-spin" style={{ color: C.teal }} />;
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
            {isCurrency && typeof p.value === 'number' ? formatCurrency(p.value) : typeof p.value === 'number' ? formatNumber(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SecHead({ n, title, sub, color = C.teal }: { n: number; title: string; sub?: string; color?: string }) {
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
          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: value === opt.key ? `${C.teal}15` : 'transparent', color: value === opt.key ? C.teal : '#111827', fontWeight: value === opt.key ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {opt.label}
          {value === opt.key && <span style={{ color: C.teal, fontSize: 12 }}>✓</span>}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Report Component
// ─────────────────────────────────────────────────────────────────────────────
export function InventoryTurnoverReport() {
  const currentYear = new Date().getFullYear();

  const [snapshots, setSnapshots] = useState<{ id: string; display: string }[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState('');
  const [activeDate, setActiveDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [openDropdown, setOpenDropdown] = useState<'date' | 'year' | null>(null);

  // ── Data state ──────────────────────────────────────────────────────────
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [stockKpi, setStockKpi] = useState<StockKPIData | null>(null);
  const [totalQty, setTotalQty] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Load snapshots on mount ─────────────────────────────────────────────
  useEffect(() => {
    inventoryApi.listSnapshots({ page_size: 100 }).then(r => {
      const snaps = (r.items ?? []).map(s => ({
        id: s.id,
        display: s.snapshot_date || s.uploaded_at.slice(0, 10),
      }));
      setSnapshots(snaps);
      if (snaps.length) {
        setActiveSnapshotId(snaps[0].id);
        setActiveDate(snaps[0].display);
      }
    }).catch(() => {});
  }, []);

  // ── Fetch all data ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    const year = Number(selectedYear);
    try {
      const [linesRes, branchRes, catRes, stockRes] = await Promise.all([
        activeSnapshotId
          ? inventoryApi.getLines(activeSnapshotId, { page_size: 1 })
          : Promise.resolve(null),
        inventoryApi.branchSummary({ snapshot_id: activeSnapshotId || undefined }),
        inventoryApi.categoryBreakdown({ snapshot_id: activeSnapshotId || undefined }),
        stockKpiApi.getAll({ year, snapshot_date: activeDate || undefined }),
      ]);
      setTotalQty(num(linesRes?.totals?.grand_total_qty));
      setTotalValue(num(linesRes?.totals?.grand_total_value));
      setBranches(branchRes.branches ?? []);
      setCategories(catRes.categories ?? []);
      setStockKpi(stockRes);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [activeSnapshotId, activeDate, selectedYear]);

  useEffect(() => {
    // Fetch once snapshots are loaded (or immediately if none available)
    if (activeSnapshotId || snapshots.length === 0) fetchAll();
  }, [fetchAll, activeSnapshotId, snapshots.length]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const sortedBranches = useMemo(() =>
    [...branches].sort((a, b) => num(b.total_value) - num(a.total_value)),
  [branches]);

  const sortedCategories = useMemo(() =>
    [...categories].sort((a, b) => num(b.total_value) - num(a.total_value)).slice(0, 12),
  [categories]);

  const grandTotalValue = sortedBranches.reduce((s, b) => s + num(b.total_value), 0) || totalValue || 1;
  const grandTotalQty   = sortedBranches.reduce((s, b) => s + num(b.total_qty), 0) || totalQty || 1;
  const catTotalValue   = sortedCategories.reduce((s, c) => s + num(c.total_value), 0) || totalValue || 1;

  const avgRotation  = num(stockKpi?.stock_summary?.avg_rotation_rate);
  const lowRotCount  = num(stockKpi?.stock_summary?.low_rotation_count);
  const zeroStockCount = num(stockKpi?.stock_summary?.zero_stock_count);
  const totalProducts  = num(stockKpi?.stock_summary?.total_products);
  const topRotation  = stockKpi?.top_rotation_products?.slice(0, 10) ?? [];
  const lowRotation  = stockKpi?.low_rotation_products?.slice(0, 10) ?? [];

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2].map(y => ({ key: String(y), label: String(y) }));
  const dateOptions = snapshots.map(s => ({ key: s.id, label: s.display }));

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Helpers ──────────────────────────────────────────────────────────────
    const esc = (s: string) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fc  = (v: unknown) => formatCurrency(v as number);
    const fn  = (v: unknown) => formatNumber(v as number);
    const p   = (a: number, b: number) => b > 0 ? +((a / b) * 100).toFixed(1) : 0;

    const PAL  = ['#6366f1','#0ea5e9','#14b8a6','#10b981','#f59e0b','#f43f5e','#8b5cf6','#f97316'];
    const CPAL = ['#6366f1','#0ea5e9','#14b8a6','#10b981','#f59e0b','#f43f5e','#8b5cf6','#f97316','#38bdf8','#ec4899'];

    // ── Reusable print-safe components ───────────────────────────────────────
    const secHead = (n: number, title: string, sub: string, color: string) => `
      <div class="sec-head">
        <span class="sec-num" style="background:${color}18;color:${color};border:1px solid ${color}30">${n}</span>
        <div>
          <h2 class="sec-title">${esc(title)}</h2>
          ${sub ? `<p class="sec-sub">${esc(sub)}</p>` : ''}
        </div>
      </div>`;

    const kcard = (label: string, value: string, sub: string, accent: string, badge?: { text: string; good: boolean }) => `
      <div class="kcard" style="border-left:3px solid ${accent}">
        <p class="kcard-label" style="color:${accent}">${esc(label)}</p>
        <p class="kcard-value" style="color:${accent}">${esc(value)}</p>
        <p class="kcard-sub">${esc(sub)}</p>
        ${badge ? `<span class="badge" style="background:${badge.good ? '#10b98118' : '#f43f5e18'};color:${badge.good ? '#10b981' : '#f43f5e'}">${esc(badge.text)}</span>` : ''}
      </div>`;

    const bar = (share: number, color: string, height = 6) =>
      `<div style="height:${height}px;border-radius:999px;background:#f3f4f6;overflow:hidden">
        <div style="height:100%;border-radius:999px;width:${share}%;background:linear-gradient(90deg,${color}60,${color})"></div>
      </div>`;

    const th = (cols: string[], aligns: string[]) =>
      `<tr class="thead-row">${cols.map((c,i) => `<th style="text-align:${aligns[i]||'left'}">${esc(c)}</th>`).join('')}</tr>`;

    // ── SECTION 1 — Inventory Quantity ───────────────────────────────────────
    const sec1 = `
      <div class="section">
        ${secHead(1,'Inventory Quantity','Total stock quantity — global & per branch (كمية المخزن)','#14b8a6')}
        <div class="kgrid-3">
          ${kcard('Total Stock Qty',         fn(grandTotalQty),    'All products, all branches',     '#14b8a6')}
          ${kcard('Total Products',          fn(totalProducts||categories.length), 'Products with stock data', '#6366f1')}
          ${kcard('Zero-Stock Items',        String(zeroStockCount),'Require immediate restock',      '#f43f5e',
                  { text: zeroStockCount === 0 ? 'All stocked' : 'Action needed', good: zeroStockCount === 0 })}
        </div>

        <div class="card" style="margin-top:14px">
          <h3 class="card-title">Stock Quantity by Branch</h3>
          <p class="card-sub">Units in stock per branch — ${esc(activeDate || selectedYear)}</p>
          <table class="data-table">
            ${th(['Branch','Stock Qty','% of Total','Distribution'],['left','right','right','left'])}
            <tbody>
              ${sortedBranches.map((b,i) => {
                const share = p(num(b.total_qty), grandTotalQty);
                const c = PAL[i % PAL.length];
                return `<tr class="${i%2?'row-alt':''}">
                  <td><span class="dot" style="background:${c}"></span>${esc(b.branch)}</td>
                  <td style="text-align:right;font-weight:700;color:${c}">${fn(b.total_qty)}</td>
                  <td style="text-align:right"><span class="pct-badge" style="background:${c}18;color:${c}">${share}%</span></td>
                  <td style="min-width:130px">${bar(share, c)}</td>
                </tr>`;
              }).join('')}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td style="text-align:right;color:#6366f1;font-weight:900">${fn(grandTotalQty)}</td>
                <td style="text-align:right;color:#6366f1;font-weight:700">100%</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // ── SECTION 2 — Inventory Value ──────────────────────────────────────────
    const sec2 = `
      <div class="section page-break">
        ${secHead(2,'Inventory Value','Total stock value in LYD — global & breakdown (قيمة المخزن)','#6366f1')}
        <div class="kgrid-3">
          ${kcard('Total Stock Value',    fc(grandTotalValue), 'All branches combined',                        '#6366f1')}
          ${kcard('Avg Value per Unit',   fc(grandTotalQty > 0 ? grandTotalValue / grandTotalQty : 0), 'Average cost price per unit', '#8b5cf6')}
          ${kcard('Highest Value Branch', (sortedBranches[0]?.branch ?? '—').slice(0,18), fc(sortedBranches[0]?.total_value ?? 0), '#14b8a6')}
        </div>

        <div class="card" style="margin-top:14px">
          <h3 class="card-title">Stock Value by Branch</h3>
          <p class="card-sub">Total inventory value per branch — ${esc(activeDate || selectedYear)}</p>
          <table class="data-table">
            ${th(['Branch','Stock Value (LYD)','% of Total','Distribution'],['left','right','right','left'])}
            <tbody>
              ${sortedBranches.map((b,i) => {
                const share = p(num(b.total_value), grandTotalValue);
                const c = PAL[i % PAL.length];
                return `<tr class="${i%2?'row-alt':''}">
                  <td><span class="dot" style="background:${c}"></span>${esc(b.branch)}</td>
                  <td style="text-align:right;font-weight:800;color:${c}">${fc(b.total_value)}</td>
                  <td style="text-align:right"><span class="pct-badge" style="background:${c}18;color:${c}">${share}%</span></td>
                  <td style="min-width:130px">${bar(share, c)}</td>
                </tr>`;
              }).join('')}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td style="text-align:right;color:#6366f1;font-weight:900">${fc(grandTotalValue)}</td>
                <td style="text-align:right;color:#6366f1;font-weight:700">100%</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // ── SECTION 3 — Value per Branch (merged) ────────────────────────────────
    const sec3 = `
      <div class="section page-break">
        ${secHead(3,'Stock Value per Branch','Detailed breakdown — value, quantity, and share of total (قيمة مخزون لكل فرع)','#8b5cf6')}
        <div class="card">
          <h3 class="card-title">Branch Summary</h3>
          <p class="card-sub">Qty, value, share and distribution per branch</p>
          <table class="data-table">
            ${th(['Branch','Qty','Value (LYD)','% of Total','Distribution'],['left','right','right','right','left'])}
            <tbody>
              ${sortedBranches.map((b,i) => {
                const share = p(num(b.total_value), grandTotalValue);
                const c = PAL[i % PAL.length];
                return `<tr class="${i%2?'row-alt':''}">
                  <td><span class="dot" style="background:${c}"></span>${esc(b.branch)}</td>
                  <td style="text-align:right;color:#6b7280;font-weight:600">${fn(b.total_qty)}</td>
                  <td style="text-align:right;font-weight:800;color:${c}">${fc(b.total_value)}</td>
                  <td style="text-align:right"><span class="pct-badge" style="background:${c}18;color:${c}">${share}%</span></td>
                  <td style="min-width:130px">${bar(share, c)}</td>
                </tr>`;
              }).join('')}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td style="text-align:right;color:#6366f1;font-weight:900">${fn(grandTotalQty)}</td>
                <td style="text-align:right;color:#6366f1;font-weight:900">${fc(grandTotalValue)}</td>
                <td style="text-align:right;color:#6366f1;font-weight:700">100%</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // ── SECTION 4 — Value by Category ────────────────────────────────────────
    const sec4 = `
      <div class="section page-break">
        ${secHead(4,'Inventory Value by Index / Category','Total stock value and quantity per product index/category (قيمة المخزون بالفهرس)','#f59e0b')}
        <div class="kgrid-3">
          ${kcard('Total Categories',    String(categories.length), 'Product indexes tracked', '#f59e0b')}
          ${kcard('Top Category Value',  fc(sortedCategories[0]?.total_value ?? 0), (sortedCategories[0]?.category ?? '—').slice(0,22), '#14b8a6')}
          ${kcard('Top Category Share',  `${p(num(sortedCategories[0]?.total_value), catTotalValue)}%`, 'Of total inventory value', '#8b5cf6')}
        </div>

        <div class="card" style="margin-top:14px">
          <h3 class="card-title">Category Value Comparison</h3>
          <p class="card-sub">Stock value ranked by category — ${esc(activeDate || selectedYear)}</p>
          <table class="data-table">
            ${th(['#','Category / Index','Total Qty','Total Value (LYD)','Value %','Qty %'],['left','left','right','right','right','right'])}
            <tbody>
              ${sortedCategories.map((c,i) => {
                const vc = p(num(c.total_value), catTotalValue);
                const qc = p(num(c.total_qty),   grandTotalQty);
                const cl = CPAL[i % CPAL.length];
                return `<tr class="${i%2?'row-alt':''}">
                  <td style="color:#9ca3af;font-weight:700">${i+1}</td>
                  <td><span class="dot" style="background:${cl}"></span>${esc(c.category||'Uncategorized')}</td>
                  <td style="text-align:right;color:#6b7280">${fn(c.total_qty)}</td>
                  <td style="text-align:right;font-weight:800;color:${cl}">${fc(c.total_value)}</td>
                  <td style="text-align:right"><span class="pct-badge" style="background:${cl}18;color:${cl}">${vc}%</span></td>
                  <td style="text-align:right"><span class="pct-badge" style="background:#6366f112;color:#6366f1">${qc}%</span></td>
                </tr>`;
              }).join('')}
              <tr class="total-row">
                <td></td>
                <td><strong>TOTAL</strong></td>
                <td style="text-align:right;color:#6366f1;font-weight:900">${fn(grandTotalQty)}</td>
                <td style="text-align:right;color:#f59e0b;font-weight:900">${fc(catTotalValue)}</td>
                <td style="text-align:right;color:#f59e0b;font-weight:700">100%</td>
                <td style="text-align:right;color:#6366f1;font-weight:700">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // ── SECTION 5 — Index Ratio ───────────────────────────────────────────────
    const sec5 = `
      <div class="section page-break">
        ${secHead(5,'Index Value / Ratio in Stock','Percentage share of each category (قيمة / نسبة الفهارس في مخزون)','#f97316')}
        <div class="card">
          <h3 class="card-title">Category / Index Inventory Ratio</h3>
          <p class="card-sub">Each index as a percentage of total stock — value & quantity</p>
          <div class="ratio-grid">
            ${sortedCategories.map((c,i) => {
              const vs = p(num(c.total_value), catTotalValue);
              const qs = p(num(c.total_qty),   grandTotalQty);
              const cl = CPAL[i % CPAL.length];
              return `
                <div class="ratio-card" style="border:1px solid ${cl}25;background:${i<3 ? cl+'08' : '#fff'}">
                  <div class="ratio-header">
                    <span class="rank-num" style="background:${cl}18;color:${cl}">${i+1}</span>
                    <span class="ratio-name">${esc(c.category||'Uncategorized')}</span>
                    <span class="pct-badge" style="background:${cl}18;color:${cl}">${vs}% val</span>
                    <span class="pct-badge" style="background:#6366f112;color:#6366f1">${qs}% qty</span>
                  </div>
                  <div class="ratio-bars">
                    <div class="ratio-bar-row">
                      <span>Value</span><strong>${fc(c.total_value)}</strong>
                      ${bar(vs, cl, 5)}
                    </div>
                    <div class="ratio-bar-row">
                      <span>Qty</span><strong>${fn(c.total_qty)}</strong>
                      ${bar(qs, '#6366f1', 5)}
                    </div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    // ── SECTION 6 — Rotation ─────────────────────────────────────────────────
    const sec6 = `
      <div class="section page-break">
        ${secHead(6,'Rotation Rate & Slow-Moving Items','Fast-moving vs. slow-moving · global & per branch (عام وبكل فرع)','#f43f5e')}
        <div class="kgrid-3">
          ${kcard('Avg Rotation Rate', `${avgRotation.toFixed(2)}×`, 'Stock turns per year', '#14b8a6',
                  { text: avgRotation >= 4 ? 'Healthy' : 'Low', good: avgRotation >= 4 })}
          ${kcard('Low Rotation Products', String(lowRotCount), `Below ${stockKpi?.stock_summary?.low_rotation_threshold ?? 1}× per year`, '#f59e0b',
                  { text: lowRotCount === 0 ? 'All good' : 'Review needed', good: lowRotCount === 0 })}
          ${kcard('Zero Stock Products', String(zeroStockCount), 'Stockout — reorder needed', '#f43f5e',
                  { text: zeroStockCount === 0 ? '✓ Fully stocked' : `${zeroStockCount} stockouts`, good: zeroStockCount === 0 })}
        </div>

        <div class="col-2" style="margin-top:14px;gap:14px">
          <!-- Top movers -->
          <div class="card">
            <h3 class="card-title" style="color:#10b981">🏆 Fastest Moving Products</h3>
            <p class="card-sub">Highest rotation rate — top performers</p>
            <table class="data-table">
              ${th(['#','Product','Stock Qty','Stock Value','Rate'],['left','left','right','right','right'])}
              <tbody>
                ${topRotation.map((pp,i) => `
                  <tr class="${i%2?'row-alt':''}${i<3?' top3':''}">
                    <td style="font-weight:800;color:${i<3?'#10b981':'#9ca3af'}">${i+1}</td>
                    <td style="font-weight:600">${esc(pp.product_name)}</td>
                    <td style="text-align:right;color:#6b7280">${fn(pp.stock_qty)}</td>
                    <td style="text-align:right;color:#6b7280">${fc(pp.stock_value)}</td>
                    <td style="text-align:right">
                      <span class="rate-badge" style="background:#10b98118;color:#10b981;border-color:#10b98130">${pp.rotation_rate.toFixed(2)}×</span>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>

          <!-- Slow movers -->
          <div class="card">
            <h3 class="card-title" style="color:#f43f5e">⚠️ Slow-Moving Products</h3>
            <p class="card-sub">Lowest rotation rate — require attention</p>
            <table class="data-table">
              ${th(['Product','Stock Qty','Stock Value','Rate'],['left','right','right','right'])}
              <tbody>
                ${lowRotation.map((pp,i) => {
                  const rc = pp.rotation_rate === 0 ? '#f43f5e' : '#f59e0b';
                  return `<tr class="${i%2?'row-alt':''}">
                    <td style="font-weight:600">${esc(pp.product_name)}</td>
                    <td style="text-align:right;color:#6b7280">${fn(pp.stock_qty)}</td>
                    <td style="text-align:right;color:#6b7280">${fc(pp.stock_value)}</td>
                    <td style="text-align:right">
                      <span class="rate-badge" style="background:${rc}18;color:${rc};border-color:${rc}30">${pp.rotation_rate.toFixed(2)}×</span>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${topRotation.length > 0 ? `
          <div class="card" style="margin-top:14px">
            <h3 class="card-title">Rotation Rate — Top Products</h3>
            <p class="card-sub">Stock turnover rate per product</p>
            <table class="data-table">
              ${th(['Product','Rotation Rate','Status','Visual Bar'],['left','right','center','left'])}
              <tbody>
                ${topRotation.slice(0,10).map((pp,i) => {
                  const rc = pp.rotation_rate >= 4 ? '#10b981' : pp.rotation_rate >= 2 ? '#f59e0b' : '#f43f5e';
                  const maxRate = Math.max(...topRotation.map(x => x.rotation_rate), 1);
                  const share   = p(pp.rotation_rate, maxRate);
                  return `<tr class="${i%2?'row-alt':''}">
                    <td style="font-weight:600">${esc(pp.product_name)}</td>
                    <td style="text-align:right;font-weight:800;color:${rc}">${pp.rotation_rate.toFixed(2)}×</td>
                    <td style="text-align:center"><span class="pct-badge" style="background:${rc}18;color:${rc}">${pp.rotation_rate >= 4 ? 'Healthy' : pp.rotation_rate >= 2 ? 'Monitor' : 'Low'}</span></td>
                    <td style="min-width:130px">${bar(share, rc)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>` : ''}
      </div>`;

    // ── CSS ───────────────────────────────────────────────────────────────────
    const css_str = `
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'DM Sans',sans-serif;background:#fff;color:#111827;font-size:12px;padding:0 12px 20px}
      @page{size:A4 landscape;margin:8mm 10mm}
      @page{orphans:3;widows:3}

      /* Cover */
      .cover{width:100%;height:190mm;display:grid;break-after:page;page-break-after:always;position:relative;overflow:hidden}
      .cover-stripe{position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#14b8a6,#6366f1 45%,#0ea5e9);z-index:3}
      .cover-bg{position:absolute;top:0;right:0;width:52%;height:100%;background:linear-gradient(148deg,#ecfdf5,#d1fae5 40%,#a7f3d0 80%,#6ee7b7);clip-path:polygon(15% 0,100% 0,100% 100%,0% 100%);z-index:0}
      .cover-inner{position:relative;z-index:4;display:grid;grid-template-rows:auto 1fr auto;height:100%;padding:28px 48px 26px}
      .cover-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #e5e7eb}
      .cover-main{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding:24px 0 20px}
      .cover-title{font-family:'Playfair Display',Georgia,serif;font-size:52px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1.0}
      .cover-title-accent{color:#14b8a6;font-style:italic}
      .cover-kpi{background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.9);border-radius:14px;padding:14px 18px;margin-bottom:10px}
      .ck-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.11em;color:#9ca3af;display:block}
      .ck-value{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;line-height:1.1}
      .cover-bottom{border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center}

      /* Sections */
      .section{padding:20px 0 0}
      .page-break{break-before:page;page-break-before:always}
      .sec-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px}
      .sec-num{width:34px;height:34px;border-radius:10px;font-size:15px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
      .sec-title{font-size:17px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;line-height:1.2}
      .sec-sub{font-size:11px;color:#6b7280;margin-top:3px}

      /* KPI cards */
      .kgrid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:0}
      .kcard{background:#fff;border-radius:12px;padding:14px 16px;border:1px solid #e5e7eb}
      .kcard-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
      .kcard-value{font-size:22px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:2px 0 4px}
      .kcard-sub{font-size:10px;color:#9ca3af}
      .badge{display:inline-block;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;margin-top:5px}

      /* Cards */
      .card{background:#fff;border-radius:14px;padding:18px 20px;border:1px solid #e5e7eb;margin-top:12px}
      .card-title{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px}
      .card-sub{font-size:11px;color:#6b7280;margin-bottom:12px}

      /* Tables */
      .data-table{width:100%;border-collapse:collapse;font-size:11px}
      .thead-row{background:#f9fafb}
      .thead-row th{padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb;white-space:nowrap}
      .data-table td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
      .row-alt td{background:#f9fafb}
      .top3 td{background:#f0fdf4}
      .total-row td{padding:8px 10px;border-top:2px solid #e5e7eb;background:#f5f3ff;font-weight:800}

      /* Widgets */
      .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;flex-shrink:0}
      .pct-badge{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px}
      .rate-badge{display:inline-block;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;border:1px solid transparent}

      /* Layout helpers */
      .col-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

      /* Ratio grid */
      .ratio-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
      .ratio-card{border-radius:10px;padding:10px 12px}
      .ratio-header{display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap}
      .rank-num{width:18px;height:18px;border-radius:5px;font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
      .ratio-name{flex:1;font-size:11px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      .ratio-bars{display:flex;flex-direction:column;gap:5px}
      .ratio-bar-row{display:grid;grid-template-columns:30px 1fr 1fr;align-items:center;gap:6px;font-size:10px;color:#6b7280}
      .ratio-bar-row strong{font-size:10px;color:#0f172a;text-align:right}

      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    `;

    // ── Cover page ────────────────────────────────────────────────────────────
    const cover = `
      <div class="cover">
        <div class="cover-stripe"></div>
        <div class="cover-bg"></div>
        <div class="cover-inner">
          <div class="cover-top">
            <span style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#374151">WEEG Financial</span>
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#14b8a6;background:#ecfdf5;border:1.5px solid #a7f3d0;padding:4px 13px;border-radius:20px">Inventory Report</span>
          </div>
          <div class="cover-main">
            <div>
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;color:#9ca3af;margin-bottom:14px">Inventory Management</div>
              <h1 class="cover-title">Inventory<br/><span class="cover-title-accent">Turnover</span></h1>
              <p style="font-size:15px;color:#6b7280;margin:12px 0 20px">Stock Analysis — ${esc(activeDate || selectedYear)}</p>
              <p style="font-size:12px;color:#9ca3af;line-height:1.85;border-left:3px solid #a7f3d0;padding-left:16px">
                Comprehensive inventory analysis: stock quantity, total value, value by branch, category breakdown, index ratios, and rotation performance across all branches.
              </p>
            </div>
            <div>
              <div class="cover-kpi"><span class="ck-label">Total Stock Quantity</span><p class="ck-value">${fn(grandTotalQty)}</p><span style="font-size:10px;color:#9ca3af">all branches</span></div>
              <div class="cover-kpi"><span class="ck-label">Total Stock Value</span><p class="ck-value" style="color:#14b8a6">${fc(grandTotalValue)}</p><span style="font-size:10px;color:#9ca3af">${branches.length} branches</span></div>
              <div class="cover-kpi"><span class="ck-label">Avg Rotation Rate</span><p class="ck-value" style="color:#6366f1">${avgRotation.toFixed(2)}×</p><span style="font-size:10px;color:#9ca3af">annualised</span></div>
              <div class="cover-kpi"><span class="ck-label">Categories Tracked</span><p class="ck-value" style="font-size:22px">${categories.length}</p><span style="font-size:10px;color:#9ca3af">${totalProducts} products</span></div>
            </div>
          </div>
          <div class="cover-bottom">
            <div style="font-size:10px;color:#9ca3af">
              Generated ${genDate} · ${activeDate ? `Snapshot: ${activeDate}` : `Year: ${selectedYear}`} · ${branches.length} branches · ${categories.length} categories
            </div>
            <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#14b8a6;border:1.5px solid #a7f3d0;padding:3px 10px;border-radius:20px;background:#ecfdf5">Confidential</span>
          </div>
        </div>
      </div>`;

    // ── Assemble & print ──────────────────────────────────────────────────────
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Inventory Turnover — ${esc(activeDate || selectedYear)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet"/>
      <style>${css_str}</style>
    </head><body>
      ${cover}
      ${sec1}${sec2}${sec3}${sec4}${sec5}${sec6}
    </body></html>`);
    doc.close();

    iframe.style.visibility = 'visible';
    iframe.style.zIndex = '9999';

    const cleanup = () => {
      iframe.style.visibility = 'hidden';
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1500);
    };
    const triggerPrint = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.print(); }
    };
    iframe.onload = () => setTimeout(triggerPrint, 800);
    setTimeout(triggerPrint, 1800);
    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = cleanup;
      setTimeout(cleanup, 90000);
    }
  };

  // ── Early states ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, minHeight: 400, justifyContent: 'center' }}>
      <Spin /><p style={{ fontSize: 14, color: css.mutedFg }}>Loading inventory data…</p>
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
      <div style={{ ...card, background: `linear-gradient(135deg, ${C.teal}08, ${C.indigo}05)`, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.teal}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={24} style={{ color: C.teal }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: css.fg, margin: 0, letterSpacing: '-0.03em' }}>Inventory Turnover Report</h1>
              <p style={{ fontSize: 12, color: css.mutedFg, margin: '3px 0 0' }}>
                {activeDate ? <>Snapshot: <strong>{activeDate}</strong></> : <>Year: <strong>{selectedYear}</strong></>}
                &nbsp;·&nbsp; {branches.length} branches &nbsp;·&nbsp; {categories.length} categories
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} />Refresh
            </button>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.teal}40`, background: `${C.teal}10`, color: C.teal, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={13} />Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 16, borderTop: `1px solid ${css.border}` }}>
          {dateOptions.length > 0 && (
            <StyledDropdown label="Snapshot Date" options={dateOptions} value={activeSnapshotId}
              onChange={v => {
                setActiveSnapshotId(v);
                const snap = snapshots.find(s => s.id === v);
                if (snap) setActiveDate(snap.display);
              }}
              isOpen={openDropdown === 'date'} onToggle={() => setOpenDropdown(o => o === 'date' ? null : 'date')} onClose={() => setOpenDropdown(null)} />
          )}
          <StyledDropdown label="Year (Rotation KPI)" options={yearOptions} value={selectedYear}
            onChange={v => setSelectedYear(v)}
            isOpen={openDropdown === 'year'} onToggle={() => setOpenDropdown(o => o === 'year' ? null : 'year')} onClose={() => setOpenDropdown(null)} />
        </div>
      </div>

      {/* ══ PRINTABLE CONTENT ══ */}
      <div id="itr-printable">

        {/* ── GLOBAL KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }}>
          <KCard label="Total Stock Quantity" value={formatNumber(grandTotalQty)} sub="All branches combined" accent={C.teal} Icon={Package} />
          <KCard label="Total Stock Value" value={formatCurrency(grandTotalValue)} sub={`${branches.length} branches`} accent={C.indigo} Icon={DollarSign} />
          <KCard label="Avg Rotation Rate" value={`${avgRotation.toFixed(2)}×`} sub={`${selectedYear} · annualised`} accent={C.violet} Icon={RotateCcw}
            badge={{ text: avgRotation >= 4 ? 'Healthy' : 'Monitor', good: avgRotation >= 4 }} />
          <KCard label="Slow / Zero Stock" value={`${lowRotCount} / ${zeroStockCount}`} sub={`of ${totalProducts} products`} accent={C.amber} Icon={AlertTriangle}
            badge={{ text: zeroStockCount === 0 ? 'All stocked' : `${zeroStockCount} stockout`, good: zeroStockCount === 0 }} />
        </div>

        {/* ════════════════════════════════════════
            SECTION 1 — INVENTORY QUANTITY
            (كمية المخزن)
        ════════════════════════════════════════ */}
        <div style={{ marginBottom: 52 }}>
          <SecHead n={1} title="Inventory Quantity" sub="Total stock quantity — global & per branch (كمية المخزن)" color={C.teal} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <KCard label="Total Stock Qty" value={formatNumber(grandTotalQty)} sub="All products, all branches" accent={C.teal} Icon={Package} />
            <KCard label="Total Products" value={formatNumber(totalProducts || categories.length)} sub="Products with stock data" accent={C.indigo} Icon={Layers} />
            <KCard label="Zero-Stock Items" value={String(zeroStockCount)} sub="Require immediate restock" accent={C.rose} Icon={Archive}
              badge={{ text: zeroStockCount === 0 ? 'All stocked' : 'Action needed', good: zeroStockCount === 0 }} />
          </div>

          {/* Quantity by Branch */}
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Stock Quantity by Branch</h3>
            <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Units in stock per branch — {activeDate || selectedYear}</p>
            {sortedBranches.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sortedBranches} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                  <XAxis dataKey="branch" tick={ax} axisLine={false} tickLine={false} />
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
                  <RTooltip content={<Tip isCurrency={false} />} />
                  <Bar dataKey="total_qty" name="Stock Qty" radius={[6, 6, 0, 0]}>
                    {sortedBranches.map((_, i) => <Cell key={i} fill={BRANCH_PAL[i % BRANCH_PAL.length]} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — INVENTORY VALUE
            (قيمة المخزن)
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={2} title="Inventory Value" sub="Total stock value in LYD — global & breakdown (قيمة المخزن)" color={C.indigo} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <KCard label="Total Stock Value" value={formatCurrency(grandTotalValue)} sub="All branches combined" accent={C.indigo} Icon={DollarSign} />
            <KCard label="Avg Value per Unit" value={formatCurrency(grandTotalQty > 0 ? grandTotalValue / grandTotalQty : 0)} sub="Average cost price per unit" accent={C.violet} Icon={TrendingUp} />
            <KCard label="Highest Value Branch" value={(sortedBranches[0]?.branch ?? '—').slice(0, 18)} sub={formatCurrency(sortedBranches[0]?.total_value ?? 0)} accent={C.teal} Icon={BarChart3} />
          </div>

          {/* Value by Branch */}
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Stock Value by Branch</h3>
            <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Total inventory value per branch — {activeDate || selectedYear}</p>
            {sortedBranches.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sortedBranches} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                  <XAxis dataKey="branch" tick={ax} axisLine={false} tickLine={false} />
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <RTooltip content={<Tip isCurrency={true} />} />
                  <Bar dataKey="total_value" name="Stock Value" radius={[6, 6, 0, 0]}>
                    {sortedBranches.map((_, i) => <Cell key={i} fill={BRANCH_PAL[i % BRANCH_PAL.length]} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 3 — STOCK VALUE PER BRANCH
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={3} title="Stock Value per Branch" sub="Detailed breakdown — value, quantity, and share of total (قيمة مخزون لكل فرع)" color={C.violet} />

          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Branch Summary</h3>
            <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Qty, value, share and distribution per branch</p>

            {sortedBranches.length === 0 ? <Empty /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: css.muted }}>
                      {['Branch', 'Qty', 'Value (LYD)', '% of Total', 'Distribution'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Branch' || h === 'Distribution' ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: css.mutedFg, borderBottom: `2px solid ${css.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBranches.map((b, i) => {
                      const share = pct(num(b.total_value), grandTotalValue);
                      const color = BRANCH_PAL[i % BRANCH_PAL.length];
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${css.border}`, background: i % 2 === 0 ? 'transparent' : `${css.muted}40` }}>
                          {/* Branch name */}
                          <td style={{ padding: '9px 10px', fontWeight: 600, color: css.cardFg }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                              {b.branch}
                            </div>
                          </td>
                          {/* Qty */}
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: css.mutedFg, fontWeight: 600 }}>
                            {formatNumber(b.total_qty)}
                          </td>
                          {/* Value */}
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color }}>
                            {formatCurrency(b.total_value)}
                          </td>
                          {/* % badge */}
                          <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 12, background: `${color}18`, color }}>
                              {share}%
                            </span>
                          </td>
                          {/* Progress bar */}
                          <td style={{ padding: '9px 10px', minWidth: 120 }}>
                            <div style={{ height: 6, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 999, width: `${share}%`, background: `linear-gradient(90deg, ${color}60, ${color})`, transition: 'width 0.6s ease' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr style={{ borderTop: `2px solid ${css.border}`, background: `${C.indigo}06` }}>
                      <td style={{ padding: '9px 10px', fontWeight: 800, color: css.cardFg }}>TOTAL</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: C.indigo }}>{formatNumber(grandTotalQty)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: C.indigo }}>{formatCurrency(grandTotalValue)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: C.indigo }}>100%</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 4 — VALUE BY INDEX / CATEGORY
            (قيمة المخزون بالفهرس)
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={4} title="Inventory Value by Index / Category" sub="Total stock value and quantity per product index/category (قيمة المخزون بالفهرس)" color={C.amber} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <KCard label="Total Categories" value={String(categories.length)} sub="Product indexes tracked" accent={C.amber} Icon={Layers} />
            <KCard label="Top Category Value" value={formatCurrency(sortedCategories[0]?.total_value ?? 0)} sub={(sortedCategories[0]?.category ?? '—').slice(0, 22)} accent={C.teal} Icon={TrendingUp} />
            <KCard label="Top Category Share" value={`${pct(num(sortedCategories[0]?.total_value), catTotalValue)}%`} sub="Of total inventory value" accent={C.violet} Icon={BarChart3} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Pie chart */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Category Value Distribution</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Proportion of each index/category in total stock value</p>
              {sortedCategories.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={sortedCategories} dataKey="total_value" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={52} paddingAngle={2}>
                      {sortedCategories.map((_, i) => <Cell key={i} fill={CAT_PAL[i % CAT_PAL.length]} fillOpacity={0.88} />)}
                    </Pie>
                    <RTooltip content={<Tip isCurrency={true} />} />
                    <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Horizontal bar chart */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Category Value Comparison</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Stock value ranked by category</p>
              {sortedCategories.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sortedCategories} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }} barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false} />
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" width={130} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <RTooltip content={<Tip isCurrency={true} />} />
                    <Bar dataKey="total_value" name="Value" radius={[0, 6, 6, 0]}>
                      {sortedCategories.map((_, i) => <Cell key={i} fill={CAT_PAL[i % CAT_PAL.length]} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 5 — INDEX VALUE / RATIO IN STOCK
            (قيمة / نسبة الفهارس في مخزون)
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={5} title="Index Value / Ratio in Stock" sub="Percentage share of each category in total inventory — value & quantity (قيمة / نسبة الفهارس في مخزون)" color={C.orange} />

          {sortedCategories.length === 0 ? (
            <div style={card}><Empty text="No category data available" /></div>
          ) : (
            <>
              {/* Category ratio cards grid */}
              <div style={card}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Category / Index Inventory Ratio</h3>
                <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 16 }}>Each index as a percentage of total stock — value & quantity</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {sortedCategories.map((c, i) => {
                    const valShare = pct(num(c.total_value), catTotalValue);
                    const qtyShare = pct(num(c.total_qty), grandTotalQty);
                    return (
                      <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: i < 3 ? `${CAT_PAL[i % CAT_PAL.length]}08` : css.bg, border: `1px solid ${i < 3 ? CAT_PAL[i % CAT_PAL.length] + '20' : css.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ width: 20, height: 20, borderRadius: 6, background: `${CAT_PAL[i % CAT_PAL.length]}18`, color: CAT_PAL[i % CAT_PAL.length], fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category || 'Uncategorized'}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: `${CAT_PAL[i % CAT_PAL.length]}18`, color: CAT_PAL[i % CAT_PAL.length] }}>{valShare}% val</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: `${C.indigo}12`, color: C.indigo }}>{qtyShare}% qty</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: css.mutedFg, marginBottom: 3 }}>
                              <span>Value</span><span>{formatCurrency(c.total_value)}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 999, width: `${valShare}%`, background: CAT_PAL[i % CAT_PAL.length], transition: 'width 0.6s' }} />
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: css.mutedFg, marginBottom: 3 }}>
                              <span>Qty</span><span>{formatNumber(c.total_qty)}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 999, width: `${qtyShare}%`, background: C.indigo, transition: 'width 0.6s' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category detail table */}
              <div style={{ ...card, marginTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 16px' }}>Index / Category Detail Table</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${css.border}`, background: css.muted }}>
                        {['#', 'Category / Index', 'Total Qty', 'Total Value', 'Value %', 'Qty %'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: h === '#' || h === 'Category / Index' ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: css.mutedFg }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCategories.map((c, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${css.border}`, background: i % 2 === 0 ? 'transparent' : `${css.muted}40` }}>
                          <td style={{ padding: '8px 12px', color: css.mutedFg, fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: css.cardFg }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_PAL[i % CAT_PAL.length] }} />
                              {c.category || 'Uncategorized'}
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: css.mutedFg }}>{formatNumber(c.total_qty)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: CAT_PAL[i % CAT_PAL.length] }}>{formatCurrency(c.total_value)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: CAT_PAL[i % CAT_PAL.length] }}>{pct(num(c.total_value), catTotalValue)}%</span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: C.indigo }}>{pct(num(c.total_qty), grandTotalQty)}%</span>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: `2px solid ${css.border}`, background: `${C.amber}06` }}>
                        <td /><td style={{ padding: '8px 12px', fontWeight: 800, color: css.cardFg }}>TOTAL</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 900, color: C.indigo }}>{formatNumber(grandTotalQty)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 900, color: C.amber }}>{formatCurrency(catTotalValue)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: C.amber }}>100%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: C.indigo }}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ════════════════════════════════════════
            SECTION 6 — ROTATION & SLOW-MOVING
            (عام وبكل فرع — Global & Per Branch)
        ════════════════════════════════════════ */}
        <div data-print="section" style={{ marginBottom: 52 }}>
          <SecHead n={6} title="Rotation Rate & Slow-Moving Items" sub="Fast-moving vs. slow-moving · coverage at risk · global & per branch (عام وبكل فرع)" color={C.rose} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
            <KCard label="Avg Rotation Rate" value={`${avgRotation.toFixed(2)}×`} sub="Stock turns per year" accent={C.teal} Icon={RotateCcw}
              badge={{ text: avgRotation >= 4 ? 'Healthy' : 'Low', good: avgRotation >= 4 }} />
            <KCard label="Low Rotation Products" value={String(lowRotCount)} sub={`Below ${stockKpi?.stock_summary?.low_rotation_threshold ?? 1}× per year`} accent={C.amber} Icon={AlertTriangle}
              badge={{ text: lowRotCount === 0 ? 'All good' : 'Review needed', good: lowRotCount === 0 }} />
            <KCard label="Zero Stock Products" value={String(zeroStockCount)} sub="Stockout — reorder needed" accent={C.rose} Icon={Archive}
              badge={{ text: zeroStockCount === 0 ? '✓ Fully stocked' : `${zeroStockCount} stockouts`, good: zeroStockCount === 0 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minWidth: 0 }}>

            {/* Top rotation products */}
            <div style={{ ...card, minWidth: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.emerald, margin: '0 0 4px' }}>🏆 Fastest Moving Products</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Highest rotation rate — top performers</p>
              {topRotation.length === 0 ? <Empty text="No rotation data" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topRotation.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: i < 3 ? `${C.emerald}08` : css.bg, border: `1px solid ${i < 3 ? C.emerald + '20' : css.border}` }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: i < 3 ? `${C.emerald}18` : css.muted, color: i < 3 ? C.emerald : css.mutedFg, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</p>
                        <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>Stock: {formatNumber(p.stock_qty)} · {formatCurrency(p.stock_value)}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: `${C.emerald}18`, color: C.emerald, border: `1px solid ${C.emerald}30`, whiteSpace: 'nowrap' }}>{p.rotation_rate.toFixed(2)}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slow-moving products */}
            <div style={{ ...card, minWidth: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.rose, margin: '0 0 4px' }}>⚠️ Slow-Moving Products</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Lowest rotation rate — require attention</p>
              {lowRotation.length === 0 ? <Empty text="No slow-moving products" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {lowRotation.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: p.rotation_rate === 0 ? `${C.rose}08` : css.bg, border: `1px solid ${p.rotation_rate === 0 ? C.rose + '25' : css.border}` }}>
                      <AlertTriangle size={14} style={{ color: p.rotation_rate === 0 ? C.rose : C.amber, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: css.cardFg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</p>
                        <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>Stock: {formatNumber(p.stock_qty)} · {formatCurrency(p.stock_value)}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: p.rotation_rate === 0 ? `${C.rose}18` : `${C.amber}18`, color: p.rotation_rate === 0 ? C.rose : C.amber, border: `1px solid ${p.rotation_rate === 0 ? C.rose : C.amber}30`, whiteSpace: 'nowrap' }}>{p.rotation_rate.toFixed(2)}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rotation rate distribution chart */}
          {topRotation.length > 0 && (
            <div style={{ ...card, marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: '0 0 4px' }}>Rotation Rate — Top Products</h3>
              <p style={{ fontSize: 12, color: css.mutedFg, marginBottom: 14 }}>Stock turnover rate per product — green ≥ 4×, amber ≥ 2×, red &lt; 2×</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topRotation.slice(0, 10)} margin={{ left: 0, right: 4, top: 4, bottom: 44 }} barCategoryGap="12%">
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false} />
                  <XAxis dataKey="product_name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={54} />
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(1)}×`} />
                  <RTooltip content={<Tip isCurrency={false} />} />
                  <Bar dataKey="rotation_rate" name="Rotation ×" radius={[5, 5, 0, 0]}>
                    {topRotation.slice(0, 10).map((p, i) => (
                      <Cell key={i} fill={p.rotation_rate >= 4 ? C.emerald : p.rotation_rate >= 2 ? C.amber : C.rose} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
