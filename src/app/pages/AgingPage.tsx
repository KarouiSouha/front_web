// src/app/pages/AgingPage.tsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  RefreshCw, Loader2, AlertCircle, Download,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
  ChevronDown as ChevronDownIcon, ArrowUpRight, ArrowDownRight, Building2,
  Target, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
  AreaChart, Area, Legend
} from 'recharts';
import { useAgingDates, useAgingSnapshots, type AgingRow, type AgingSnapshotItem } from '../lib/dataHooks';
import { formatCurrency } from '../lib/utils';
import { DataTable } from '../components/DataTable';
import { AgingHistoricalTrend } from '../components/AgingHistoricalTrend';

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeRow(r: AgingRow): AgingRow {
  const num = (v: unknown) => { const n = Number(v); return isFinite(n) ? n : 0; };
  return {
    ...r,
    current: num(r.current), d1_30: num(r.d1_30), d31_60: num(r.d31_60),
    d61_90: num(r.d61_90), d91_120: num(r.d91_120), d121_150: num(r.d121_150),
    d151_180: num(r.d151_180), d181_210: num(r.d181_210), d211_240: num(r.d211_240),
    d241_270: num(r.d241_270), d271_300: num(r.d271_300), d301_330: num(r.d301_330),
    over_330: num(r.over_330), total: num(r.total), overdue_total: num(r.overdue_total),
    customer_name: r.customer_name || r.account || null,
  };
}

function getAuthHeaders() {
  const token = localStorage.getItem('fasi_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Period → date range helper ─────────────────────────────────────────────
function periodToDates(period: string): { date_from?: string; date_to?: string } {
  if (period === 'all') return {};
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateTo = fmt(today);
  if (period === 'ytd') {
    return { date_from: `${today.getFullYear()}-01-01`, date_to: dateTo };
  }
  if (period === 'last_year') {
    const y = today.getFullYear() - 1;
    return { date_from: `${y}-01-01`, date_to: `${y}-12-31` };
  }
  const days = parseInt(period);
  if (!isNaN(days)) {
    const f = new Date(today); f.setDate(f.getDate() - days);
    return { date_from: fmt(f), date_to: dateTo };
  }
  return {};
}

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: C.emerald, bg: `${C.emerald}18` },
  medium:   { label: 'Medium',   color: C.amber,   bg: `${C.amber}18`   },
  high:     { label: 'High',     color: C.orange,  bg: `${C.orange}18`  },
  critical: { label: 'Critical', color: C.rose,    bg: `${C.rose}18`    },
};

const BUCKETS: { key: keyof AgingRow; label: string }[] = [
  { key: 'current',  label: 'Current'  }, { key: 'd1_30',    label: '1-30d'    },
  { key: 'd31_60',   label: '31-60d'   }, { key: 'd61_90',   label: '61-90d'   },
  { key: 'd91_120',  label: '91-120d'  }, { key: 'd121_150', label: '121-150d' },
  { key: 'd151_180', label: '151-180d' }, { key: 'd181_210', label: '181-210d' },
  { key: 'd211_240', label: '211-240d' }, { key: 'd241_270', label: '241-270d' },
  { key: 'd271_300', label: '271-300d' }, { key: 'd301_330', label: '301-330d' },
  { key: 'over_330', label: '>330d'    },
];

const BUCKET_COLORS = [
  '#10b981','#34d399','#fbbf24','#f59e0b',
  '#f97316','#ef4444','#dc2626','#b91c1c',
  '#991b1b','#7f1d1d','#6b21a8','#581c87','#3b0764',
];

const PERIOD_OPTIONS = [
  { key: 'ytd', label: 'Year to Date'   },
  { key: '30',  label: 'Last 30 Days'   },
  { key: '90',  label: 'Last 90 Days'   },
  { key: '180', label: 'Last 6 Months'  },
  { key: 'last_year', label: 'Last Year' },
];

const RISK_OPTIONS = [
  { key: 'all',      label: 'All Risk Levels' },
  { key: 'low',      label: 'Low'             },
  { key: 'medium',   label: 'Medium'          },
  { key: 'high',     label: 'High'            },
  { key: 'critical', label: 'Critical'        },
];

const BRANCH_COLORS = [C.indigo, C.cyan, C.teal, C.emerald, C.amber, C.rose, C.violet];

interface CreditKPIData {
  kpis: {
    taux_recouvrement: { value: number };
    taux_impayes:      { value: number; overdue_amount?: number; total_receivables?: number };
    dmp:               { value: number };
  };
  summary: {
    grand_total_receivables: number;
    overdue_amount: number;
    ca_total: number;
    credit_customers: number;
    total_customers: number;
  };
}

