// src/app/components/NotificationBell.tsx
import { Bell, CheckCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useNotifications } from '../lib/dataHooks';
import { useNavigate } from 'react-router';
import { useState } from 'react';

const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-blue-400',
  medium: 'bg-amber-400',
  critical: 'bg-red-500',
};

const SEVERITY_RING: Record<string, string> = {
  low: 'border-l-blue-400',
  medium: 'border-l-amber-400',
  critical: 'border-l-red-500',
};

const ALERT_TYPE_ICON: Record<string, string> = {
  overdue: '💰', risk: '⚠️', low_stock: '📦', sales_drop: '📉',
  high_receivables: '🏦', dso: '📅', concentration: '🎯',
  churn: '👥', anomaly: '⚡', scheduled_report: '📊', system: '🔔',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

interface NotificationBellProps {
  onViewAll?: () => void;
}

export function NotificationBell({ onViewAll }: NotificationBellProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, refetch, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  // ── Show ONLY critical alerts in the bell dropdown ──────────────────────
  const criticalNotifs = notifications.filter(n => n.severity === 'critical');
  const criticalUnread = criticalNotifs.filter(n => !n.is_read).length;

  const handleViewAll = () => {
    setOpen(false);
    onViewAll ? onViewAll() : navigate('/dashboard/alerts');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-full p-2 hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {criticalUnread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-600 text-white text-xs font-bold border-2 border-background">
              {criticalUnread > 99 ? '99+' : criticalUnread}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="font-semibold">Critical Alerts</p>
            {criticalUnread > 0 ? (
              <p className="text-xs text-muted-foreground">
                {criticalUnread} unread critical alert{criticalUnread > 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">All critical alerts reviewed</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={refetch}
              title="Refresh"
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            {criticalUnread > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
              >
                <CheckCheck className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* List — critical only */}
        <div className="max-h-[420px] overflow-y-auto">
          {criticalNotifs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">No critical alerts</p>
              <p className="text-xs mt-1 opacity-70">You're all clear</p>
            </div>
          ) : (
            criticalNotifs.map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3.5 border-b last:border-0 hover:bg-accent/50 cursor-pointer border-l-4 transition-colors ${SEVERITY_RING[notif.severity]} ${
                  !notif.is_read ? 'bg-red-50/40 dark:bg-red-950/10' : ''
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex gap-3">
                  <div className="text-xl mt-0.5 shrink-0">
                    {ALERT_TYPE_ICON[notif.alert_type] ?? '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold' : ''}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[notif.severity]}`} />
                      <span className="capitalize font-medium text-red-600">{notif.severity}</span>
                      <span>·</span>
                      <span>{timeAgo(notif.created_at)}</span>
                      {!notif.is_read && (
                        <span className="text-red-600 font-semibold ml-auto">New</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Footer */}
        <div className="p-3">
          <button
            onClick={handleViewAll}
            className="w-full py-2 text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center justify-center gap-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View full alert history
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}