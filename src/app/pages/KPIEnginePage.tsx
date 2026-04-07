// src/app/pages/KPIEnginePage.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import {
  TrendingUp, Package, DollarSign, BarChart3,
  Info, RefreshCw, Loader2, ChevronDown, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { CreditKPISection } from '../components/CreditKPISection';
import { SalesKPISection } from '../components/SalesKPISection';
import { StockKPISection } from '../components/StockKPISection';
import {
  MOVEMENT_TYPES,
  useTransactionSummary,
  useBranchBreakdown,
  useTypeBreakdown,
  useBranchMonthly,
  useBranchSummary,
  useAgingSnapshots,
  useAgingList,
  type MonthlySummaryItem,
} from '../lib/dataHooks';
import { inventoryApi } from '../lib/dataApi';
import { formatCurrency, formatNumber } from '../lib/utils';

// ── Brand palette ──────────────────────────────────────────────────────────

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

const BRANCH_COLORS = [C.indigo, C.cyan, C.teal, C.emerald, C.amber, C.rose, C.violet];

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

const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const legendStyle = { fontSize: 12, color: 'hsl(var(--muted-foreground))', paddingTop: 8 };

// ── Custom Tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 12, minWidth: 220, maxWidth: 300 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: css.cardFg, paddingBottom: 8, borderBottom: `1px solid ${css.border}`, margin: '0 0 8px 0' }}>{label}</p>
      <div style={{ marginTop: 10 }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 8 : 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.fill ?? p.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: css.mutedFg, flex: 1 }}>{p.name}</span>
            <span style={{ fontWeight: 700, color: css.cardFg }}>{typeof p.value === 'number' ? formatCurrency(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Loader / Empty ─────────────────────────────────────────────────────────

function Loader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 8, color: css.mutedFg }}>
      <Loader2 size={15} className="animate-spin" />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

