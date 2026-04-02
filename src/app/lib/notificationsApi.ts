/**
 * src/app/lib/notificationsApi.ts
 * ─────────────────────────────────
 * Full API client for the notifications app:
 *   - Notification (in-app)
 *   - AlertThreshold (configurable thresholds)
 *   - ScheduledReport (automated reports)
 */

import { api } from './api';

// ─────────────────────────────────────────────
// Types — mirrors Django models exactly
// ─────────────────────────────────────────────

export type NotificationSeverity = 'low' | 'medium' | 'critical';

export type NotificationAlertType =
  | 'overdue' | 'risk' | 'low_stock' | 'sales_drop'
  | 'high_receivables' | 'dso' | 'concentration' | 'churn'
  | 'anomaly' | 'scheduled_report' | 'system';

export interface Notification {
  id: string;
  alert_type: NotificationAlertType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  detail: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
  read_at: string | null;
  recipient_name: string | null;
}

export interface NotificationsResponse {
  count: number;
  unread_count: number;
  results: Notification[];
}

export type ThresholdType =
  | 'dso' | 'overdue_ratio' | 'revenue_drop'
  | 'low_stock_qty' | 'churn_score' | 'concentration';

export interface AlertThreshold {
  id: string;
  threshold_type: ThresholdType;
  threshold_type_display: string;
  label: string;
  value: number;
  severity: NotificationSeverity;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  configured_by_name: string | null;
}

