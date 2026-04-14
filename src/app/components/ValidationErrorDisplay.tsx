/**
 * Enhanced error display components for Data Import
 */

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import {
    ValidateResult,
    ValidationError,
    formatValidationError, getValidationSummary
} from '../lib/dataImportApi';

const C = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  cyan: '#0ea5e9',
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#f43f5e',
};

const css = {
  card: 'hsl(var(--card))',
  cardFg: 'hsl(var(--card-foreground))',
  border: 'hsl(var(--border))',
  muted: 'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg: 'hsl(var(--background))',
  fg: 'hsl(var(--foreground))',
};

interface ValidationErrorDisplayProps {
  validation: ValidateResult;
  can_import: boolean;
}

/**
 * Main validation error display component
 * Shows structure errors, data errors, and warnings
 */
export function ValidationErrorDisplay({
  validation,
  can_import,
}: ValidationErrorDisplayProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['structure']) // Always show structure errors expanded
  );

  const toggleSection = (section: string) => {
    const newSections = new Set(expandedSections);
    newSections.has(section) ? newSections.delete(section) : newSections.add(section);
    setExpandedSections(newSections);
  };

  const hasStructureErrors = validation.structure_errors.length > 0;
  const hasDataErrors = validation.row_errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Main status card */}
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: can_import
            ? `${C.emerald}08`
            : `${C.rose}08`,
          border: `1px solid ${can_import ? `${C.emerald}30` : `${C.rose}30`}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        {can_import ? (
          <CheckCircle2
            size={16}
            style={{ color: C.emerald, flexShrink: 0, marginTop: 2 }}
          />
        ) : (
          <AlertCircle
            size={16}
            style={{ color: C.rose, flexShrink: 0, marginTop: 2 }}
          />
        )}
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: can_import ? C.emerald : C.rose,
              margin: 0,
            }}
          >
            {can_import ? 'File is valid ✓' : 'Validation failed'}
          </p>
          <p style={{ fontSize: 12, color: css.mutedFg, margin: '4px 0 0' }}>
            {getValidationSummary(validation)}
          </p>
        </div>
      </div>

      {/* Structure errors section */}
      {hasStructureErrors && (
        <ValidationSection
          title={`Template Mismatch (${validation.structure_errors.length} issue${validation.structure_errors.length > 1 ? 's' : ''})`}
          icon={AlertCircle}
          color={C.rose}
          isExpanded={expandedSections.has('structure')}
          onToggle={() => toggleSection('structure')}
          critical
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {validation.structure_errors.slice(0, 10).map((error, idx) => (
              <ErrorItem key={idx} error={error} />
            ))}
            {validation.structure_errors.length > 10 && (
              <p
                style={{
                  fontSize: 12,
                  color: css.mutedFg,
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                ... and {validation.structure_errors.length - 10} more
              </p>
            )}
          </div>
        </ValidationSection>
      )}

      {/* Data errors section */}
      {hasDataErrors && (
        <ValidationSection
          title={`Data Validation Errors (${validation.row_errors.length} row${validation.row_errors.length > 1 ? 's' : ''})`}
          icon={AlertTriangle}
          color={C.amber}
          isExpanded={expandedSections.has('data')}
          onToggle={() => toggleSection('data')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {validation.row_errors.slice(0, 10).map((error, idx) => (
              <ErrorItem key={idx} error={error} />
            ))}
            {validation.row_errors.length > 10 && (
              <p
                style={{
                  fontSize: 12,
                  color: css.mutedFg,
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                ... and {validation.row_errors.length - 10} more errors
              </p>
            )}
          </div>
        </ValidationSection>
      )}

      {/* Warnings section */}
      {hasWarnings && (
        <ValidationSection
          title={`Warnings (${validation.warnings.length})`}
          icon={AlertTriangle}
          color={C.amber}
          isExpanded={expandedSections.has('warnings')}
          onToggle={() => toggleSection('warnings')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {validation.warnings.map((warning, idx) => (
              <div key={idx} style={{ fontSize: 12, color: css.mutedFg }}>
                {warning.message}
              </div>
            ))}
          </div>
        </ValidationSection>
      )}

      {/* Summary stats */}
      {validation.summary && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: css.muted,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12,
          }}
        >
          <SummaryStat label="Total Rows" value={validation.summary.total_rows} />
          <SummaryStat
            label="Valid Rows"
            value={validation.summary.valid_rows}
            color={C.emerald}
          />
          <SummaryStat
            label="Invalid Rows"
            value={validation.summary.invalid_rows}
            color={validation.summary.invalid_rows > 0 ? C.rose : undefined}
          />
          <SummaryStat
            label="Errors"
            value={validation.summary.row_errors_count}
            color={validation.summary.row_errors_count > 0 ? C.rose : undefined}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Individual error item renderer
 */
function ErrorItem({ error }: { error: ValidationError }) {
  return (
    <div
      style={{
        padding: 8,
        borderRadius: 6,
        background: `${C.rose}04`,
        border: `1px solid ${C.rose}20`,
        fontSize: 12,
        color: css.cardFg,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{error.code}</div>
      <div style={{ color: css.mutedFg }}>{formatValidationError(error)}</div>
      {error.expected && (
        <div style={{ fontSize: 11, color: css.mutedFg, marginTop: 4 }}>
          Expected: <strong>{error.expected}</strong>
          {error.actual && <> · Got: <strong>{error.actual}</strong></>}
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible section for error groups
 */
function ValidationSection({
  title,
  icon: Icon,
  color,
  isExpanded,
  onToggle,
  critical,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size: number; style: React.CSSProperties }>;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  critical?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${color}30`,
        overflow: 'hidden',
        background: `${color}04`,
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={16} style={{ color, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: css.cardFg,
              textAlign: 'left',
            }}
          >
            {title}
          </span>
          {critical && (
            <span
              style={{
                display: 'inline-block',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: color,
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              Critical
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          style={{
            color: css.mutedFg,
            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${color}20`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Summary statistic cell
 */
function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: color || css.cardFg,
          margin: 0,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: css.mutedFg, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

export default ValidationErrorDisplay;