function Empty({ height = 120 }: { height?: number }) {
  return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 13 }}>No data available</div>;
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KPI({ title, value, icon: Icon, accent, sub, trend, globalOnly }: {
  title: string; value: React.ReactNode; icon: LucideIcon; accent: string;
  sub?: string; trend?: { value: number; isPositive: boolean }; globalOnly?: boolean;
}) {
  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${accent}`, paddingTop: 20 }}>
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: accent, opacity: 0.06, pointerEvents: 'none' }} />
      {/* Badge Global — affiché si la card n'est pas filtrable par branch */}
      {globalOnly && (
        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: css.mutedFg, background: css.muted, borderRadius: 6, padding: '2px 7px', border: `1px solid ${css.border}` }}>
          Global
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        {!globalOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: trend?.isPositive === false ? C.rose : C.emerald, background: trend?.isPositive === false ? `${C.rose}12` : `${C.emerald}12`, border: `1px solid ${trend?.isPositive === false ? C.rose : C.emerald}25`, padding: '3px 8px', borderRadius: 20 }}>
            <ArrowUpRight size={10} />
            {trend ? `${trend.value.toFixed(1)}%` : '—'}
          </div>
        )}
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: css.cardFg, marginTop: 5, marginBottom: 4, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: css.mutedFg, marginBottom: 14 }}>{sub}</p>}
      {!sub && <div style={{ marginBottom: 14 }} />}
      <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: '64%', background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
      </div>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────

function Panel({ title, sub, children, action }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>{title}</h3>
          {sub && <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 style={{ fontSize: 18, fontWeight: 800, color: css.fg, letterSpacing: '-0.02em', margin: '0 0 16px 0' }}>{title}</h2>;
}

// ── Period helpers ─────────────────────────────────────────────────────────

type PeriodKey = 'last_month' | 'last_3' | 'last_6' | 'last_year' | 'ytd';

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3',     label: 'Last 3 Months' },
  { key: 'last_6',     label: 'Last 6 Months' },
  { key: 'last_year',  label: 'Last Year' },
  { key: 'ytd',        label: 'Year to Date' },
];

function periodToDates(key: PeriodKey): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateTo = fmt(today);
  if (key === 'last_month') {
    return { dateFrom: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)), dateTo: fmt(new Date(today.getFullYear(), today.getMonth(), 0)) };
  }
  if (key === 'last_3')  { const f = new Date(today); f.setMonth(f.getMonth() - 3);    return { dateFrom: fmt(f), dateTo }; }
  if (key === 'last_6')  { const f = new Date(today); f.setMonth(f.getMonth() - 6);    return { dateFrom: fmt(f), dateTo }; }
  if (key === 'last_year') {
    const y = today.getFullYear() - 1;
    return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
  }
  return { dateFrom: `${today.getFullYear()}-01-01`, dateTo };
}

// ── StyledDropdown ─────────────────────────────────────────────────────────

function StyledDropdown({ label, options, value, onChange, isOpen, onToggle, onClose }: {
  label: string; options: { key: string; label: string }[]; value: string;
  onChange: (v: string) => void; isOpen: boolean; onToggle: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const current = options.find(o => o.key === value)?.label ?? label;

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen, onClose]);

  const menu = isOpen ? createPortal(
    <div style={{ position: 'absolute', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 9999, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: 280, overflowY: 'auto', padding: 6 }}>
      {options.map(opt => (
        <button key={opt.key} onMouseDown={e => e.stopPropagation()} onClick={() => { onChange(opt.key); onClose(); }}
          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: value === opt.key ? `${C.indigo}15` : 'transparent', color: value === opt.key ? C.indigo : '#111827', fontWeight: value === opt.key ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {opt.label}
          {value === opt.key && <span style={{ color: C.indigo, fontSize: 12 }}>✓</span>}
        </button>
      ))}
    </div>, document.body,
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

// ── FilterBar ──────────────────────────────────────────────────────────────

function FilterBar({ period, onPeriodChange, branch, onBranchChange, branches }: {
  period: PeriodKey; onPeriodChange: (k: PeriodKey) => void;
  branch: string; onBranchChange: (b: string) => void; branches: string[];
}) {
  const [openDropdown, setOpenDropdown] = useState<'period' | 'branch' | null>(null);
  const branchOptions = [{ key: '', label: 'All Branches' }, ...branches.map(b => ({ key: b, label: b }))];

  return (
    <Panel title="Filters" sub="Customize your view — all charts update automatically">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <StyledDropdown label="Period" options={PERIOD_OPTIONS} value={period} onChange={v => onPeriodChange(v as PeriodKey)}
          isOpen={openDropdown === 'period'} onToggle={() => setOpenDropdown(o => o === 'period' ? null : 'period')} onClose={() => setOpenDropdown(null)} />
        <StyledDropdown label="Branch" options={branchOptions} value={branch} onChange={onBranchChange}
          isOpen={openDropdown === 'branch'} onToggle={() => setOpenDropdown(o => o === 'branch' ? null : 'branch')} onClose={() => setOpenDropdown(null)} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ height: 23 }} />
          <button onClick={() => { onPeriodChange('ytd'); onBranchChange(''); }} disabled={period === 'ytd' && !branch}
            style={{ height: 38, padding: '0 18px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer', opacity: period === 'ytd' && !branch ? 0.45 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
            Reset filters
          </button>
        </div>
      </div>
    </Panel>
  );
}

// ── ActiveFilterBadge ──────────────────────────────────────────────────────

function ActiveFilterBadge({ period, branch }: { period: PeriodKey; branch: string }) {
  const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.label ?? period;
  if (period === 'ytd' && !branch) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.indigo}10`, border: `1px solid ${C.indigo}25`, borderRadius: 20, padding: '4px 12px', marginBottom: 16 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.indigo, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: C.indigo, fontWeight: 600 }}>Filtered: {periodLabel}{branch ? ` · ${branch}` : ''}</span>
    </div>
  );
}

// ── BranchMonthlyChart ─────────────────────────────────────────────────────