export interface AlertThresholdPayload {
  threshold_type: ThresholdType;
  label?: string;
  value: number;
  severity: NotificationSeverity;
  is_active?: boolean;
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportType = 'kpi' | 'churn' | 'stock' | 'anomaly' | 'seasonal' | 'full';

export interface ScheduledReport {
  id: string;
  name: string;
  report_type: ReportType;
  report_type_display: string;
  frequency: ReportFrequency;
  frequency_display: string;
  recipients: string[];
  send_day: number;
  send_hour: number;
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
}

export interface ScheduledReportPayload {
  name: string;
  report_type: ReportType;
  frequency: ReportFrequency;
  recipients: string[];
  send_day?: number;
  send_hour?: number;
  is_active?: boolean;
}

// ─────────────────────────────────────────────
// Sync payload — alerts computed by AlertsPage
// ─────────────────────────────────────────────

export interface AlertSyncItem {
  /** Stable frontend ID, e.g. "combined-42", "dso-2026-04-02" */
  frontend_id: string;
  alert_type: NotificationAlertType;
  severity: NotificationSeverity;
  /** Short title shown in the bell dropdown (≤255 chars) */
  title: string;
  /** Full descriptive message */
  message: string;
  /** Optional detail line */
  detail?: string;
  /** Optional metadata blob */
  metadata?: Record<string, unknown>;
}

export interface AlertSyncResponse {
  synced: number;
  skipped: number;
}

// ─────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ─────────────────────────────────────────────
// API methods
// ─────────────────────────────────────────────

export const notificationsApi = {
  // ── Notifications ──────────────────────────────────────────────────────
  list: (params?: { is_read?: boolean; alert_type?: string; severity?: string; page?: number }) =>
    api.get<NotificationsResponse>(`/notifications/${qs(params)}`),

  markRead: (payload: { ids?: string[]; all?: boolean }) =>
    api.post<{ marked: number }>('/notifications/read/', payload),

  detect: () =>
    api.post<{ created: number; notifications: Notification[] }>('/notifications/detect/', {}),

  /**
   * syncAlerts — push frontend-computed Smart Alerts to the backend so they
   * appear in the notification bell and can trigger emails.
   *
   * Call this whenever rawAlerts changes (e.g. after data loads or Refresh).
   * The backend deduplicates by frontend_id+date, so calling it repeatedly
   * is safe — already-synced alerts are silently skipped.
   *
   * Only syncs PENDING (non-resolved) alerts.
   */
  syncAlerts: (alerts: AlertSyncItem[]) =>
    api.post<AlertSyncResponse>('/notifications/sync/', { alerts }),

  delete: (id: string) =>
    api.delete<null>(`/notifications/${id}/`),

  // ── Alert Thresholds ───────────────────────────────────────────────────
  listThresholds: () =>
    api.get<{ count: number; results: AlertThreshold[] }>('/notifications/thresholds/'),

  createThreshold: (payload: AlertThresholdPayload) =>
    api.post<AlertThreshold>('/notifications/thresholds/', payload),

  updateThreshold: (id: string, payload: Partial<AlertThresholdPayload>) =>
    api.patch<AlertThreshold>(`/notifications/thresholds/${id}/`, payload),

  deleteThreshold: (id: string) =>
    api.delete<null>(`/notifications/thresholds/${id}/`),

  // ── Scheduled Reports ──────────────────────────────────────────────────
  listReports: () =>
    api.get<{ count: number; results: ScheduledReport[] }>('/notifications/reports/'),

  createReport: (payload: ScheduledReportPayload) =>
    api.post<ScheduledReport>('/notifications/reports/', payload),

  updateReport: (id: string, payload: Partial<ScheduledReportPayload>) =>
    api.patch<ScheduledReport>(`/notifications/reports/${id}/`, payload),

  deleteReport: (id: string) =>
    api.delete<null>(`/notifications/reports/${id}/`),

  sendNow: (id: string) =>
    api.post<{ message: string }>(`/notifications/reports/${id}/send/`, {}),
};

// ─────────────────────────────────────────────
// Threshold metadata — labels, units, defaults
// ─────────────────────────────────────────────

export const THRESHOLD_META: Record<ThresholdType, {
  label: string;
  unit: string;
  description: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}> = {
  dso: {
    label: 'DSO (Days Sales Outstanding)',
    unit: 'days',
    description: 'Alert when average collection period exceeds this threshold',
    defaultValue: 60,
    min: 10,
    max: 365,
    step: 1,
  },
  overdue_ratio: {
    label: 'Overdue Ratio',
    unit: '%',
    description: 'Alert when % of receivables overdue exceeds this threshold',
    defaultValue: 25,
    min: 1,
    max: 100,
    step: 1,
  },
  revenue_drop: {
    label: 'Revenue Drop',
    unit: '%',
    description: 'Alert when month-over-month revenue declines by this amount',
    defaultValue: 15,
    min: 1,
    max: 100,
    step: 1,
  },
  low_stock_qty: {
    label: 'Low Stock Quantity',
    unit: 'units',
    description: 'Alert when product stock falls below this quantity',
    defaultValue: 5,
    min: 1,
    max: 1000,
    step: 1,
  },
  churn_score: {
    label: 'Churn Score',
    unit: '(0–1)',
    description: 'Alert when customer churn probability exceeds this score',
    defaultValue: 0.7,
    min: 0.1,
    max: 1.0,
    step: 0.05,
  },
  concentration: {
    label: 'Client Concentration',
    unit: '%',
    description: 'Alert when top 3 clients hold more than this % of receivables',
    defaultValue: 50,
    min: 10,
    max: 100,
    step: 5,
  },
};

export const REPORT_TYPE_META: Record<ReportType, { label: string; description: string; icon: string }> = {
  kpi:      { label: 'KPI Analysis',         description: 'Revenue, DSO, margins, stock KPIs',        icon: '📊' },
  churn:    { label: 'Churn Prediction',      description: 'At-risk customer ranking and scores',       icon: '📉' },
  stock:    { label: 'Stock Optimization',    description: 'ABC analysis, reorder points, EOQ',         icon: '📦' },
  anomaly:  { label: 'Anomaly Detection',     description: 'Statistical outliers in revenue/customers', icon: '⚡' },
  seasonal: { label: 'Seasonal Analysis',     description: 'Demand indices and peak forecasts',         icon: '📅' },
  full:     { label: 'Full Business Report',  description: 'All modules combined in one report',        icon: '🧠' },
};