// ── StyledDropdown ─────────────────────────────────────────────────────────────
function StyledDropdown({
  label, options, value, onChange, isOpen, onToggle, onClose, minWidth,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  minWidth?: number;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const current = options.find(o => o.key === value)?.label ?? label;

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX, width: rect.width });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen, onClose]);

  const menu = isOpen ? createPortal(
    <div style={{
      position: 'absolute', top: menuPos.top, left: menuPos.left,
      width: Math.max(menuPos.width, minWidth ?? 0),
      zIndex: 9999, background: '#ffffff', border: '1px solid #e5e7eb',
      borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      maxHeight: 280, overflowY: 'auto', padding: 6,
    }}>
      {options.map(opt => (
        <button key={opt.key} onMouseDown={e => e.stopPropagation()}
          onClick={() => { onChange(opt.key); onClose(); }}
          style={{
            width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
            border: 'none', cursor: 'pointer', fontSize: 13,
            background: value === opt.key ? `${C.indigo}15` : 'transparent',
            color: value === opt.key ? C.indigo : '#111827',
            fontWeight: value === opt.key ? 600 : 400,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
          {opt.label}
          {value === opt.key && <span style={{ color: C.indigo, fontSize: 12 }}>✓</span>}
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: minWidth ?? 160 }}>
      {label && (
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: css.mutedFg, marginBottom: 6 }}>
          {label}
        </p>
      )}
      <button ref={btnRef} onClick={onToggle} style={{
        width: '100%', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', borderRadius: 10, border: `1px solid ${css.border}`,
        background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current}</span>
        <ChevronDownIcon size={14} style={{ flexShrink: 0, marginLeft: 8, color: css.mutedFg, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {menu}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string;
  trend?: { direction: 'up' | 'down'; label: string };
}) {
  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${accent}`, paddingTop: 20 }}>
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: accent, opacity: 0.06, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        {trend ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            background: trend.direction === 'up' ? `${C.emerald}12` : `${C.rose}12`,
            color: trend.direction === 'up' ? C.emerald : C.rose,
            border: `1px solid ${trend.direction === 'up' ? C.emerald : C.rose}25`,
          }}>
            {trend.direction === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend.label}
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: C.emerald, background: `${C.emerald}12`, border: `1px solid ${C.emerald}25`, padding: '3px 8px', borderRadius: 20 }}>
            <ArrowUpRight size={10} />
            KPI
          </div>
        )}
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: css.cardFg, marginTop: 5, marginBottom: 4, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: css.mutedFg, marginBottom: 14 }}>{sub}</p>}
      {!sub && <div style={{ marginBottom: 14 }} />}
      <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: '64%', background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
      </div>
    </div>
  );
}

function Panel({ title, sub, children, action }: {
  title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
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

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: css.fg, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 12, minWidth: 220, maxWidth: 300 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: css.cardFg, paddingBottom: 8, borderBottom: `1px solid ${css.border}`, margin: '0 0 8px 0' }}>{label}</p>
      <div style={{ marginTop: 10 }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 8 : 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.fill ?? p.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: css.mutedFg, flex: 1 }}>{p.name}</span>
            <span style={{ fontWeight: 700, color: css.cardFg }}>
              {typeof p.value === 'number' && (p.name === 'Collection Rate' || p.name === 'Overdue Rate')
                ? `${p.value.toFixed(1)}%`
                : typeof p.value === 'number' && p.name === 'DSO'
                  ? `${p.value.toFixed(0)}d`
                  : typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function AgingReceivablePage() {
  const { data: datesData } = useAgingDates();
  const { data: snapshotsData } = useAgingSnapshots();

  // ✅ All 4 filters
  const [period,       setPeriod]       = useState<string>('ytd');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [riskFilter,   setRiskFilter]   = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [openDropdown, setOpenDropdown] = useState<'period' | 'date' | 'risk' | 'branch' | null>(null);

  // Raw aging rows from API
  const [rows,          setRows]          = useState<AgingRow[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [reportDate,    setReportDate]    = useState<string>('');
  const [totalAccounts, setTotalAccounts] = useState(0);

  // Branch filter helpers
  const [availableBranches,     setAvailableBranches]     = useState<string[]>([]);
  const [customerNamesInBranch, setCustomerNamesInBranch] = useState<Set<string> | null>(null);
  const [branchFilterLoading,   setBranchFilterLoading]   = useState(false);

  // Branch trend chart
  const [branchTrend,         setBranchTrend]         = useState<any[]>([]);
  const [branchTrendBranches, setBranchTrendBranches] = useState<string[]>([]);
  const [branchTrendLoading,  setBranchTrendLoading]  = useState(false);

  // Credit KPI
  const [creditKPI,        setCreditKPI]        = useState<CreditKPIData | null>(null);
  const [creditKPILoading, setCreditKPILoading] = useState(false);

  // ── Derived values ───────────────────────────────────────────────────────-
  const snapshotItems = snapshotsData?.items ?? [];
  const currentYear = new Date().getFullYear();

  const selectedSnapshot = useMemo(() => {
    if (selectedDate) {
      return snapshotItems.find(s => String(s.report_date) === selectedDate || String(s.uploaded_at)?.startsWith(selectedDate));
    }
    if (period === 'last_year') {
      return snapshotItems.find(s => s.aging_year === currentYear - 1);
    }
    if (period === 'ytd') {
      return snapshotItems.find(s => s.aging_year === currentYear);
    }
    return snapshotItems[0];
  }, [selectedDate, period, snapshotItems, currentYear]);

  const effectiveAgingParams = useMemo(() => {
    if (selectedSnapshot?.id) return { snapshot_id: selectedSnapshot.id };
    if (selectedDate) return { report_date: selectedDate };
    if (period === 'last_year') return { aging_year: currentYear - 1 };
    if (period === 'ytd') return { aging_year: currentYear };
    return {};
  }, [selectedSnapshot, selectedDate, period, currentYear]);
  const effectiveDate = selectedDate || datesData?.dates?.[0] || '';
  const dateRange     = useMemo(() => periodToDates(period), [period]);

  // ── Load available branches ───────────────────────────────────────────────
  useEffect(() => {
    axios.get('/api/transactions/branches/', { headers: getAuthHeaders() })
      .then(res => setAvailableBranches(res.data.branches ?? [])).catch(() => {});
  }, []);

  // ── ✅ Fetch aging rows — re-fetches on date OR period change ─────────────
  const fetchAgingRows = useCallback(async () => {
    const params: Record<string, any> = { page_size: 500, page: 1, ...effectiveAgingParams };
    if (!params.snapshot_id && !params.report_date && params.aging_year === undefined) return;

    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/aging/', {
        headers: getAuthHeaders(),
        params,
      });
      const data = res.data;
      const displayDate = data.report_date || selectedSnapshot?.report_date || (selectedSnapshot?.aging_year ? String(selectedSnapshot.aging_year) : selectedDate);
      setReportDate(displayDate || '');
      setTotalAccounts(data.total_accounts ?? 0);
      const normalized = (data.records ?? [])
        .filter((r: any) => Number(r.total) > 0)
        .map(normalizeRow);
      setRows(normalized);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to load aging data');
    } finally {
      setLoading(false);
    }
  }, [effectiveAgingParams, selectedSnapshot, selectedDate]);

  useEffect(() => { fetchAgingRows(); }, [fetchAgingRows]);

  // ── ✅ Branch filter: load customer names for the selected branch ─────────
  // The aging file doesn't have a branch column, so we cross-reference
  // against sales transactions to find which customers belong to this branch.
  useEffect(() => {
    if (branchFilter === 'all') { setCustomerNamesInBranch(null); return; }
    setBranchFilterLoading(true);
    axios.get('/api/transactions/', {
      headers: getAuthHeaders(),
      params: { movement_type: 'ف بيع', branch: branchFilter, page_size: 500, page: 1 },
    }).then(res => {
      const names = new Set<string>(
        (res.data.movements ?? []).map((m: any) => m.customer_name).filter(Boolean)
      );
      setCustomerNamesInBranch(names);
    }).catch(() => setCustomerNamesInBranch(null))
      .finally(() => setBranchFilterLoading(false));
  }, [branchFilter]);

  // ── ✅ Branch trend — filtered by period + branch ─────────────────────────
  useEffect(() => {
    setBranchTrendLoading(true);
    const params: Record<string, any> = { movement_type: 'ف بيع' };
    if (dateRange.date_from) params.date_from = dateRange.date_from;
    if (dateRange.date_to)   params.date_to   = dateRange.date_to;

    axios.get('/api/transactions/branch-monthly/', { headers: getAuthHeaders(), params })
      .then(res => {
        setBranchTrend(res.data.monthly_data ?? []);
        setBranchTrendBranches(res.data.branches ?? []);
      })
      .catch(() => {})
      .finally(() => setBranchTrendLoading(false));
  }, [dateRange]);

  // ── Credit KPI ────────────────────────────────────────────────────────────
  useEffect(() => {
    const params: Record<string, any> = { ...effectiveAgingParams };
    if (!params.snapshot_id && !params.report_date && params.aging_year === undefined) return;
    setCreditKPILoading(true);
    axios.get('/api/kpi/credit/', { headers: getAuthHeaders(), params })
      .then(res => setCreditKPI(res.data)).catch(() => {}).finally(() => setCreditKPILoading(false));
  }, [effectiveAgingParams]);

  // ── ✅ filtered = aging rows after applying ALL 4 filters ─────────────────
  const filtered = useMemo(() => {
    let data = [...rows];
    // Risk filter (client-side)
    if (riskFilter !== 'all')
      data = data.filter(r => r.risk_score === riskFilter);
    // Branch filter (client-side via cross-referenced customer names)
    if (customerNamesInBranch !== null)
      data = data.filter(r => customerNamesInBranch.has(r.customer_name ?? ''));
    // Period filter — applied at fetch time (effectiveDate), nothing extra needed here
    return data;
  }, [rows, riskFilter, customerNamesInBranch]);

  // ── Aggregates — all computed on `filtered` so every card reflects filters
  const totals = useMemo(() => ({
    total:   filtered.reduce((s, r) => s + r.total,         0),
    overdue: filtered.reduce((s, r) => s + r.overdue_total, 0),
    current: filtered.reduce((s, r) => s + r.current,       0),
  }), [filtered]);

  const riskCounts = useMemo(() => {
    const c: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    filtered.forEach(r => { c[r.risk_score] = (c[r.risk_score] ?? 0) + 1; });
    return c;
  }, [filtered]);

  const bucketTotals = useMemo(() =>
    BUCKETS.map((b, i) => ({
      label:  b.label,
      amount: filtered.reduce((s, r) => s + ((r[b.key] as number) || 0), 0),
      color:  BUCKET_COLORS[i],
    })).filter(b => b.amount > 0),
  [filtered]);

  const pieData = useMemo(() =>
    Object.entries(riskCounts).filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: RISK_CONFIG[k].label, value: v, color: RISK_CONFIG[k].color })),
  [riskCounts]);

  // Top debtors — from filtered rows
  const topDebtorsByBranch = useMemo(() =>
    [...filtered].sort((a, b) => b.total - a.total).slice(0, 10).map(r => ({
      name:    (r.customer_name || r.account_code || '').slice(0, 28),
      total:   r.total,
      overdue: r.overdue_total,
      color:   RISK_CONFIG[r.risk_score]?.color ?? C.indigo,
    })),
  [filtered]);

  // Branch trend — filtered by branch selection (client-side)
  const visibleBranchTrendBranches = branchFilter !== 'all'
    ? branchTrendBranches.filter(b => b === branchFilter)
    : branchTrendBranches;

  const collectionRate = creditKPI?.kpis?.taux_recouvrement?.value ?? 0;
  const overdueRate    = creditKPI?.kpis?.taux_impayes?.value ?? 0;


  // ── Dropdown options ──────────────────────────────────────────────────────
  const branchOptions = [
    { key: 'all', label: 'All Branches' },
    ...availableBranches.map(b => ({ key: b, label: b })),
  ];

  const isFiltered = period !== 'ytd' || selectedDate !== '' || riskFilter !== 'all' || branchFilter !== 'all';

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'customer_name', label: 'Customer',
      render: (row: AgingRow) => (
        <div style={{ maxWidth: 200 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: css.cardFg }} title={row.customer_name ?? row.account ?? ''}>
            {row.customer_name || row.account || '—'}
          </p>
          <p style={{ fontSize: 11, color: css.mutedFg, fontFamily: 'monospace', margin: 0 }}>{row.account_code}</p>
        </div>
      ),
    },
    ...BUCKETS.map((b, i) => ({
      key: b.key as string, label: b.label,
      render: (row: AgingRow) => {
        const val = (row[b.key] as number) || 0;
        const isOverdue = i >= 3;
        const color = val === 0 ? css.mutedFg : isOverdue ? C.rose : i > 0 ? C.amber : C.emerald;
        return val > 0
          ? <span style={{ color, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{formatCurrency(val)}</span>
          : <span style={{ color: css.mutedFg, fontSize: 12 }}>—</span>;
      },
    })),
    {
      key: 'total', label: 'Total',
      render: (row: AgingRow) => <span style={{ fontWeight: 800, fontSize: 13, color: css.cardFg, whiteSpace: 'nowrap' }}>{formatCurrency(row.total)}</span>,
    },
    {
      key: 'overdue_total', label: 'Overdue',
      render: (row: AgingRow) => row.overdue_total > 0
        ? <span style={{ color: C.rose, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{formatCurrency(row.overdue_total)}</span>
        : <span style={{ color: css.mutedFg, fontSize: 12 }}>—</span>,
    },
    {
      key: 'risk_score', label: 'Risk',
      render: (row: AgingRow) => {
        const cfg = RISK_CONFIG[row.risk_score] ?? RISK_CONFIG.low;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}35` }}>
            {cfg.label}
          </span>
        );
      },
    },
  ], []);

  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>
            Accounts Receivable Aging
          </h1>
          <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>
            Receivables breakdown by age bucket, customer risk, and branch performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchAgingRows} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
            borderRadius: 10, border: `1px solid ${css.border}`, background: css.card,
            color: css.cardFg, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      {/* ✅ Filters — all 4 connected */}
      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>Filters</h3>
          <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>
            All cards, charts and table update automatically · Branch filter cross-references sales transactions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <StyledDropdown label="Period"      options={PERIOD_OPTIONS} value={period}        onChange={v => setPeriod(v)}                                    isOpen={openDropdown === 'period'} onToggle={() => setOpenDropdown(o => o === 'period' ? null : 'period')} onClose={() => setOpenDropdown(null)} />
          <StyledDropdown label="Risk Level"  options={RISK_OPTIONS}   value={riskFilter}    onChange={v => setRiskFilter(v)}                               isOpen={openDropdown === 'risk'}   onToggle={() => setOpenDropdown(o => o === 'risk'   ? null : 'risk')}   onClose={() => setOpenDropdown(null)} />
          <StyledDropdown label="Branch"      options={branchOptions}  value={branchFilter}  onChange={v => setBranchFilter(v)}                             isOpen={openDropdown === 'branch'} onToggle={() => setOpenDropdown(o => o === 'branch' ? null : 'branch')} onClose={() => setOpenDropdown(null)} minWidth={180} />
          {branchFilterLoading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
              <Loader2 size={16} className="animate-spin" style={{ color: C.indigo }} />
            </div>
          )}
          {isFiltered && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ height: 23 }} />
              <button
                onClick={() => { setPeriod('ytd'); setSelectedDate(''); setRiskFilter('all'); setBranchFilter('all'); }}
                style={{ height: 38, padding: '0 14px', borderRadius: 10, border: `1px solid ${css.border}`, background: css.card, color: css.mutedFg, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
                Reset all
              </button>
            </div>
          )}
        </div>
        {/* Active filter badges */}
        {isFiltered && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {period !== 'ytd' && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: `${C.indigo}10`, color: C.indigo, border: `1px solid ${C.indigo}25` }}>
                {PERIOD_OPTIONS.find(o => o.key === period)?.label}
              </span>
            )}
            {selectedDate && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: `${C.teal}10`, color: C.teal, border: `1px solid ${C.teal}25` }}>
                Date: {selectedDate}
              </span>
            )}
            {riskFilter !== 'all' && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: RISK_CONFIG[riskFilter]?.bg, color: RISK_CONFIG[riskFilter]?.color, border: `1px solid ${RISK_CONFIG[riskFilter]?.color}35` }}>
                {RISK_CONFIG[riskFilter]?.label} risk
              </span>
            )}
            {branchFilter !== 'all' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: `${C.cyan}10`, color: C.cyan, border: `1px solid ${C.cyan}25` }}>
                <Building2 size={10} /> {branchFilter}
                {customerNamesInBranch !== null && ` · ${customerNamesInBranch.size} customers`}
              </span>
            )}
          </div>
        )}
        {branchFilter !== 'all' && customerNamesInBranch !== null && (
          <p style={{ fontSize: 12, color: C.indigo, marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${css.border}` }}>
            <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} />
            Branch filter active — showing {customerNamesInBranch.size} customers linked to <strong>{branchFilter}</strong> via sales transactions
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, color: C.rose }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: 13, flex: 1 }}>{error}</span>
          <button onClick={fetchAgingRows} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 12, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {loading && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12, color: css.mutedFg }}>
          <Loader2 size={20} className="animate-spin" style={{ color: C.indigo }} />
          <span style={{ fontSize: 14 }}>Loading aging report…</span>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
          <AlertCircle size={40} style={{ color: css.mutedFg, opacity: 0.4 }} />
          <p style={{ fontSize: 14, color: css.mutedFg }}>No aging data available</p>
          <button onClick={fetchAgingRows} style={{ height: 34, padding: '0 16px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.card, color: css.cardFg, fontSize: 13, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* ── Snapshot KPIs — all computed on `filtered` ── */}
          <SectionTitle title="Snapshot Overview" sub={`Report: ${reportDate || 'latest'}${branchFilter !== 'all' ? ` · Branch: ${branchFilter}` : ''}${riskFilter !== 'all' ? ` · Risk: ${RISK_CONFIG[riskFilter]?.label}` : ''}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            <KpiCard label="Total Receivables"   value={formatCurrency(totals.total)}   icon={TrendingUp}    accent={C.indigo}  sub={`${filtered.length} customers with open balance`} />
            <KpiCard label="Current (not due)"   value={formatCurrency(totals.current)} icon={CheckCircle2}  accent={C.emerald} sub={totals.total > 0 ? `${((totals.current / totals.total) * 100).toFixed(1)}% of total` : undefined} />
            <KpiCard label="Overdue (>60d)"      value={formatCurrency(totals.overdue)} icon={AlertTriangle} accent={C.rose}    sub={totals.total > 0 ? `${((totals.overdue / totals.total) * 100).toFixed(1)}% of total` : undefined} trend={overdueRate > 20 ? { direction: 'down', label: 'High' } : { direction: 'up', label: 'Normal' }} />
            <KpiCard label="At-Risk Customers"   value={`${(riskCounts.high ?? 0) + (riskCounts.critical ?? 0)}`} icon={Clock} accent={C.orange} sub={`${riskCounts.critical ?? 0} critical · ${riskCounts.high ?? 0} high`} />
          </div>

          {/* Credit KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            <KpiCard label="Collection Rate" value={creditKPILoading ? '…' : `${collectionRate.toFixed(1)}%`} icon={Target}        accent={C.emerald} sub="% of credit sales successfully collected" trend={collectionRate >= 70 ? { direction: 'up', label: 'Good' } : { direction: 'down', label: 'Alert' }} />
            <KpiCard label="Overdue Rate"    value={creditKPILoading ? '…' : `${overdueRate.toFixed(1)}%`}    icon={AlertTriangle} accent={C.rose}    sub="Overdue receivables as % of total"        trend={overdueRate <= 20 ? { direction: 'up', label: 'Good' } : { direction: 'down', label: 'Alert' }} />
            <KpiCard label="DSO"             value={creditKPILoading ? '…' : `${(creditKPI?.kpis?.dmp?.value ?? 0).toFixed(0)} days`} icon={Activity} accent={C.amber} sub="Average days customers take to pay" trend={(creditKPI?.kpis?.dmp?.value ?? 0) <= 90 ? { direction: 'up', label: 'Normal' } : { direction: 'down', label: 'High' }} />
          </div>

          {/* ── Branch Revenue — ✅ filtered by period + branch ── */}
          <SectionTitle title="Revenue by Branch (Monthly)" sub={`${branchFilter !== 'all' ? `Branch: ${branchFilter} · ` : ''}${PERIOD_OPTIONS.find(o => o.key === period)?.label ?? 'Year to Date'}`} />
          <Panel title="Branch Revenue Trend" sub={`${visibleBranchTrendBranches.length} branches · last ${branchTrend.length} months`}>
            {branchTrendLoading ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: css.mutedFg }}>
                <Loader2 size={16} className="animate-spin" style={{ color: C.cyan }} />
                <span style={{ fontSize: 13 }}>Loading branch data…</span>
              </div>
            ) : branchTrend.length === 0 ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 13 }}>No branch trend data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={branchTrend.slice(-12)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    {visibleBranchTrendBranches.map((branch, i) => {
                      const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
                      return (
                        <linearGradient key={branch} id={`aging-bg-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
                          <stop offset="55%"  stopColor={color} stopOpacity={0.07} />
                          <stop offset="100%" stopColor={color} stopOpacity={0}    />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false}
                    tickFormatter={(v, i) => {
                      const row = branchTrend.slice(-12)[i];
                      return row ? `${v} ${row.year ?? ''}` : String(v);
                    }}
                  />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 3' }} />
                  <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={18} />
                  {visibleBranchTrendBranches.map((branch, i) => (
                    <Area
                      key={branch}
                      type="natural"
                      dataKey={branch}
                      stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                      strokeWidth={2.5}
                      fill={`url(#aging-bg-${i})`}
                      dot={false}
                      activeDot={{ r: 5, fill: css.card, stroke: BRANCH_COLORS[i % BRANCH_COLORS.length], strokeWidth: 2.5 }}
                      name={branch}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* ── Top Debtors — ✅ filtered ── */}
          <SectionTitle title="Top Debtors" sub={branchFilter !== 'all' ? `Filtered to branch: ${branchFilter}` : 'All branches · current report snapshot'} />
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            <Panel title="Top 10 Debtors by Balance" sub={`${branchFilter !== 'all' ? `Branch: ${branchFilter} · ` : ''}Ranked by total outstanding balance`}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 8, background: css.muted, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: C.indigo, display: 'inline-block', marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: css.mutedFg }}><strong style={{ color: css.cardFg }}>Total Balance</strong> — full amount owed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: C.rose, display: 'inline-block', marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: css.mutedFg }}><strong style={{ color: C.rose }}>Overdue (&gt;60 days)</strong> — past-due portion</span>
                </div>
              </div>
              {topDebtorsByBranch.length === 0 ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 13 }}>No debtors match current filters</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topDebtorsByBranch} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }} barCategoryGap="30%" barGap={4}>
                    <defs>
                      {topDebtorsByBranch.map((d, i) => (
                        <linearGradient key={i} id={`debtor-g-${i}`} x1="1" y1="0" x2="0" y2="0">
                          <stop offset="0%"   stopColor={d.color} stopOpacity={1}    />
                          <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke={css.border} strokeWidth={1} horizontal={false} />
                    <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={(props: any) => {
                        const { active, payload, label } = props;
                        if (!active || !payload?.length) return null;
                        const total   = payload.find((p: any) => p.dataKey === 'total')?.value ?? 0;
                        const overdue = payload.find((p: any) => p.dataKey === 'overdue')?.value ?? 0;
                        const pct     = total > 0 ? ((overdue / total) * 100).toFixed(1) : '0';
                        return (
                          <div style={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 12, maxWidth: 220, minWidth: 200 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: css.cardFg, paddingBottom: 8, borderBottom: `1px solid ${css.border}`, margin: '0 0 8px 0' }}>{label}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
                              <span style={{ color: css.mutedFg }}>Total balance</span>
                              <span style={{ fontWeight: 700, color: css.cardFg }}>{formatCurrency(total)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                              <span style={{ color: css.mutedFg }}>Overdue (&gt;60d)</span>
                              <span style={{ fontWeight: 700, color: C.rose }}>{formatCurrency(overdue)}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: `linear-gradient(90deg, ${C.rose}55, ${C.rose})` }} />
                            </div>
                            <p style={{ fontSize: 10, color: css.mutedFg, marginTop: 5 }}>{pct}% of balance is overdue</p>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={18} formatter={(value: string) => value === 'overdue' ? 'Overdue (>60d)' : 'Total Balance'} />
                    <Bar dataKey="total"   name="total"   radius={[0, 5, 5, 0]} maxBarSize={22}>
                      {topDebtorsByBranch.map((_, i) => <Cell key={i} fill={`url(#debtor-g-${i})`} />)}
                    </Bar>
                    <Bar dataKey="overdue" name="overdue" radius={[0, 5, 5, 0]} fill={C.rose} fillOpacity={0.55} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            {/* Risk Breakdown — ✅ computed on `filtered` */}
            <div style={cardStyle}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>Risk Breakdown</h3>
                <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{filtered.length} customers · {branchFilter !== 'all' ? `Branch: ${branchFilter}` : 'all branches'}</p>
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <defs>
                      {pieData.map((entry, i) => (
                        <radialGradient key={i} id={`risk-pie-${i}`} cx="50%" cy="50%" r="50%">
                          <stop offset="0%"   stopColor={entry.color} stopOpacity={1}    />
                          <stop offset="100%" stopColor={entry.color} stopOpacity={0.75} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={`url(#risk-pie-${i})`} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} customers`, '']} contentStyle={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {Object.entries(RISK_CONFIG).map(([key, cfg]) => {
                  const count = riskCounts[key] ?? 0;
                  const pct   = filtered.length > 0 ? (count / filtered.length) * 100 : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: css.cardFg }}>{cfg.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: css.mutedFg }}>{pct.toFixed(0)}%</span>
                          <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}35` }}>{count}</span>
                        </div>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}70, ${cfg.color})`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Collection Rate Trend ── */}
          <SectionTitle title="Collection Rate" sub="Historical trend across all snapshots" />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <AgingHistoricalTrend
              snapshotCount={
                period === '30'
                  ? 1
                  : period === '90'
                    ? 2
                    : period === '180'
                      ? 3
                      : period === 'last_year'
                        ? 12
                        : new Date().getMonth() + 1
              }
              branch={branchFilter !== 'all' ? branchFilter : undefined}
            />
            {/* Current period summary */}
            <div style={cardStyle}>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>Current Period</h3>
                <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{reportDate || 'Latest snapshot'}</p>
              </div>
              {creditKPILoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8, color: css.mutedFg }}>
                  <Loader2 size={15} className="animate-spin" /> <span style={{ fontSize: 13 }}>Loading…</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`,                                                      accent: C.emerald, good: collectionRate >= 70,                      bar: collectionRate },
                    { label: 'Overdue Rate',    value: `${overdueRate.toFixed(1)}%`,                                                          accent: C.rose,    good: overdueRate <= 20,                        bar: Math.min(100, overdueRate) },
                    { label: 'DSO',             value: `${(creditKPI?.kpis?.dmp?.value ?? 0).toFixed(0)}d`,                                  accent: C.amber,   good: (creditKPI?.kpis?.dmp?.value ?? 0) <= 90, bar: Math.min(100, ((creditKPI?.kpis?.dmp?.value ?? 0) / 180) * 100) },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.accent }} />
                          <span style={{ fontSize: 12, color: css.mutedFg }}>{item.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: item.accent }}>{item.value}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: item.good ? `${C.emerald}18` : `${C.rose}18`, color: item.good ? C.emerald : C.rose }}>
                            {item.good ? 'Good' : 'Alert'}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: css.muted, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${item.bar}%`, background: `linear-gradient(90deg, ${item.accent}60, ${item.accent})`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 4, paddingTop: 12, borderTop: `1px dashed ${css.border}` }}>
                    {[
                      { label: 'Collection rate target', threshold: '> 70%' },
                      { label: 'Overdue rate threshold',  threshold: '< 20%' },
                      { label: 'DSO target',               threshold: '< 90d' },
                    ].map(t => (
                      <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: css.mutedFg }}>{t.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: css.cardFg }}>{t.threshold}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Age Bucket Distribution — ✅ computed on `filtered` ── */}
          <SectionTitle title="Receivables Age Distribution" sub="Bucket breakdown for filtered view" />
          <Panel title="Receivables by Age Bucket" sub="Aggregated amounts (LYD)">
            {bucketTotals.length === 0 ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg, fontSize: 13 }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bucketTotals} margin={{ left: 5, right: 5, bottom: 20 }} barCategoryGap="30%" barGap={4}>
                  <defs>
                    {bucketTotals.map((b, i) => (
                      <linearGradient key={i} id={`bucket-g-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={b.color} stopOpacity={1}    />
                        <stop offset="100%" stopColor={b.color} stopOpacity={0.55} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke={css.border} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="label" tick={axisStyle} angle={-30} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                  <Bar dataKey="amount" name="Amount" radius={[5, 5, 0, 0]} maxBarSize={22}>
                    {bucketTotals.map((_, i) => <Cell key={i} fill={`url(#bucket-g-${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* ── Balance per Customer — ✅ table on `filtered` ── */}
          <SectionTitle
            title="Balance per Customer"
            sub={[
              `${filtered.length} customers`,
              totalAccounts > 0 ? `of ${totalAccounts} total` : '',
              reportDate ? `· Report: ${reportDate}` : '',
              branchFilter !== 'all' ? `· Branch: ${branchFilter}` : '',
              riskFilter !== 'all' ? `· Risk: ${RISK_CONFIG[riskFilter]?.label}` : '',
            ].filter(Boolean).join(' ')}
          />
          <div style={cardStyle}>
            {(branchFilter !== 'all' || riskFilter !== 'all') && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: `${C.indigo}08`, border: `1px solid ${C.indigo}20` }}>
                <span style={{ fontSize: 12, color: css.mutedFg, alignSelf: 'center' }}>Active filters:</span>
                {branchFilter !== 'all' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: `${C.cyan}18`, color: C.cyan, border: `1px solid ${C.cyan}35` }}>
                    <Building2 size={10} /> {branchFilter}
                  </span>
                )}
                {riskFilter !== 'all' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: RISK_CONFIG[riskFilter]?.bg, color: RISK_CONFIG[riskFilter]?.color, border: `1px solid ${RISK_CONFIG[riskFilter]?.color}35` }}>
                    {RISK_CONFIG[riskFilter]?.label} risk
                  </span>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: css.mutedFg }}>Risk legend:</span>
              {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}35` }}>
                  {cfg.label}
                </span>
              ))}
            </div>
            <DataTable data={filtered} columns={columns} searchable exportable={false} pageSize={20} />
          </div>
        </>
      )}
    </div>
  );
}