function BranchMonthlyChart({ branchFilter, dateFrom, dateTo }: { branchFilter: string; dateFrom: string; dateTo: string }) {
  const { data, loading } = useBranchMonthly({ movement_type: MOVEMENT_TYPES.SALE, date_from: dateFrom, date_to: dateTo });

  if (loading) return <Panel title="Revenue Trend by Branch" sub="Monthly sales revenue — one line per branch"><Loader label="Loading…" /></Panel>;
  if (!data || data.monthly_data.length === 0) return <Panel title="Revenue Trend by Branch" sub="Monthly sales revenue — one line per branch"><Empty height={200} /></Panel>;

  const visibleBranches = branchFilter
    ? data.branches.filter(b => b.toLowerCase().includes(branchFilter.toLowerCase()))
    : data.branches;

  return (
    <Panel title="Revenue Trend by Branch" sub={`Monthly sales revenue${branchFilter ? ` · ${branchFilter}` : ' — all branches'}`}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data.monthly_data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {visibleBranches.map((branch, i) => (
              <linearGradient key={branch} id={`kpi-gb-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0.22} />
                <stop offset="55%"  stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0.06} />
                <stop offset="100%" stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0}    />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} dy={6}
            tickFormatter={(v, i) => { const row = data.monthly_data[i]; return row ? `${v} ${row.year}` : String(v); }} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickCount={5} width={36} />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 3' }} />
          <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={18} />
          {visibleBranches.map((branch, i) => (
            <Area key={branch} type="natural" dataKey={branch} stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]} strokeWidth={2}
              fill={`url(#kpi-gb-${i})`} dot={false} activeDot={{ r: 5, fill: css.card, stroke: BRANCH_COLORS[i % BRANCH_COLORS.length], strokeWidth: 2 }} name={branch} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  );
}

// ── KPIEnginePage ──────────────────────────────────────────────────────────

export function KPIEnginePage() {
  const [period,       setPeriod]       = useState<PeriodKey>('ytd');
  const [branchFilter, setBranchFilter] = useState('');
  const currentYear = new Date().getFullYear();
  const targetYear = period === 'last_year' ? currentYear - 1 : currentYear;

  const { dateFrom, dateTo } = useMemo(() => periodToDates(period), [period]);

  // ── Hooks — tous filtrés par period + branch ───────────────────────────

  // ✅ Summary filtré par period + branch
  const { data: summaryRes, loading: summaryLoading, refetch: refetchSummary } = useTransactionSummary({
    date_from: dateFrom,
    date_to:   dateTo,
    branch:    branchFilter || undefined,
  });

  // Branch breakdowns pour la liste des branches disponibles + perf chart
  const { data: branchSalesRes,     refetch: refetchBranchSales }     = useBranchBreakdown({ movement_type: MOVEMENT_TYPES.SALE,     date_from: dateFrom, date_to: dateTo });
  const { data: branchPurchasesRes, refetch: refetchBranchPurchases } = useBranchBreakdown({ movement_type: MOVEMENT_TYPES.PURCHASE, date_from: dateFrom, date_to: dateTo });

  // ✅ Type breakdown filtré par period + branch
  const { data: typeBreakdownRes, refetch: refetchTypeBreakdown } = useTypeBreakdown({
    date_from: dateFrom,
    date_to:   dateTo,
    branch:    branchFilter || undefined,
  });

  // Stock / receivables cards are global and year-based.
  const [targetInventorySnapshotId, setTargetInventorySnapshotId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveSnapshotForYear = async () => {
      try {
        let page = 1;
        const pageSize = 100;
        let totalPages = 1;
        let foundId: string | null = null;
        const allSnapshots: Array<{
          id: string;
          snapshot_date?: string | null;
          fiscal_year?: string | null;
          uploaded_at?: string | null;
        }> = [];

        const extractYear = (raw?: string | null): number | null => {
          if (!raw) return null;
          const asDate = new Date(raw);
          if (!Number.isNaN(asDate.getTime())) return asDate.getFullYear();
          const m = String(raw).match(/(19|20)\d{2}/);
          return m ? parseInt(m[0], 10) : null;
        };

        while (page <= totalPages) {
          const res = await inventoryApi.listSnapshots({ page, page_size: pageSize });
          totalPages = res.total_pages ?? 1;
          allSnapshots.push(...(res.items ?? []));

          for (const s of res.items ?? []) {
            const ySnapshot = extractYear(s.snapshot_date);
            const yFiscal = extractYear(String(s.fiscal_year ?? ''));
            const yUpload = extractYear(s.uploaded_at);
            const year = ySnapshot ?? yFiscal ?? yUpload;
            if (year === targetYear) {
              foundId = s.id;
              break;
            }
          }

          if (foundId) break;
          page += 1;
        }

        if (!foundId && allSnapshots.length > 0) {
          const sortByBestDateDesc = [...allSnapshots].sort((a, b) => {
            const da = new Date(String(a.snapshot_date ?? a.uploaded_at ?? '')).getTime();
            const db = new Date(String(b.snapshot_date ?? b.uploaded_at ?? '')).getTime();
            return db - da;
          });

          if (period === 'last_year') {
            // Fallback: if year tags are missing, use the snapshot just before the latest one.
            foundId = sortByBestDateDesc[1]?.id ?? null;
          } else {
            foundId = sortByBestDateDesc[0]?.id ?? null;
          }
        }

        if (mounted) setTargetInventorySnapshotId(foundId);
      } catch {
        if (mounted) setTargetInventorySnapshotId(null);
      }
    };

    resolveSnapshotForYear();

    return () => {
      mounted = false;
    };
  }, [period, targetYear]);

  const branchStockGlobal = useBranchSummary(
    targetInventorySnapshotId
      ? { snapshot_id: targetInventorySnapshotId, branch: branchFilter || undefined }
      : undefined,
  );

  const stockValue = useMemo(
    () =>
      targetInventorySnapshotId
        ? (branchStockGlobal.data?.branches ?? []).reduce((sum, b) => sum + b.total_value, 0)
        : 0,
    [branchStockGlobal.data, targetInventorySnapshotId],
  );

  const agingSnapshots = useAgingSnapshots();
  const targetAgingSnapshotId = useMemo(() => {
    const items = agingSnapshots.data?.items ?? [];
    const yearItems = items.filter((s) => {
      const source = String(s.report_date ?? s.uploaded_at ?? "");
      const parsed = new Date(source);
      if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear() === targetYear;
      return source.includes(String(targetYear));
    });
    yearItems.sort((a, b) => {
      const da = new Date(String(a.report_date ?? a.uploaded_at)).getTime();
      const db = new Date(String(b.report_date ?? b.uploaded_at)).getTime();
      return db - da;
    });
    if (yearItems[0]?.id) return yearItems[0].id;

    const sortedAll = [...items].sort((a, b) => {
      const da = new Date(String(a.report_date ?? a.uploaded_at)).getTime();
      const db = new Date(String(b.report_date ?? b.uploaded_at)).getTime();
      return db - da;
    });

    if (period === 'last_year') return sortedAll[1]?.id;
    return sortedAll[0]?.id;
  }, [agingSnapshots.data, period, targetYear]);

  const agingGlobal = useAgingList(
    targetAgingSnapshotId
      ? { snapshot_id: targetAgingSnapshotId, page_size: 1 }
      : { page_size: 1 },
  );
  const totalReceivables = targetAgingSnapshotId ? (agingGlobal.data?.grand_total ?? 0) : 0;

  const refetchAll = () => {
    refetchSummary();
    refetchBranchSales();
    refetchBranchPurchases();
    refetchTypeBreakdown();
    branchStockGlobal.refetch();
    agingSnapshots.refetch();
    agingGlobal.refetch();
  };

  // ── Données dérivées ───────────────────────────────────────────────────

  const monthlySummary: MonthlySummaryItem[] = summaryRes?.summary ?? [];

  const monthlySalesData = [...monthlySummary]
    .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))
    .map(m => ({ month: `${m.month_label} ${m.year}`, sales: m.total_sales, purchases: m.total_purchases }));

  const branchSales     = branchSalesRes?.branches     ?? [];
  const branchPurchases = branchPurchasesRes?.branches ?? [];

  // Liste de toutes les branches disponibles (depuis les transactions de la période)
  const allBranches = useMemo(
    () => Array.from(new Set([...branchSales.map(b => b.branch), ...branchPurchases.map(b => b.branch)])).sort(),
    [branchSales, branchPurchases],
  );

  // Branch Performance chart — filtré client-side par branch sélectionné
  const branchPerformanceData = useMemo(
    () => allBranches
      .filter(b => !branchFilter || b === branchFilter)
      .map(branch => ({
        branch,
        sales:     branchSales.find(b => b.branch === branch)?.total     ?? 0,
        purchases: branchPurchases.find(b => b.branch === branch)?.total ?? 0,
      })),
    [allBranches, branchFilter, branchSales, branchPurchases],
  );

  const typeData = useMemo(
    () => (typeBreakdownRes?.breakdown ?? []).map(t => ({ name: t.movement_type, in: t.total_in, out: t.total_out, count: t.count })),
    [typeBreakdownRes],
  );

  // KPIs agrégés depuis les données filtrées
  const totalSales = useMemo(() => monthlySummary.reduce((s, m) => s + m.total_sales, 0), [monthlySummary]);

  const totalPurchases = useMemo(() => {
    // Si branch sélectionné, utiliser le total de ce branch depuis branchPurchasesRes
    if (branchFilter) {
      const found = branchPurchasesRes?.branches.find(b => b.branch === branchFilter);
      if (found) return found.total;
    }
    // Sinon, sommer tous les branches
    const fromBranch = branchPurchasesRes?.branches.reduce((s, b) => s + b.total, 0);
    if (fromBranch !== undefined && fromBranch > 0) return fromBranch;
    return monthlySummary.reduce((s, m) => s + m.total_purchases, 0);
  }, [branchPurchasesRes, branchFilter, monthlySummary]);

  const totalPurchasesCount = useMemo(
    () => (typeBreakdownRes?.breakdown ?? []).find(t => t.movement_type === MOVEMENT_TYPES.PURCHASE)?.count ?? 0,
    [typeBreakdownRes],
  );

  const grossMargin = totalSales > 0 ? ((totalSales - totalPurchases) / totalSales) * 100 : 0;

  const lastTwo    = monthlySummary.slice(-2);
  const salesTrend = lastTwo.length === 2 && lastTwo[0].total_sales > 0
    ? { value: Math.abs(((lastTwo[1].total_sales - lastTwo[0].total_sales) / lastTwo[0].total_sales) * 100), isPositive: lastTwo[1].total_sales >= lastTwo[0].total_sales }
    : undefined;

  const isLoading   = summaryLoading;
  const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.label ?? period;

  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>KPI Engine</h1>
          <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>Automated calculation and monitoring of key performance indicators</p>
        </div>
        <button onClick={refetchAll} disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ marginBottom: 24 }}>
        <FilterBar period={period} onPeriodChange={setPeriod} branch={branchFilter} onBranchChange={setBranchFilter} branches={allBranches} />
      </div>

      <ActiveFilterBadge period={period} branch={branchFilter} />

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12, color: css.mutedFg }}>
          <Loader2 size={20} className="animate-spin" style={{ color: C.indigo }} />
          <span style={{ fontSize: 14 }}>Loading KPIs…</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Business Overview KPIs ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader title="Business Overview" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

              {/* ✅ Filtré par period + branch */}
              <KPI title="Total Sales" value={formatCurrency(totalSales)} icon={TrendingUp} accent={C.indigo} trend={salesTrend} />

              {/* ✅ Filtré par period + branch */}
              <KPI title="Total Purchases" value={formatCurrency(totalPurchases)} icon={DollarSign} accent={C.amber}
                sub={`${formatNumber(totalPurchasesCount)} operations`} />

              {/* ✅ Filtré par branch via useBranchSummary */}
              <KPI
                title="Stock Value"
                value={formatCurrency(stockValue)}
                icon={Package}
                accent={C.cyan}
                sub={branchFilter ? `Branch: ${branchFilter} · ${targetYear}` : `All branches · ${targetYear}`}
              />

              {/* ⚠️ Non filtrable par branch (aging = dimension client, pas branch) */}
              <KPI
                title="Total Receivables"
                value={formatCurrency(totalReceivables)}
                icon={BarChart3}
                accent={C.violet}
                sub={`Global · ${targetYear}`}
                globalOnly
              />

              {/* ✅ Filtré par period + branch */}
              <KPI title="Gross Margin" value={`${grossMargin.toFixed(1)}%`} icon={BarChart3} accent={C.teal}
                trend={{ value: 0, isPositive: grossMargin > 0 }} />

              {/* Sales / Stock Ratio */}
              <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${C.emerald}`, paddingTop: 20 }}>
                <div style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: C.emerald, opacity: 0.06, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.emerald}15`, border: `1px solid ${C.emerald}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Info size={16} style={{ color: C.emerald }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: C.emerald, background: `${C.emerald}12`, border: `1px solid ${C.emerald}25`, padding: '3px 8px', borderRadius: 20 }}>
                    <ArrowUpRight size={10} />ratio
                  </div>
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>Sales / Stock Ratio</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: css.cardFg, marginTop: 5, marginBottom: 4, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {stockValue > 0 ? `${(totalSales / stockValue).toFixed(2)}x` : '—'}
                </p>
                <p style={{ fontSize: 11, color: css.mutedFg, marginBottom: 14 }}>Sales-to-inventory coverage</p>
                <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, width: '64%', background: `linear-gradient(90deg, ${C.emerald}60, ${C.emerald})` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Sales vs Purchases Monthly ── */}
          <div style={{ marginBottom: 16 }}>
            <Panel title="Sales vs Purchases — Monthly Trend" sub={`${periodLabel}${branchFilter ? ` · ${branchFilter}` : ''}`}>
              {summaryLoading ? <Loader label="Loading…" /> :
               monthlySalesData.length === 0 ? <Empty height={320} /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlySalesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kpiGS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.indigo} stopOpacity={0.28} />
                        <stop offset="55%"  stopColor={C.indigo} stopOpacity={0.08} />
                        <stop offset="100%" stopColor={C.indigo} stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="kpiGP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.amber} stopOpacity={0.28} />
                        <stop offset="55%"  stopColor={C.amber} stopOpacity={0.08} />
                        <stop offset="100%" stopColor={C.amber} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
                    <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} dy={6} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickCount={5} width={36} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 3' }} />
                    <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={18} />
                    <Area type="natural" dataKey="sales"     stroke={C.indigo} strokeWidth={2.5} fill="url(#kpiGS)" name="Sales"     dot={false} activeDot={{ r: 5, fill: css.card, stroke: C.indigo, strokeWidth: 2.5 }} />
                    <Area type="natural" dataKey="purchases" stroke={C.amber}  strokeWidth={2.5} fill="url(#kpiGP)" name="Purchases" dot={false} activeDot={{ r: 5, fill: css.card, stroke: C.amber,  strokeWidth: 2.5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* ── Branch Performance ── */}
          {branchPerformanceData.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Panel title="Branch Performance" sub={`Sales and purchases by branch · ${periodLabel}`}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={branchPerformanceData} barCategoryGap="30%" barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kpiBSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.indigo} stopOpacity={1}    />
                        <stop offset="100%" stopColor={C.indigo} stopOpacity={0.55} />
                      </linearGradient>
                      <linearGradient id="kpiBPurch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.amber} stopOpacity={1}    />
                        <stop offset="100%" stopColor={C.amber} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
                    <XAxis dataKey="branch" tick={axisStyle} axisLine={false} tickLine={false} dy={4} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickCount={5} width={36} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={18} />
                    <Bar dataKey="sales"     fill="url(#kpiBSales)" name="Sales"     radius={[5, 5, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="purchases" fill="url(#kpiBPurch)" name="Purchases" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
          )}

          {/* ── Per-Branch Monthly ── */}
          <div style={{ marginBottom: 16 }}>
            <BranchMonthlyChart branchFilter={branchFilter} dateFrom={dateFrom} dateTo={dateTo} />
          </div>

          {/* ── Movement Type Breakdown ── */}
          {typeData.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Panel title="Movement Type Breakdown" sub={`Inventory movement activity by type${branchFilter ? ` · ${branchFilter}` : ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {typeData.map((t, i) => {
                    const maxVal = Math.max(...typeData.map(x => Math.max(x.in, x.out)), 1);
                    const pct    = ((t.in + t.out) / (maxVal * 2)) * 100;
                    const accent = BRANCH_COLORS[i % BRANCH_COLORS.length];
                    return (
                      <div key={i} style={{ padding: '14px 16px', borderRadius: 12, border: `1px solid ${css.border}`, background: css.bg }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: 0 }}>{t.name}</p>
                            <p style={{ fontSize: 11, color: css.mutedFg, margin: 0 }}>{formatNumber(t.count)} operations</p>
                          </div>
                          <div style={{ display: 'flex', gap: 20 }}>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: css.mutedFg, margin: 0 }}>In</p>
                              <p style={{ fontSize: 13, fontWeight: 700, color: C.emerald, margin: 0 }}>{formatCurrency(t.in)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: css.mutedFg, margin: 0 }}>Out</p>
                              <p style={{ fontSize: 13, fontWeight: 700, color: C.rose, margin: 0 }}>{formatCurrency(t.out)}</p>
                            </div>
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: `linear-gradient(90deg, ${accent}65, ${accent})`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}

          {/* ── Sales / Stock / Credit KPIs ── */}
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${css.border}` }}>
            <SalesKPISection />
          </div>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${css.border}` }}>
            <StockKPISection />
          </div>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${css.border}` }}>
            <CreditKPISection />
          </div>
        </>
      )}
    </div>
  );
}