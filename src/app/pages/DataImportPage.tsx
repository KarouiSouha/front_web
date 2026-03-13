// src/app/pages/DataImportPage.tsx
// Design unified with DashboardPage — zero functional changes

import { useState } from 'react';
import {
  Upload, CheckCircle2, AlertCircle, Download,
  Users, GitBranch, Clock, Package, ArrowLeftRight,
  Loader2,
} from 'lucide-react';
import { dataImportApi, ImportResult, DetectResult } from '../lib/dataApi';
import axios from 'axios';
import * as XLSX from 'xlsx';

// ── Brand palette (identical to DashboardPage) ────────────────────────────────
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

// ── CSS variable helpers (identical to DashboardPage) ─────────────────────────
const css = {
  card:    'hsl(var(--card))',
  cardFg:  'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))',
  muted:   'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg:      'hsl(var(--background))',
  fg:      'hsl(var(--foreground))',
};

// ── Shared card style (identical to DashboardPage) ────────────────────────────
const cardStyle: React.CSSProperties = {
  background:   css.card,
  borderRadius: 16,
  padding:      24,
  boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border:       `1px solid ${css.border}`,
};

// ── Template definitions (unchanged) ─────────────────────────────────────────
const templates = [
  {
    id: 'customers',
    title: 'العملاء',
    titleEn: 'Customers',
    description: 'Import customer data and their detailed information',
    fileName: 'العملاء.xlsx',
    icon: Users,
    accent: C.indigo,
    columns: ['Customer Name', 'Account Code', 'Detailed Address', 'Region Code', 'Phone Number', 'Email'],
    exactHeaders: ['اسم العميل', 'رمز الحساب', 'العنوان التفصيلي', 'رمز المنطقة', 'رقم الهاتف1', 'بريد الكتروني'],
    role: ['agent', 'manager'],
  },
  {
    id: 'branches',
    title: 'الفروع',
    titleEn: 'Branches',
    description: 'Import branch data and their locations',
    fileName: 'فروع.xlsx',
    icon: GitBranch,
    accent: C.emerald,
    columns: ['Branch', 'Address / Location', 'Phone Number'],
    exactHeaders: ['الفرع', 'العنوان / الموقع', 'رقم الهاتف'],
    role: ['agent', 'manager'],
  },
  {
    id: 'aging',
    title: 'أعمار الذمم',
    titleEn: 'Aging of Receivables',
    description: 'Import aging receivables report with time-based distribution',
    fileName: 'أعمار_الذمم.xlsx',
    icon: Clock,
    accent: C.amber,
    columns: ['#', 'Account', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '91-120 Days', '…', 'Over 330 Days', 'Total'],
    exactHeaders: ['#', 'الحساب', 'الحالي', '1-30 يوم', '31-60 يوم', '61-90 يوم', '91-120 يوم', '121-150 يوم', '151-180 يوم', '181-210 يوم', '211-240 يوم', '241-270 يوم', '271-300 يوم', '301-330 يوم', 'أكثر من 330 يوم', 'المجموع'],
    role: ['agent', 'manager'],
  },
  {
    id: 'inventory',
    title: 'الجرد الأفقي',
    titleEn: 'Year-End Inventory',
    description: 'Import year-end inventory with quantities and values per branch',
    fileName: 'جرد_افقي_نهاية_السنة.xlsx',
    icon: Package,
    accent: C.violet,
    columns: ['Index', 'Item Code', 'Item Name', 'Quantities (per branch)', 'Values (per branch)', 'Total Quantity', 'Price', 'Total Value'],
    exactHeaders: ['الفهرس', 'رمز المادة', 'اسم المادة', 'فرع الكريمية','قيمة   جرد   فرع  الكريمية  ', 'مخزن بنغازي', ' قيمة مخزن بنغازي','مخزن المزرعة', 'قيمة   مخزن   المزرعة  ', 'مخزن صالة عرض الدهماني', 'قيمة   فرع  الدهماني  ', 'مخزن صالة عرض جنزور', 'قيمة   فرع  جنزور ', 'مخزن صالة عرض مصراتة', 'قيمة   فرع   مصراتة ', 'إجمالي كمية (الوحدة الافتراضية)', 'السعر (كلفة الشركة)', 'إجمالي قيمة'],
    role: ['agent', 'manager'],
  },
  {
    id: 'movements',
    title: 'حركة المادة',
    titleEn: 'Stock Movements',
    description: 'Import item movements including inputs, outputs and balances',
    fileName: 'حركة_المادة.xlsx',
    icon: ArrowLeftRight,
    accent: C.rose,
    columns: ['Index', 'Item Code', 'Item Name', 'Date', 'Input Qty', 'Input Price', 'Output Qty', 'Output Price', 'Balance Price', 'Branch', 'Customer'],
    exactHeaders: ['الفهرس', 'رمز  المادة', 'رمز المعمل', 'اسم   المادة', 'تاريخ', 'حركة.1', 'كمية  الادخلات', 'سعر  الادخلات', 'اجمالي  الادخلات', 'كمية  الاخراجات', 'سعر  الاخراجات', 'اجمالي   الاخراجات', 'سعر  الرصيد', 'الفرع', 'العميل'],
    role: ['agent', 'manager'],
  },
];

