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
// Types — used in active notification features
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

export interface AlertSyncItem {
  frontend_id: string;
  alert_type: NotificationAlertType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  detail?: string;
  metadata?: Record<string, unknown>;
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
  list: (params?: { is_read?: boolean; alert_type?: string; severity?: string; page?: number }) =>
    api.get<NotificationsResponse>(`/notifications/${qs(params)}`),

  markRead: (payload: { ids?: string[]; all?: boolean }) =>
    api.post<{ marked: number }>('/notifications/read/', payload),

  detect: () =>
    api.post<{ created: number; notifications: Notification[] }>('/notifications/detect/', {}),

  syncAlerts: (alerts: AlertSyncItem[]) =>
    api.post<{ synced: number; skipped: number }>('/notifications/sync/', { alerts }),
};
