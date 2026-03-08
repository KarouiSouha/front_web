// src/app/pages/ReportsPage.tsx
// ═══════════════════════════════════════════════════════════════════
// AGING RECEIVABLES REPORT — DETAILED BY BRANCH
// REDESIGN: Premium editorial cover page (Playfair Display + DM Sans)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  RefreshCw, Loader2, AlertCircle, TrendingUp, AlertTriangle,
  Clock, Target, BarChart3, Printer, FileText, Download,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from 'recharts';
import { formatCurrency } from '../lib/utils';
import { PricingMarginsReport } from './PricingMarginsReport';

// ─────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────
const C = {
  indigo: '#6366f1', violet: '#8b5cf6', cyan: '#0ea5e9',
  teal: '#14b8a6', emerald: '#10b981', amber: '#f59e0b',
  orange: '#f97316', rose: '#f43f5e', sky: '#38bdf8', pink: '#ec4899',
};
const BRANCH_PAL = [
  '#6366f1','#0ea5e9','#14b8a6','#10b981',
  '#f59e0b','#f43f5e','#8b5cf6','#f97316',
  '#38bdf8','#ec4899','#84cc16','#06b6d4',
];
const RISK_CFG: Record<string,{label:string;color:string}> = {
  low:      { label:'Low',      color:'#10b981' },
  medium:   { label:'Medium',   color:'#f59e0b' },
  high:     { label:'High',     color:'#f97316' },
  critical: { label:'Critical', color:'#f43f5e' },
};
const BUCKET_COLORS = [
  '#10b981','#34d399','#fbbf24','#f59e0b','#f97316',
  '#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#6b21a8','#581c87','#3b0764',
];
const css = {
  card:'hsl(var(--card))', cardFg:'hsl(var(--card-foreground))',
  border:'hsl(var(--border))', muted:'hsl(var(--muted))',
  mutedFg:'hsl(var(--muted-foreground))', bg:'hsl(var(--background))',
  fg:'hsl(var(--foreground))',
};
const card: React.CSSProperties = {
  background:css.card, borderRadius:16, padding:24,
  boxShadow:'0 1px 3px rgba(0,0,0,0.08),0 4px 20px rgba(0,0,0,0.05)',
  border:`1px solid ${css.border}`,
};
const ax = { fontSize:11, fill:'hsl(var(--muted-foreground))' };

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface AgingRow {
  id:string; account:string; account_code?:string;
  customer_name?:string|null; branch?:string|null;
  current:number; d1_30:number; d31_60:number; d61_90:number;
  d91_120:number; d121_150:number; d151_180:number; d181_210:number;
  d211_240:number; d241_270:number; d271_300:number; d301_330:number;
  over_330:number; total:number; overdue_total:number; risk_score?:string;
}
interface KpiData {
  kpis:{ taux_recouvrement:{value:number}; taux_impayes:{value:number}; dmp:{value:number} };
  summary:{ grand_total_receivables:number; overdue_amount:number; ca_total:number; credit_customers:number };
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const num = (v:unknown) => { const n=Number(v); return isFinite(n)?n:0; };
const norm = (r:AgingRow): AgingRow => ({
  ...r,
  current:num(r.current), d1_30:num(r.d1_30), d31_60:num(r.d31_60),
  d61_90:num(r.d61_90), d91_120:num(r.d91_120), d121_150:num(r.d121_150),
  d151_180:num(r.d151_180), d181_210:num(r.d181_210), d211_240:num(r.d211_240),
  d241_270:num(r.d241_270), d271_300:num(r.d271_300), d301_330:num(r.d301_330),
  over_330:num(r.over_330), total:num(r.total), overdue_total:num(r.overdue_total),
  customer_name: r.customer_name||r.account||null,
});
function auth() {
  const t = localStorage.getItem('fasi_access_token');
  return t ? { Authorization:`Bearer ${t}` } : {};
}
function pct(a:number,b:number){ return b>0 ? +((a/b)*100).toFixed(1) : 0; }

// ─────────────────────────────────────────────────────────────────
// Atomic components
// ─────────────────────────────────────────────────────────────────
function Spin(){ return <Loader2 size={20} className="animate-spin" style={{color:C.indigo}}/>; }

function Empty({text='No data',h=180}:{text?:string;h?:number}){
  return(
    <div style={{height:h,display:'flex',alignItems:'center',justifyContent:'center',color:css.mutedFg,fontSize:13,flexDirection:'column',gap:8}}>
      <BarChart3 size={24} style={{opacity:.25}}/>{text}
    </div>
  );
}

function Tip({active,payload,label,isCurrency=true}:any){
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',boxShadow:'0 10px 30px rgba(0,0,0,.15)',fontSize:12,minWidth:200}}>
      <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'#6b7280',marginBottom:10}}>{label}</p>
      {payload.map((p:any,i:number)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginTop:5}}>
          <span style={{width:9,height:9,borderRadius:'50%',background:p.fill??p.color,flexShrink:0}}/>
          <span style={{color:'#6b7280',flex:1}}>{p.name}</span>
          <span style={{fontWeight:700,color:'#111827'}}>
            {isCurrency&&typeof p.value==='number' ? formatCurrency(p.value) : typeof p.value==='number' ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SecHead({n,title,sub,color=C.indigo}:{n:number;title:string;sub?:string;color?:string}){
  return(
    <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:18}}>
      <span style={{width:36,height:36,borderRadius:11,background:`${color}18`,color,fontSize:16,fontWeight:900,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${color}30`}}>{n}</span>
      <div>
        <h2 style={{fontSize:19,fontWeight:800,color:css.fg,margin:0,letterSpacing:'-0.02em'}}>{title}</h2>
        {sub&&<p style={{fontSize:12,color:css.mutedFg,margin:'4px 0 0',lineHeight:1.5}}>{sub}</p>}
      </div>
    </div>
  );
}

function KCard({label,value,sub,accent,Icon,target}:{label:string;value:string;sub:string;accent:string;Icon:any;target?:string}){
  return(
    <div style={{...card,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-24,right:-24,width:96,height:96,borderRadius:'50%',background:accent,opacity:.07,filter:'blur(24px)'}}/>
      <div style={{width:40,height:40,borderRadius:12,background:`${accent}18`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
        <Icon size={17} style={{color:accent}}/>
      </div>
      <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:css.mutedFg,margin:0}}>{label}</p>
      <p style={{fontSize:26,fontWeight:900,color:accent,margin:'4px 0 0',letterSpacing:'-0.03em'}}>{value}</p>
      <p style={{fontSize:11,color:css.mutedFg,marginTop:4}}>{sub}</p>
      {target&&<p style={{fontSize:10,marginTop:6,color:accent,fontWeight:600}}>Target: {target}</p>}
    </div>
  );
}

const REPORT_TYPES = [
  {id:'aging',        title:'Aging Receivables',  desc:'Receivables, top debtors, collection rate & customer balances — all branches', icon:'⏰',live:true },
  {id:'turnover',     title:'Inventory Turnover', desc:'Turnover rate and slow-moving items',                                          icon:'📊',live:false},
  {id:'profitability', title:'Pricing & Margins',  desc:'Margins, pricing strategies, product profitability', icon:'💰', live:true},  {id:'risk',         title:'Risk Assessment',    desc:'Comprehensive credit risk analysis per customer',                             icon:'⚠️',live:false},
  {id:'supply',       title:'Stock Policy',       desc:'Reorder points, lead times, optimal stock levels',                           icon:'📦',live:false},
  {id:'distribution', title:'Sales Behavior',     desc:'Patterns by channel, region, and customer segment',                          icon:'🌍',live:false},
];

// ═══════════════════════════════════════════════════════════════════
// AGING REPORT — main component
// ═══════════════════════════════════════════════════════════════════
function AgingReport(){
  const [dates,      setDates]      = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState('');
  const [rows,       setRows]       = useState<AgingRow[]>([]);
  const [kpi,        setKpi]        = useState<KpiData|null>(null);

  const [branchMonthly, setBranchMonthly] = useState<any[]>([]);
  const [branchNames,   setBranchNames]   = useState<string[]>([]);

  const [loadRows,   setLoadRows]   = useState(true);
  const [loadKpi,    setLoadKpi]    = useState(true);
  const [loadBranch, setLoadBranch] = useState(true);
  const [error,      setError]      = useState('');

  useEffect(()=>{
    axios.get('/api/aging/dates/', {headers:auth()}).then(r=>{
      const d:string[] = r.data?.dates??[];
      setDates(d);
      if(d.length) setActiveDate(d[0]);
    }).catch(()=>{});

    axios.get('/api/transactions/branch-monthly/', {
      params:{movement_type:'ف بيع'}, headers:auth()
    }).then(r=>{
      setBranchMonthly(r.data?.monthly_data??[]);
      setBranchNames(r.data?.branches??[]);
    }).catch(()=>{}).finally(()=>setLoadBranch(false));
  },[]);

  const fetchRows = useCallback(async(date:string)=>{
    if(!date) return;
    setLoadRows(true); setError('');
    try{
      const r = await axios.get('/api/aging/', {params:{report_date:date}, headers:auth()});
      const raw = r.data?.rows??r.data?.results??r.data??[];
      const items = (Array.isArray(raw)?raw:Object.values(raw).find(Array.isArray)??[]) as AgingRow[];
      setRows(items.map(norm));
    }catch(e:any){ setError(e.message??'Loading error'); }
    finally{ setLoadRows(false); }
  },[]);

  const fetchKpi = useCallback(async(date:string)=>{
    setLoadKpi(true);
    try{
      const r = await axios.get('/api/kpi/credit/', {params:{report_date:date||undefined}, headers:auth()});
      setKpi(r.data);
    }catch{}finally{ setLoadKpi(false); }
  },[]);

  useEffect(()=>{
    if(activeDate){ fetchRows(activeDate); fetchKpi(activeDate); }
  },[activeDate]);

  const totals = useMemo(()=>({
    total:   rows.reduce((s,r)=>s+r.total,0),
    current: rows.reduce((s,r)=>s+r.current,0),
    overdue: rows.reduce((s,r)=>s+r.overdue_total,0),
    d1_60:   rows.reduce((s,r)=>s+r.d1_30+r.d31_60,0),
  }),[rows]);

  const globalCR  = kpi ? num(kpi.kpis.taux_recouvrement.value) : 0;
  const globalOR  = kpi ? num(kpi.kpis.taux_impayes.value)      : 0;
  const globalDSO = kpi ? num(kpi.kpis.dmp.value)               : 0;
  const caTotal   = kpi?.summary?.ca_total ?? 0;
  const collected = Math.max(0, caTotal - totals.total);

  const topDebtors = useMemo(()=>
    [...rows].sort((a,b)=>b.total-a.total).slice(0,15).map(r=>({
      name:    (r.customer_name??r.account??'').slice(0,22)+((r.customer_name??'').length>22?'…':''),
      branch:  r.branch ?? 'N/A',
      total:   r.total,
      overdue: r.overdue_total,
      color:   RISK_CFG[r.risk_score??'low']?.color ?? C.indigo,
      risk:    r.risk_score ?? 'low',
    }))
  ,[rows]);

  const buckets = useMemo(()=>{
    const keys:[keyof AgingRow,string][] = [
      ['current','Current'],['d1_30','1-30d'],['d31_60','31-60d'],['d61_90','61-90d'],
      ['d91_120','91-120d'],['d121_150','121-150d'],['d151_180','151-180d'],['d181_210','181-210d'],
      ['d211_240','211-240d'],['d241_270','241-270d'],['d271_300','271-300d'],['d301_330','301-330d'],['over_330','>330d'],
    ];
    return keys.map(([k,label],i)=>({label, amount:rows.reduce((s,r)=>s+num(r[k]),0), color:BUCKET_COLORS[i]}));
  },[rows]);

  const branchBuckets = useMemo(()=>{
    const allBr = [...new Set(rows.map(r=>r.branch??'Unassigned'))];
    return allBr.map((branch,bi)=>{
      const br = rows.filter(r=>(r.branch??'Unassigned')===branch);
      return {
        branch: branch.length>16?branch.slice(0,16)+'…':branch,
        total:   br.reduce((s,r)=>s+r.total,0),
        overdue: br.reduce((s,r)=>s+r.overdue_total,0),
        current: br.reduce((s,r)=>s+r.current,0),
        d1_60:   br.reduce((s,r)=>s+r.d1_30+r.d31_60,0),
        d61plus: br.reduce((s,r)=>s+r.overdue_total,0),
        count:   br.length,
        color:   BRANCH_PAL[bi%BRANCH_PAL.length],
      };
    }).sort((a,b)=>b.total-a.total);
  },[rows]);

  const branchKpi = useMemo(()=>
    branchBuckets.map((b,i)=>({
      branch:      b.branch,
      total:       b.total,
      overdue:     b.overdue,
      current:     b.current,
      count:       b.count,
      cr:          b.total>0 ? +((b.total-b.overdue)/b.total*100).toFixed(1) : 0,
      overdueRate: b.total>0 ? +(b.overdue/b.total*100).toFixed(1) : 0,
      color:       BRANCH_PAL[i%BRANCH_PAL.length],
    })).sort((a,b)=>b.total-a.total)
  ,[branchBuckets]);

  const caEvolutionByBranch = useMemo(()=>
    branchMonthly.slice(-12).map(row=>({
      ...row,
      label: typeof row.month==='string' ? row.month.slice(0,7) : String(row.month),
    }))
  ,[branchMonthly]);

  const agingBranches = useMemo(()=>branchBuckets.map(b=>b.branch),[branchBuckets]);
  const allBranches   = useMemo(()=>{
    const s = new Set([...branchNames,...agingBranches]);
    return [...s];
  },[branchNames,agingBranches]);

  // ── Print (iframe — no popup blockers) ────────────────────────
  const handlePrint = ()=>{
    const printable = document.getElementById('aging-printable');
    if(!printable){ alert('No content to print.'); return; }

    const clone = printable.cloneNode(true) as HTMLElement;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if(!doc){ document.body.removeChild(iframe); return; }

    const bg='#ffffff', fg='#111827', muted='#f3f4f6', border='#e5e7eb', mutedFg='#6b7280';
    const replaceVars = (el:HTMLElement)=>{
      if(el.style?.cssText){
        el.style.cssText = el.style.cssText
          .replace(/hsl\(var\(--card\)\)/g, bg)
          .replace(/hsl\(var\(--card-foreground\)\)/g, fg)
          .replace(/hsl\(var\(--border\)\)/g, border)
          .replace(/hsl\(var\(--muted\)\)/g, muted)
          .replace(/hsl\(var\(--muted-foreground\)\)/g, mutedFg)
          .replace(/hsl\(var\(--background\)\)/g, bg)
          .replace(/hsl\(var\(--foreground\)\)/g, fg);
      }
      Array.from(el.children).forEach(c=>replaceVars(c as HTMLElement));
    };
    replaceVars(clone);

    // ── KPI color helpers ──
    const crClass  = globalCR  >= 70  ? 'ck-good' : 'ck-bad';
    const dsoClass = globalDSO <= 90  ? 'ck-good' : globalDSO <= 120 ? 'ck-warn' : 'ck-bad';
    const orClass  = globalOR  <= 20  ? 'ck-good' : globalOR  <= 35  ? 'ck-warn' : 'ck-bad';
    const genDate  = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

    doc.open();
    doc.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Aging Receivables — ${activeDate}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    background: #fff;
    color: #111827;
    padding: 16px 20px;
    font-size: 13px;
  }

  @page { size: A4 landscape; margin: 8mm 10mm; }

  /* ══════════════════════════════════════════
     COVER PAGE — Premium Editorial
  ══════════════════════════════════════════ */

  .cover {
    width: 100%;
    height: 190mm;
    display: grid;
    grid-template-rows: 1fr;
    background: #fff;
    break-after: page !important;
    page-break-after: always !important;
    break-inside: avoid !important;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
  }

  /* Large indigo background panel — right side */
  .cover-bg-panel {
    position: absolute;
    top: 0; right: 0;
    width: 52%;
    height: 100%;
    background: linear-gradient(148deg, #f5f3ff 0%, #ede9fe 40%, #ddd6fe 80%, #c4b5fd 100%);
    clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);
    z-index: 0;
  }

  /* Gradient top stripe */
  .cover-stripe {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 45%, #0ea5e9 100%);
    z-index: 3;
  }

  /* Left accent bar */
  .cover-left-bar {
    position: absolute;
    top: 0; left: 0;
    width: 5px;
    height: 100%;
    background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 55%, #0ea5e9 100%);
    z-index: 3;
  }

  /* Dot grid decoration */
  .cover-dots {
    position: absolute;
    bottom: 32px;
    right: 40px;
    width: 108px;
    height: 108px;
    background-image: radial-gradient(circle, #6366f128 1.5px, transparent 1.5px);
    background-size: 13px 13px;
    z-index: 2;
  }

  /* Large decorative circle */
  .cover-circle {
    position: absolute;
    top: -60px;
    right: 4%;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    border: 1.5px solid #6366f118;
    z-index: 1;
  }
  .cover-circle-2 {
    position: absolute;
    top: -20px;
    right: 8%;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    border: 1px solid #6366f112;
    z-index: 1;
  }

  /* Inner layout */
  .cover-inner {
    position: relative;
    z-index: 4;
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
    padding: 28px 48px 26px 48px;
  }

  /* ── TOP ROW ── */
  .cover-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 18px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 0;
  }
  .cover-logo-row {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .cover-company {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #374151;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .cover-report-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #6366f1;
    background: #eef2ff;
    border: 1.5px solid #c7d2fe;
    padding: 4px 13px;
    border-radius: 20px;
  }
  .cover-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6366f1;
  }

  /* ── MAIN CONTENT (title + description) ── */
  .cover-main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: center;
    padding: 24px 0 20px;
  }
  .cover-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cover-eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #9ca3af;
    margin-bottom: 14px;
  }
  .cover-eyebrow-line {
    display: inline-block;
    width: 24px;
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 2px;
    flex-shrink: 0;
  }
  .cover-title {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-size: 56px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.03em;
    line-height: 1.0;
    margin: 0 0 4px;
  }
  .cover-title-accent {
    color: #6366f1;
    font-style: italic;
  }
  .cover-subtitle {
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 400;
    color: #6b7280;
    margin: 12px 0 20px;
    letter-spacing: -0.01em;
  }
  .cover-desc {
    font-size: 12px;
    color: #9ca3af;
    line-height: 1.85;
    border-left: 3px solid #e0e7ff;
    padding-left: 16px;
    margin: 0;
    max-width: 380px;
  }

  /* ── RIGHT PANEL (KPI cards) ── */
  .cover-right {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-left: 20px;
  }
  .cover-kpi-card {
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.9);
    border-radius: 14px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 12px rgba(99,102,241,0.07);
  }
  .cover-kpi-left {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .ck-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.11em;
    color: #9ca3af;
  }
  .ck-value {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: #0f172a;
  }
  .ck-note {
    font-size: 10px;
    color: #9ca3af;
  }
  .ck-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    flex-shrink: 0;
  }
  .ck-good  { color: #10b981; }
  .ck-warn  { color: #f59e0b; }
  .ck-bad   { color: #f43f5e; }
  .badge-good { background: #d1fae5; color: #059669; }
  .badge-warn { background: #fef3c7; color: #d97706; }
  .badge-bad  { background: #fee2e2; color: #dc2626; }

  /* ── BOTTOM ROW ── */
  .cover-bottom {
    border-top: 1px solid #e5e7eb;
    padding-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cover-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 10px;
    color: #9ca3af;
    font-family: 'DM Sans', sans-serif;
  }
  .cover-meta-sep {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #d1d5db;
  }
  .cover-confidential {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #c4b5fd;
    border: 1.5px solid #e0e7ff;
    padding: 3px 10px;
    border-radius: 20px;
    background: #faf5ff;
  }

  /* ── Print header ── */
  .ph {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 2px solid #6366f1;
    margin-bottom: 20px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .ph h1  { font-size:17px; font-weight:900; color:#111; letter-spacing:-0.02em; }
  .ph p   { font-size:11px; color:#6b7280; margin-top:3px; }
  .ph .badge {
    font-size:11px; font-weight:700; padding:4px 12px; border-radius:20px;
    background:#6366f115; color:#6366f1; border:1px solid #6366f130;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-shadow: none !important;
  }

  div[data-print="page1-block"] {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    break-after: avoid !important;
    page-break-after: avoid !important;
  }
  div[data-print="section-charts"] {
    break-before: page !important;
    page-break-before: always !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  div[data-print="section"] {
    break-before: page !important;
    page-break-before: always !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  div[data-print="section"] > div:first-child {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }
  div[style*="border-radius:16px"],
  div[style*="borderRadius:16"] {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    border: 1px solid #e5e7eb !important;
    margin-bottom: 12px;
  }
  div[style*="1fr 1fr"],
  div[style*="2fr 1fr"],
  div[style*="repeat(3,1fr)"],
  div[style*="repeat(4,1fr)"] {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  svg { overflow: visible !important; }
  div[style*="maxHeight"],
  div[style*="max-height"],
  div[style*="overflow"] {
    max-height: none !important;
    overflow: visible !important;
  }
</style>
</head><body>

<!-- ══════════════════════════════════════════════
     COVER PAGE — Premium Editorial
══════════════════════════════════════════════ -->
<div class="cover">
  <!-- Decorative elements -->
  <div class="cover-stripe"></div>
  <div class="cover-left-bar"></div>
  <div class="cover-bg-panel"></div>
  <div class="cover-dots"></div>
  <div class="cover-circle"></div>
  <div class="cover-circle-2"></div>

  <div class="cover-inner">

    <!-- TOP ROW -->
    <div class="cover-top">
      <div class="cover-logo-row">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <rect width="34" height="34" rx="9" fill="#6366f1" fill-opacity="0.1"/>
          <path d="M9 25V19M14 25V14M19 25V17M24 25V11" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
          <path d="M7 28H27" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="24" cy="8" r="2.5" fill="#f43f5e" fill-opacity="0.2" stroke="#f43f5e" stroke-width="1.5"/>
          <path d="M24 7V8.5L25 9.5" stroke="#f43f5e" stroke-width="1" stroke-linecap="round"/>
        </svg>
        <span class="cover-company">WEEG Financial</span>
      </div>
      <div class="cover-report-pill">
        <div class="cover-pill-dot"></div>
        Financial Report
      </div>
    </div>

    <!-- MAIN SPLIT -->
    <div class="cover-main">

      <!-- Left: Titles + description -->
      <div class="cover-left">
        <div class="cover-eyebrow">
          <span class="cover-eyebrow-line"></span>
          Accounts Receivable Management
        </div>
        <h1 class="cover-title">
          Aging<br/>
          <span class="cover-title-accent">Receivables</span>
        </h1>
        <p class="cover-subtitle">Detailed Analysis by Branch — ${activeDate}</p>
        <p class="cover-desc">
          Comprehensive view of outstanding receivables across all branches,
          including overdue aging analysis, top debtor profiles,
          collection performance, and monthly revenue trends.
        </p>
      </div>

      <!-- Right: KPI cards -->
      <div class="cover-right">

        <div class="cover-kpi-card">
          <div class="cover-kpi-left">
            <span class="ck-label">Total Receivables</span>
            <span class="ck-value">${formatCurrency(totals.total)}</span>
            <span class="ck-note">${rows.length} customers · ${allBranches.length} branches</span>
          </div>
          <span class="ck-badge badge-good" style="background:#ede9fe;color:#7c3aed;">
            Snapshot
          </span>
        </div>

        <div class="cover-kpi-card">
          <div class="cover-kpi-left">
            <span class="ck-label">Collection Rate</span>
            <span class="ck-value ${crClass}">${globalCR.toFixed(1)}%</span>
            <span class="ck-note">Target &gt; 70%</span>
          </div>
          <span class="ck-badge ${globalCR >= 70 ? 'badge-good' : 'badge-bad'}">
            ${globalCR >= 70 ? '✓ On target' : '⚠ Below'}
          </span>
        </div>

        <div class="cover-kpi-card">
          <div class="cover-kpi-left">
            <span class="ck-label">Average DSO</span>
            <span class="ck-value ${dsoClass}">${globalDSO.toFixed(0)} days</span>
            <span class="ck-note">Target &lt; 90 days</span>
          </div>
          <span class="ck-badge ${globalDSO <= 90 ? 'badge-good' : globalDSO <= 120 ? 'badge-warn' : 'badge-bad'}">
            ${globalDSO <= 90 ? '✓ Good' : globalDSO <= 120 ? '⚠ High' : '✗ Critical'}
          </span>
        </div>

        <div class="cover-kpi-card">
          <div class="cover-kpi-left">
            <span class="ck-label">Overdue Rate</span>
            <span class="ck-value ${orClass}">${globalOR.toFixed(1)}%</span>
            <span class="ck-note">Target &lt; 20%</span>
          </div>
          <span class="ck-badge ${globalOR <= 20 ? 'badge-good' : globalOR <= 35 ? 'badge-warn' : 'badge-bad'}">
            ${globalOR <= 20 ? '✓ Good' : globalOR <= 35 ? '⚠ Alert' : '✗ Critical'}
          </span>
        </div>

      </div>
    </div>

    <!-- BOTTOM ROW -->
    <div class="cover-bottom">
      <div class="cover-meta">
        <span>Generated on ${genDate}</span>
        <div class="cover-meta-sep"></div>
        <span>Snapshot: ${activeDate}</span>
        <div class="cover-meta-sep"></div>
        <span>${allBranches.length} branches</span>
        <div class="cover-meta-sep"></div>
        <span>${rows.length} customers</span>
      </div>
      <span class="cover-confidential">Confidential</span>
    </div>

  </div>
</div>

<!-- ══════════════════════════════════════════════
     REPORT CONTENT (all pages after cover)
══════════════════════════════════════════════ -->

${clone.outerHTML}
</body></html>`);
    doc.close();

    iframe.style.visibility = 'visible';
    iframe.style.zIndex = '9999';

    const cleanup = ()=>{
      iframe.style.visibility = 'hidden';
      setTimeout(()=>{ if(document.body.contains(iframe)) document.body.removeChild(iframe); },1500);
    };

    // ── Robust print trigger: wait for fonts + images via iframe onload ──
    const triggerPrint = ()=>{
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch(e) {
        // Fallback: open native print dialog on the parent window
        window.print();
      }
    };

    iframe.onload = ()=>{ setTimeout(triggerPrint, 800); };

    // Safety fallback if onload already fired (doc.write can bypass it)
    setTimeout(triggerPrint, 1800);

    if(iframe.contentWindow){
      iframe.contentWindow.onafterprint = cleanup;
      setTimeout(cleanup, 90000);
    }
  };

  if((loadRows||loadKpi)&&rows.length===0) return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,minHeight:400,justifyContent:'center'}}>
      <Spin/><p style={{fontSize:14,color:css.mutedFg}}>Loading aging data…</p>
    </div>
  );
  if(error) return(
    <div style={{...card,display:'flex',alignItems:'center',gap:12,color:C.rose}}>
      <AlertCircle size={18}/>
      <span style={{flex:1,fontSize:13}}>{error}</span>
      <button onClick={()=>{fetchRows(activeDate);fetchKpi(activeDate);}}
        style={{fontSize:12,padding:'7px 16px',borderRadius:9,border:`1px solid ${css.border}`,background:css.card,cursor:'pointer',color:css.cardFg}}>
        Retry
      </button>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',gap:0}}>

      {/* ═══ REPORT HEADER ═══ */}
      <div style={{...card,background:`linear-gradient(135deg,${C.indigo}08,${C.violet}05)`,marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:48,height:48,borderRadius:14,background:`${C.indigo}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <BarChart3 size={24} style={{color:C.indigo}}/>
            </div>
            <div>
              <h1 style={{fontSize:22,fontWeight:900,color:css.fg,margin:0,letterSpacing:'-0.03em'}}>
                Aging Receivables Report — By Branch
              </h1>
              <p style={{fontSize:12,color:css.mutedFg,margin:'3px 0 0'}}>
                Snapshot: <strong>{activeDate}</strong> &nbsp;·&nbsp; {rows.length} customers &nbsp;·&nbsp; {allBranches.length} branches
              </p>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{fetchRows(activeDate);fetchKpi(activeDate);}}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:`1px solid ${css.border}`,background:css.card,color:css.cardFg,fontSize:13,cursor:'pointer'}}>
              <RefreshCw size={13}/>Refresh
            </button>
            <button onClick={handlePrint}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:`1px solid ${C.indigo}40`,background:`${C.indigo}10`,color:C.indigo,fontSize:13,fontWeight:700,cursor:'pointer'}}>
              <Printer size={13}/>Print
            </button>
          </div>
        </div>

        {dates.length>1&&(
          <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${css.border}`}}>
            <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:css.mutedFg,marginBottom:8}}>
              Available snapshots ({dates.length})
            </p>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {dates.map(d=>(
                <span key={d} onClick={()=>setActiveDate(d)} style={{
                  fontSize:11,padding:'4px 12px',borderRadius:20,cursor:'pointer',transition:'all .15s',
                  background:d===activeDate?C.indigo:`${C.indigo}10`,
                  color:d===activeDate?'#fff':C.indigo,
                  fontWeight:d===activeDate?700:500,
                  border:`1px solid ${d===activeDate?C.indigo:`${C.indigo}25`}`,
                }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div id="aging-printable">

        {/* ── GLOBAL KPIs + Section 1 header + centered card → PAGE 1 ── */}
        <div data-print="page1-block">
          {/* ── GLOBAL KPIs ── */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:36}}>
            <KCard label="Total Receivables" value={formatCurrency(totals.total)}   sub={`${rows.length} customers · ${activeDate}`}              accent={C.indigo}  Icon={TrendingUp}  target="Track trend"/>
            <KCard label="Overdue > 60d"     value={formatCurrency(totals.overdue)} sub={`${pct(totals.overdue,totals.total)}% of total`}         accent={C.rose}    Icon={AlertTriangle} target="< 20% of total"/>
            <KCard label="Collection Rate"   value={`${globalCR.toFixed(1)}%`}      sub={globalCR>=70?'✓ Above target':'⚠ Below target'}         accent={C.emerald} Icon={Target}      target="> 70%"/>
            <KCard label="Average DSO"       value={`${globalDSO.toFixed(0)} days`} sub={globalDSO<=90?'✓ Within target':'⚠ Exceeds target'}    accent={C.amber}   Icon={Clock}       target="< 90 days"/>
          </div>

          <SecHead n={1}
            title="Receivables by Branch"
            sub="Total vs. overdue per branch · all branches visible · monthly credit revenue trend"
            color={C.indigo}/>

          <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
            <div style={{...card,width:'60%',minWidth:400}}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>
                Receivables by Branch — {activeDate}
              </h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:14}}>
                Total vs. overdue per branch · all branches visible
              </p>
              {loadRows||branchBuckets.length===0?<Empty h={280}/>:(
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={branchBuckets} layout="vertical" margin={{left:0,right:16,top:4,bottom:4}} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false}/>
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <YAxis type="category" dataKey="branch" width={100} tick={{fontSize:10,fill:css.mutedFg}} axisLine={false} tickLine={false}/>
                    <RTooltip content={<Tip/>}/>
                    <Legend wrapperStyle={{fontSize:11}} iconType="circle" iconSize={7}/>
                    <Bar dataKey="total"   name="Total"        radius={[0,5,5,0]}>
                      {branchBuckets.map((_,i)=><Cell key={i} fill={BRANCH_PAL[i%BRANCH_PAL.length]} fillOpacity={0.85}/>)}
                    </Bar>
                    <Bar dataKey="overdue" name="Overdue >60d" fill={C.rose} fillOpacity={0.55} radius={[0,5,5,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 1 charts grid → PAGE 2 ── */}
        <div data-print="section-charts" style={{marginBottom:52}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>
                Monthly Credit Revenue by Branch
              </h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:14}}>
                Area chart · trend and seasonality per branch · 12 months
              </p>
              {loadBranch?<Empty h={240}/>:caEvolutionByBranch.length===0?<Empty h={240}/>:(
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={caEvolutionByBranch} margin={{top:4,right:8,left:0,bottom:0}}>
                    <defs>
                      {branchNames.map((b,i)=>(
                        <linearGradient key={b} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={BRANCH_PAL[i%BRANCH_PAL.length]} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={BRANCH_PAL[i%BRANCH_PAL.length]} stopOpacity={0.02}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false}/>
                    <XAxis dataKey="label" tick={ax} axisLine={false} tickLine={false}/>
                    <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <RTooltip content={<Tip/>}/>
                    <Legend wrapperStyle={{fontSize:11,paddingTop:8}} iconType="circle" iconSize={8}/>
                    {branchNames.map((b,i)=>(
                      <Area key={b} type="monotone" dataKey={b} name={b}
                        stroke={BRANCH_PAL[i%BRANCH_PAL.length]} strokeWidth={2}
                        fill={`url(#grad-${i})`} dot={false}/>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>
                Aging Period Breakdown — {activeDate}
              </h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:14}}>
                Global receivables by age bucket · green = healthy · red = critical
              </p>
              {loadRows?<Empty h={240}/>:(
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={buckets} margin={{left:0,right:0,top:4,bottom:32}} barCategoryGap="12%">
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false}/>
                    <XAxis dataKey="label" tick={ax} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={54}/>
                    <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <RTooltip content={<Tip/>}/>
                    <Bar dataKey="amount" name="Amount" radius={[5,5,0,0]}>
                      {buckets.map((_,i)=><Cell key={i} fill={buckets[i].color}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2 — TOP DEBTORS BY BRANCH
        ════════════════════════════════════════════════════════════ */}
        <div data-print="section" style={{marginBottom:52}}>
          <SecHead n={2}
            title="Top Debtors by Branch"
            sub="Customers with the highest outstanding balances — risk-colored, all branches visible"
            color={C.rose}/>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>Top 15 Debtors — All Branches</h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:12}}>Bar color = risk level · red overlay = overdue (&gt;60d)</p>
              <div style={{display:'flex',gap:16,marginBottom:12}}>
                {[['Total',C.indigo],['Overdue >60d',C.rose]].map(([l,c])=>(
                  <span key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:css.mutedFg}}>
                    <span style={{width:10,height:10,borderRadius:3,background:c}}/>{l}
                  </span>
                ))}
              </div>
              {topDebtors.length===0?<Empty h={340}/>:(
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={topDebtors} layout="vertical" margin={{left:0,right:16,top:4,bottom:4}} barCategoryGap="16%">
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} horizontal={false}/>
                    <XAxis type="number" tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <YAxis type="category" dataKey="name" width={140} tick={{fontSize:10,fill:css.mutedFg}} axisLine={false} tickLine={false}/>
                    <RTooltip content={(p:any)=>{
                      if(!p.active||!p.payload?.length) return null;
                      const tot=p.payload.find((x:any)=>x.dataKey==='total')?.value??0;
                      const ov=p.payload.find((x:any)=>x.dataKey==='overdue')?.value??0;
                      const d=topDebtors.find(x=>x.name===p.label);
                      return(
                        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',boxShadow:'0 10px 30px rgba(0,0,0,.15)',fontSize:12,minWidth:230}}>
                          <p style={{fontWeight:700,color:'#111',marginBottom:4}}>{p.label}</p>
                          <p style={{color:'#6b7280',marginBottom:10,fontSize:11}}>Branch: {d?.branch??'—'}</p>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{color:'#6b7280'}}>Total</span><strong>{formatCurrency(tot)}</strong></div>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><span style={{color:'#6b7280'}}>Overdue &gt;60d</span><strong style={{color:C.rose}}>{formatCurrency(ov)}</strong></div>
                          <div style={{height:5,borderRadius:999,background:'#f3f4f6'}}><div style={{height:'100%',borderRadius:999,width:`${pct(ov,tot)}%`,background:C.rose}}/></div>
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                            <span style={{fontSize:10,color:'#9ca3af'}}>{pct(ov,tot)}% overdue</span>
                            <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:12,background:`${RISK_CFG[d?.risk??'low'].color}18`,color:RISK_CFG[d?.risk??'low'].color}}>{RISK_CFG[d?.risk??'low'].label}</span>
                          </div>
                        </div>
                      );
                    }}/>
                    <Bar dataKey="total" name="Total" radius={[0,5,5,0]}>
                      {topDebtors.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.8}/>)}
                    </Bar>
                    <Bar dataKey="overdue" name="Overdue >60d" fill={C.rose} fillOpacity={0.4} radius={[0,5,5,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{...card,flex:1}}>
                <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>Risk Distribution</h3>
                <p style={{fontSize:12,color:css.mutedFg,marginBottom:12}}>{rows.length} customers total</p>
                {(()=>{
                  const counts=Object.entries(RISK_CFG).map(([k,cfg])=>({
                    name:cfg.label,
                    value:rows.filter(r=>(r.risk_score??'low')===k).length,
                    amount:rows.filter(r=>(r.risk_score??'low')===k).reduce((s,r)=>s+r.total,0),
                    color:cfg.color,
                  }));
                  return(
                    <>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={counts.filter(c=>c.value>0)} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} strokeWidth={0}>
                            {counts.map((e,i)=><Cell key={i} fill={e.color}/>)}
                          </Pie>
                          <RTooltip formatter={(v:number)=>[`${v} customers`,'']} contentStyle={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12}}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {counts.map(c=>(
                          <div key={c.name}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                              <span style={{fontSize:11,color:css.mutedFg,display:'flex',alignItems:'center',gap:6}}>
                                <span style={{width:8,height:8,borderRadius:'50%',background:c.color}}/>{c.name}
                              </span>
                              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                                <span style={{fontSize:10,color:css.mutedFg}}>{formatCurrency(c.amount)}</span>
                                <span style={{fontSize:11,fontWeight:700,padding:'1px 8px',borderRadius:20,background:`${c.color}18`,color:c.color}}>{c.value}</span>
                              </div>
                            </div>
                            <div style={{height:4,borderRadius:999,background:css.muted}}>
                              <div style={{height:'100%',borderRadius:999,width:`${pct(c.value,rows.length)}%`,background:`linear-gradient(90deg,${c.color}60,${c.color})`}}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {branchBuckets.length>1&&(
            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>
                Risk Exposure by Branch — {activeDate}
              </h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:14}}>
                Current / 1-60d / Overdue (&gt;60d) breakdown per branch
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={branchBuckets} margin={{top:4,right:16,left:0,bottom:20}} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false}/>
                  <XAxis dataKey="branch" tick={ax} axisLine={false} tickLine={false} angle={-18} textAnchor="end" height={46}/>
                  <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <RTooltip content={<Tip/>}/>
                  <Legend wrapperStyle={{fontSize:11}} iconType="circle" iconSize={7}/>
                  <Bar dataKey="current" name="Current (not yet due)"    fill={C.emerald} fillOpacity={0.8}  stackId="a"/>
                  <Bar dataKey="d1_60"   name="1-60d (slightly overdue)" fill={C.amber}   fillOpacity={0.8}  stackId="a"/>
                  <Bar dataKey="d61plus" name="Overdue >60d"             fill={C.rose}    fillOpacity={0.85} stackId="a" radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 3 — COLLECTION RATE BY MONTH & BRANCH
        ════════════════════════════════════════════════════════════ */}
        <div data-print="section" style={{marginBottom:52}}>
          <SecHead n={3}
            title="Collection Rate by Month & Branch"
            sub="Collection efficiency per branch — based on current snapshot + monthly revenue trend"
            color={C.emerald}/>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>
                Monthly Credit Revenue by Branch
              </h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:14}}>
                Actual credit revenue · 12 months of transaction data · one line per branch
              </p>
              {loadBranch?(
                <Empty text="Loading…" h={260}/>
              ):caEvolutionByBranch.length===0?(
                <Empty text="No transaction data available" h={260}/>
              ):(
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={caEvolutionByBranch} margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="4 4" stroke={css.border} vertical={false}/>
                    <XAxis dataKey="label" tick={ax} axisLine={false} tickLine={false}/>
                    <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <RTooltip content={<Tip/>}/>
                    <Legend wrapperStyle={{fontSize:11,paddingTop:8}} iconType="circle" iconSize={8}/>
                    {branchNames.map((b,i)=>(
                      <Line key={b} type="monotone" dataKey={b} name={b}
                        stroke={BRANCH_PAL[i%BRANCH_PAL.length]} strokeWidth={2.5}
                        dot={{r:3,fill:BRANCH_PAL[i%BRANCH_PAL.length],strokeWidth:0}}
                        activeDot={{r:5,strokeWidth:0}}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>
                Collection Rate by Branch — {activeDate}
              </h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:14}}>
                Green ≥ 70% ✓ · Red &lt; 70% ⚠ · All branches side by side
              </p>
              {branchKpi.length===0?(
                <Empty text="Loading aging data…" h={260}/>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:10,overflowY:'auto',maxHeight:260}}>
                  {branchKpi.map((b:any,i:number)=>{
                    const good = b.cr>=70;
                    return(
                      <div key={i}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                          <span style={{fontSize:12,fontWeight:600,color:css.cardFg,display:'flex',alignItems:'center',gap:8}}>
                            <span style={{width:10,height:10,borderRadius:3,background:BRANCH_PAL[i%BRANCH_PAL.length]}}/>
                            {b.branch}
                          </span>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:11,color:css.mutedFg}}>{b.count} customers</span>
                            <span style={{fontSize:13,fontWeight:800,color:good?C.emerald:C.rose}}>{b.cr.toFixed(1)}%</span>
                            <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:good?`${C.emerald}18`:`${C.rose}18`,color:good?C.emerald:C.rose}}>
                              {good?'✓ Good':'⚠ Alert'}
                            </span>
                          </div>
                        </div>
                        <div style={{height:8,borderRadius:999,background:css.muted,position:'relative',overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:999,width:`${Math.min(100,b.cr)}%`,background:`linear-gradient(90deg,${good?C.emerald:C.rose}60,${good?C.emerald:C.rose})`}}/>
                          <div style={{position:'absolute',top:0,left:'70%',width:2,height:'100%',background:'#374151',opacity:.5}}/>
                        </div>
                        <p style={{fontSize:10,color:css.mutedFg,marginTop:2}}>
                          Overdue: {b.overdueRate.toFixed(1)}% · Total receivables: {formatCurrency(b.total)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>

            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 4px'}}>Collected vs. Still Outstanding — Global</h3>
              <p style={{fontSize:12,color:css.mutedFg,marginBottom:18}}>Breakdown of total credit revenue into collected amount and remaining balance</p>
              {loadKpi?<Empty h={220}/>:(()=>{
                const bars=[
                  {label:'Collected',   amount:collected,    color:C.emerald, note:'Already paid by customers'},
                  {label:'Outstanding', amount:totals.total, color:C.rose,    note:'Remaining receivables balance'},
                ];
                return(
                  <div style={{display:'flex',flexDirection:'column',gap:18}}>
                    {bars.map(b=>{
                      const p2=caTotal>0?(b.amount/caTotal)*100:0;
                      return(
                        <div key={b.label}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                            <span style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:700,color:css.cardFg}}>
                              <span style={{width:10,height:10,borderRadius:3,background:b.color}}/>{b.label}
                              <span style={{fontSize:11,color:css.mutedFg,fontWeight:400}}>{b.note}</span>
                            </span>
                            <div>
                              <span style={{fontSize:18,fontWeight:800,color:b.color}}>{formatCurrency(b.amount)}</span>
                              <span style={{fontSize:11,color:css.mutedFg,marginLeft:8}}>{p2.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div style={{height:14,borderRadius:999,background:css.muted,overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:999,width:`${Math.min(100,p2)}%`,background:`linear-gradient(90deg,${b.color}70,${b.color})`}}/>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{padding:'14px 18px',borderRadius:12,background:`${C.indigo}06`,border:`1px solid ${css.border}`}}>
                      <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:css.mutedFg,marginBottom:10}}>Detailed Calculation</p>
                      {[
                        {l:'Total credit revenue',    v:formatCurrency(caTotal),            c:css.cardFg},
                        {l:'− Remaining receivables', v:`−${formatCurrency(totals.total)}`, c:C.rose},
                        {l:'= Amount collected',      v:formatCurrency(collected),          c:C.emerald},
                      ].map(r=>(
                        <div key={r.l} style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                          <span style={{fontSize:12,color:css.mutedFg}}>{r.l}</span>
                          <span style={{fontSize:12,fontWeight:700,color:r.c}}>{r.v}</span>
                        </div>
                      ))}
                      <div style={{borderTop:`1px dashed ${css.border}`,paddingTop:10,marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:14,fontWeight:800,color:css.cardFg}}>Collection Rate</span>
                        <span style={{fontSize:26,fontWeight:900,color:globalCR>=70?C.emerald:C.rose}}>{globalCR.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={card}>
              <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:'0 0 18px'}}>Global KPIs vs. Targets</h3>
              {loadKpi?<Empty h={220}/>:(
                <div style={{display:'flex',flexDirection:'column',gap:18}}>
                  {[
                    {label:'Collection Rate', value:`${globalCR.toFixed(1)}%`,    bar:Math.min(100,globalCR),            threshold:'> 70%',    good:globalCR>=70,  accent:C.emerald},
                    {label:'Overdue Rate',    value:`${globalOR.toFixed(1)}%`,    bar:Math.min(100,globalOR),            threshold:'< 20%',    good:globalOR<=20,  accent:C.rose   },
                    {label:'DSO',             value:`${globalDSO.toFixed(0)}d`,   bar:Math.min(100,(globalDSO/180)*100), threshold:'< 90 days',good:globalDSO<=90, accent:C.amber  },
                  ].map(k=>(
                    <div key={k.label}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                        <span style={{fontSize:12,color:css.mutedFg,display:'flex',alignItems:'center',gap:6}}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:k.accent}}/>{k.label}
                        </span>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <span style={{fontSize:16,fontWeight:800,color:k.accent}}>{k.value}</span>
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:k.good?`${C.emerald}18`:`${C.rose}18`,color:k.good?C.emerald:C.rose}}>
                            {k.good?'✓ Good':'⚠ Alert'}
                          </span>
                        </div>
                      </div>
                      <div style={{height:8,borderRadius:999,background:css.muted,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:999,width:`${k.bar}%`,background:`linear-gradient(90deg,${k.accent}60,${k.accent})`}}/>
                      </div>
                      <p style={{fontSize:10,color:css.mutedFg,marginTop:3}}>Target: {k.threshold}</p>
                    </div>
                  ))}
                  <div style={{marginTop:4,paddingTop:14,borderTop:`1px dashed ${css.border}`}}>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:css.mutedFg,marginBottom:10}}>Industry Benchmarks</p>
                    {[
                      {m:'Collection Rate', b:'> 70%',    c:C.emerald},
                      {m:'Overdue Rate',    b:'< 20%',    c:C.rose   },
                      {m:'Standard DSO',   b:'< 90 days', c:C.amber  },
                      {m:'Excellent DSO',  b:'< 30 days', c:C.emerald},
                    ].map(b=>(
                      <div key={b.m} style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                        <span style={{fontSize:11,color:css.mutedFg}}>{b.m}</span>
                        <span style={{fontSize:11,fontWeight:700,color:b.c}}>{b.b}</span>
                      </div>
                    ))}
                  </div>
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
// REPORTS PAGE — landing
// ═══════════════════════════════════════════════════════════════════
export function ReportsPage(){
  const [activeReport,setActiveReport]=useState<string|null>(null);
  return(
    <div style={{background:css.bg,minHeight:'100vh',padding:'32px 28px'}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:24,fontWeight:900,color:css.fg,letterSpacing:'-0.03em',margin:0}}>Reports</h1>
        <p style={{fontSize:13,color:css.mutedFg,marginTop:4}}>Generate comprehensive analytical reports</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:28}}>
        {REPORT_TYPES.map(r=>(
          <div key={r.id} style={{...card,transition:'box-shadow .15s,border-color .15s',borderColor:activeReport===r.id?C.indigo:css.border,boxShadow:activeReport===r.id?`0 0 0 2px ${C.indigo}30,0 4px 20px rgba(0,0,0,.06)`:card.boxShadow as string}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:16}}>
              <span style={{fontSize:28,lineHeight:1}}>{r.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <h3 style={{fontSize:14,fontWeight:700,color:css.cardFg,margin:0}}>{r.title}</h3>
                  {r.live&&<span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:20,background:`${C.emerald}18`,color:C.emerald,border:`1px solid ${C.emerald}30`}}>Live</span>}
                </div>
                <p style={{fontSize:12,color:css.mutedFg,marginTop:4,lineHeight:1.5}}>{r.desc}</p>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>r.live&&setActiveReport(activeReport===r.id?null:r.id)} disabled={!r.live}
                style={{flex:1,height:34,display:'flex',alignItems:'center',justifyContent:'center',gap:6,borderRadius:9,border:'none',cursor:r.live?'pointer':'not-allowed',fontSize:13,fontWeight:600,background:r.live?(activeReport===r.id?C.indigo:`${C.indigo}15`):css.muted,color:r.live?(activeReport===r.id?'#fff':C.indigo):css.mutedFg,opacity:r.live?1:0.6}}>
                <FileText size={13}/>{r.live?(activeReport===r.id?'Close':'Generate'):'Coming soon'}
              </button>
              {r.live&&<button style={{width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:9,border:`1px solid ${css.border}`,background:css.card,cursor:'pointer',color:css.mutedFg}}><Download size={14}/></button>}
            </div>
          </div>
        ))}
      </div>
      {activeReport==='aging'&&<AgingReport/>}
      {activeReport==='profitability'&&<PricingMarginsReport/>}
      {!activeReport&&(
        <div style={{...card,background:`${css.muted}60`,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:56,borderStyle:'dashed'}}>
          <BarChart3 size={44} style={{color:css.mutedFg,opacity:.3}}/>
          <p style={{fontSize:14,color:css.mutedFg,margin:0}}>Select a report above and click <strong>Generate</strong></p>
          <p style={{fontSize:12,color:css.mutedFg,margin:0,opacity:.7}}>Aging Receivables available · more reports coming soon</p>
        </div>
      )}
    </div>
  );
}