// ── Small shared UI pieces ────────────────────────────────────────────────────

function Badge({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      display:       'inline-block',
      fontSize:      11,
      fontWeight:    600,
      padding:       '2px 10px',
      borderRadius:  20,
      background:    css.muted,
      color:         css.mutedFg,
      border:        `1px solid ${css.border}`,
      fontFamily:    'monospace',
      ...style,
    }}>
      {children}
    </span>
  );
}

// ── Panel wrapper (same as DashboardPage) ─────────────────────────────────────
function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>{title}</h3>
        {sub && <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DataImportPage() {
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading]     = useState(false);
  const [uploadResult, setUploadResult]   = useState<ImportResult | null>(null);
  const [previewData, setPreviewData]     = useState<DetectResult | null>(null);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const userRole = 'manager'; // Replace with real role from auth context

  // ── All handlers are 100% unchanged ───────────────────────────────────────

  const handleDownloadTemplate = (e: React.MouseEvent, template: typeof templates[0]) => {
    e.stopPropagation();
    setDownloadingId(template.id);
    try {
      const ws = XLSX.utils.aoa_to_sheet([template.exactHeaders]);
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      ws['!cols'] = template.exactHeaders.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, template.fileName);
    } catch (err) {
      console.error('Template generation failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      setErrorMsg('Only .xlsx and .xls files are accepted');
      return;
    }
    setSelectedFile(file);
    setErrorMsg(null);
    setPreviewData(null);
    setUploadResult(null);
    setUploadProgress(0);
    try {
      const detect = await dataImportApi.detectFile(file);
      setPreviewData(detect);
    } catch (err: any) {
      setErrorMsg(err.message || 'File detection failed');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadResult(null);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const token = localStorage.getItem('fasi_access_token');
      const response = await axios.post<ImportResult>(
        '/api/import/upload/',
        formData,
        {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        }
      );
      setUploadResult(response.data);
      setUploadProgress(100);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Import failed';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const hasPreview = previewData && previewData.preview_rows.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>

      {/* ── Page Header (matches DashboardPage header style) ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>
          Data Import Center
        </h1>
        <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>
          Upload Excel files to bring your business data into the system
        </p>
      </div>

      {/* ── Upload Card ── */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>Upload File</h3>
          <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 3 }}>
            Drag and drop your Excel file or click to browse (.xlsx / .xls)
          </p>
        </div>

        {/* Drop zone */}
        <div
          style={{
            border:        `2px dashed ${css.border}`,
            borderRadius:  12,
            padding:       48,
            textAlign:     'center',
            cursor:        isUploading ? 'not-allowed' : 'pointer',
            opacity:       isUploading ? 0.6 : 1,
            pointerEvents: isUploading ? 'none' : 'auto',
            transition:    'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { if (!isUploading) { (e.currentTarget as HTMLDivElement).style.borderColor = C.indigo; (e.currentTarget as HTMLDivElement).style.background = `${C.indigo}06`; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = css.border; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0] || null); }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Icon with accent ring */}
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: `${C.indigo}12`, border: `1.5px solid ${C.indigo}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={28} style={{ color: C.indigo }} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: css.cardFg, margin: 0 }}>Drop your Excel file here</p>
              <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 6 }}>or click to browse (recommended max 10 MB)</p>
            </div>
            <button
              disabled={isUploading}
              style={{
                padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                background: C.indigo, color: '#fff', border: 'none',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                boxShadow: `0 2px 12px ${C.indigo}40`,
              }}
            >
              Browse Files
            </button>
          </div>
          <input id="file-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
        </div>

        {/* Selected file info */}
        {selectedFile && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: 0 }}>{selectedFile.name}</p>
            <p style={{ fontSize: 12, color: css.mutedFg, margin: '2px 0 0' }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        )}

        {/* Error alert */}
        {errorMsg && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 10,
            background: `${C.rose}08`, border: `1px solid ${C.rose}30`,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertCircle size={16} style={{ color: C.rose, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: C.rose, margin: 0, fontWeight: 500 }}>{errorMsg}</p>
          </div>
        )}

        {/* Progress bar (DashboardPage mini-bar style, wider) */}
        {isUploading && (
          <div style={{ marginTop: 24 }}>
            <div style={{ height: 6, borderRadius: 999, background: css.muted, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                width: `${uploadProgress}%`,
                background: `linear-gradient(90deg, ${C.indigo}70, ${C.indigo})`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 12, color: css.mutedFg, marginTop: 8, fontWeight: 600 }}>
              {uploadProgress}% — Processing...
            </p>
          </div>
        )}

        {/* Success alert */}
        {uploadResult && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 10,
            background: `${C.emerald}08`, border: `1px solid ${C.emerald}30`,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <CheckCircle2 size={16} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, color: C.emerald, margin: 0, fontWeight: 700 }}>{uploadResult.message}</p>
              <p style={{ fontSize: 12, color: css.mutedFg, margin: '4px 0 0' }}>
                Imported rows: {uploadResult.result.total_rows}
                {uploadResult.result.errors.length > 0 && <> · Errors: {uploadResult.result.errors.length}</>}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
              background: !selectedFile || isUploading ? css.muted : C.indigo,
              color: !selectedFile || isUploading ? css.mutedFg : '#fff',
              border: 'none', cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
              boxShadow: !selectedFile || isUploading ? 'none' : `0 2px 12px ${C.indigo}40`,
              minWidth: 148,
            }}
          >
            {isUploading && <Loader2 size={14} className="animate-spin" />}
            {isUploading ? 'Importing...' : 'Start Import'}
          </button>
          <button
            onClick={() => { setSelectedFile(null); setPreviewData(null); setErrorMsg(null); setUploadResult(null); setUploadProgress(0); }}
            disabled={isUploading}
            style={{
              padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: 'transparent', border: `1px solid ${css.border}`,
              color: css.mutedFg, cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel / Clear
          </button>
        </div>
      </div>

      {/* ── File Preview (wrapped in Panel) ── */}
      {hasPreview && (
        <div style={{ marginBottom: 16 }}>
          <Panel
            title="File Preview"
            sub={`Detected type: ${previewData.detected_file_type} · ${previewData.preview_rows.length} preview rows`}
          >
            <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${css.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: css.muted }}>
                    {previewData.headers.map((header, i) => (
                      <th key={i} style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                        color: css.mutedFg, whiteSpace: 'nowrap',
                        borderBottom: `1px solid ${css.border}`,
                        fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
                      }}>
                        {header || `Column ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview_rows.map((row, rowIndex) => (
                    <tr key={rowIndex} style={{ borderBottom: `1px solid ${css.border}` }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = `${C.indigo}04`}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      {previewData.headers.map((header, colIndex) => (
                        <td key={colIndex} style={{ padding: '10px 14px', color: css.cardFg, whiteSpace: 'nowrap' }}>
                          {row[header] ?? row[`Column ${colIndex + 1}`] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ── Download Templates ── */}
      <Panel
        title="Download Templates"
        sub="Ready-to-use Excel import templates — click any template to view required columns"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {templates.map((template) => {
            const canDownload   = template.role.includes(userRole);
            const IconComponent = template.icon;
            const isExpanded    = expandedTemplate === template.id;
            const accent        = template.accent;

            return (
              <div
                key={template.id}
                onClick={() => canDownload && setExpandedTemplate(isExpanded ? null : template.id)}
                style={{
                  ...cardStyle,
                  padding:    20,
                  opacity:    canDownload ? 1 : 0.55,
                  cursor:     canDownload ? 'pointer' : 'default',
                  border:     isExpanded ? `1.5px solid ${accent}` : `1px solid ${css.border}`,
                  borderTop:  `3px solid ${accent}`,
                  position:   'relative',
                  overflow:   'hidden',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  boxShadow:  isExpanded
                    ? `0 0 0 1px ${accent}30, 0 4px 20px ${accent}15`
                    : cardStyle.boxShadow,
                }}
                onMouseEnter={e => { if (canDownload) (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px rgba(0,0,0,0.12)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = isExpanded ? `0 0 0 1px ${accent}30, 0 4px 20px ${accent}15` : (cardStyle.boxShadow as string); }}
              >
                {/* Watermark */}
                <div style={{
                  position: 'absolute', bottom: -20, right: -20,
                  width: 80, height: 80, borderRadius: '50%',
                  background: accent, opacity: 0.05, pointerEvents: 'none',
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>

                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `${accent}12`, border: `1.5px solid ${accent}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconComponent size={22} style={{ color: accent }} />
                  </div>

                  {/* Titles */}
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: css.cardFg, margin: 0 }}>{template.title}</h4>
                    <p style={{ fontSize: 11, color: css.mutedFg, margin: '2px 0 0', fontWeight: 500 }}>{template.titleEn}</p>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 12, color: css.mutedFg, margin: 0, minHeight: 36, lineHeight: 1.5 }}>
                    {template.description}
                  </p>

                  {/* File name badge */}
                  <Badge>{template.fileName}</Badge>

                  {/* Expanded columns */}
                  {isExpanded && (
                    <div style={{ width: '100%', marginTop: 4, paddingTop: 12, borderTop: `1px solid ${css.border}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: css.mutedFg, margin: '0 0 8px' }}>
                        Required columns:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                        {template.columns.map((col, i) => (
                          <span key={i} style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: `${accent}10`, color: accent, border: `1px solid ${accent}25`,
                          }}>
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Download button */}
                  <button
                    disabled={!canDownload || downloadingId === template.id}
                    onClick={(e) => handleDownloadTemplate(e, template)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      width: '100%', padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 700,
                      background: canDownload && downloadingId !== template.id ? `${accent}12` : css.muted,
                      color: canDownload && downloadingId !== template.id ? accent : css.mutedFg,
                      border: `1.5px solid ${canDownload && downloadingId !== template.id ? accent + '35' : css.border}`,
                      cursor: canDownload && downloadingId !== template.id ? 'pointer' : 'not-allowed',
                      marginTop: 4,
                    }}
                  >
                    {downloadingId === template.id ? (
                      <><Loader2 size={13} className="animate-spin" /> Downloading...</>
                    ) : (
                      <><Download size={13} /> Download Template</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}