import { useState } from 'react';
import { BarChart3, FileText, Target, Clock, BarChart2, DollarSign, Package, Globe } from 'lucide-react';
import { AgingReport } from './AgingReport';
import { GeneralReport } from './GeneralReport';
import { SupplyPolicyPage } from './SupplyPolicyPage';
import { PricingProfitabilityReport } from './PricingProfitabilityReport';
import { InventoryTurnoverReport } from './InventoryTurnoverReport';

const C = { indigo: '#4f46e5', emerald: '#059669' };
const css = {
  card: 'hsl(var(--card))', border: 'hsl(var(--border))',
  muted: 'hsl(var(--muted))', mutedFg: 'hsl(var(--muted-foreground))',
  bg: 'hsl(var(--background))', fg: 'hsl(var(--foreground))',
  cardFg: 'hsl(var(--card-foreground))',
};
const card: React.CSSProperties = {
  background: css.card, borderRadius: 12, padding: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
  border: `1px solid ${css.border}`,
};

const ICON_MAP: Record<string, React.ReactNode> = {
  general:       <Target       size={22} strokeWidth={1.5} />,
  aging:         <Clock        size={22} strokeWidth={1.5} />,
  turnover:      <BarChart2    size={22} strokeWidth={1.5} />,
  profitability: <DollarSign   size={22} strokeWidth={1.5} />,
  supply:        <Package      size={22} strokeWidth={1.5} />,
  distribution:  <Globe        size={22} strokeWidth={1.5} />,
};

const REPORT_TYPES = [
  { id: 'general',       title: 'General Report',          desc: 'Overview of key metrics and performance indicators',                                    live: true  },
  { id: 'aging',         title: 'Aging Receivables',       desc: 'Receivables, top debtors, collection rate and customer balances — all branches',       live: true  },
  { id: 'turnover',      title: 'Inventory Turnover',      desc: 'Stock value, branches, categories, rotation and slow-moving items',                    live: true  },
  { id: 'profitability', title: 'Pricing & Profitability', desc: 'Revenue, profit and ratio by month/branch, product and customer profitability',        live: true  },
  { id: 'supply',        title: 'Stock Policy',            desc: 'Reorder points, lead times, optimal stock levels',                                     live: true  },
  { id: 'distribution',  title: 'Sales Behavior',          desc: 'Patterns by channel, region, and customer segment',                                    live: false },
];

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>Generate comprehensive analytical reports</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {REPORT_TYPES.map(r => {
          const isActive = activeReport === r.id;
          return (
            <div key={r.id} style={{
              ...card,
              position: 'relative',
              transition: 'box-shadow .15s, border-color .15s',
              borderColor: isActive ? C.indigo : css.border,
              boxShadow: isActive
                ? `0 0 0 2px ${C.indigo}25, 0 4px 20px rgba(0,0,0,0.07)`
                : card.boxShadow as string,
            }}>
              {isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.indigo, borderRadius: '12px 12px 0 0' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ color: isActive ? C.indigo : css.mutedFg, marginTop: 2, flexShrink: 0 }}>
                  {ICON_MAP[r.id]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: css.cardFg, margin: 0 }}>{r.title}</h3>
                    {r.live && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: `${C.emerald}14`, color: C.emerald, border: `1px solid ${C.emerald}25`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: css.mutedFg, marginTop: 4, lineHeight: 1.5 }}>{r.desc}</p>
                </div>
              </div>
              <button
                onClick={() => r.live && setActiveReport(isActive ? null : r.id)}
                disabled={!r.live}
                style={{
                  width: '100%', height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  borderRadius: 9, border: 'none', cursor: r.live ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 600,
                  background: r.live ? (isActive ? C.indigo : `${C.indigo}12`) : css.muted,
                  color: r.live ? (isActive ? '#fff' : C.indigo) : css.mutedFg,
                  opacity: r.live ? 1 : 0.55,
                  transition: 'all .12s',
                  boxShadow: isActive ? `0 2px 10px ${C.indigo}35` : 'none',
                }}>
                <FileText size={12} />
                {r.live ? (isActive ? 'Close report' : 'Generate') : 'Coming soon'}
              </button>
            </div>
          );
        })}
      </div>

      {activeReport === 'aging'         && <AgingReport />}
      {activeReport === 'general'       && <GeneralReport />}
      {activeReport === 'supply'        && <SupplyPolicyPage />}
      {activeReport === 'profitability' && <PricingProfitabilityReport />}
      {activeReport === 'turnover'      && <InventoryTurnoverReport />}

      {!activeReport && (
        <div style={{ ...card, background: `${css.muted}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 56, borderStyle: 'dashed' }}>
          <BarChart3 size={40} style={{ color: css.mutedFg, opacity: .2 }} />
          <p style={{ fontSize: 14, color: css.mutedFg, margin: 0 }}>
            Select a report above and click <strong>Generate</strong>
          </p>
          <p style={{ fontSize: 12, color: css.mutedFg, margin: 0, opacity: .7 }}>
            General Report, Aging Receivables, Pricing &amp; Profitability, Inventory Turnover, Stock Policy available
          </p>
        </div>
      )}
    </div>
  );
}