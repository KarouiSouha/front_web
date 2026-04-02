// src/app/components/AlertHistoryTab.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, CheckCheck, Trash2, Check, RefreshCw, Search } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { notificationsApi, type Notification, type NotificationSeverity, type NotificationAlertType } from '../lib/notificationsApi';
import { toast } from 'sonner';

const SEVERITY_BADGE: Record<NotificationSeverity, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const SEVERITY_LEFT: Record<NotificationSeverity, string> = {
  low: 'border-l-blue-400',
  medium: 'border-l-amber-400',
  critical: 'border-l-red-500',
};

const TYPE_ICON: Record<string, string> = {
  low_stock: '📦', overdue: '💰', risk: '⚠️', sales_drop: '📉',
  high_receivables: '🏦', dso: '📅', concentration: '🎯', churn: '👥',
  anomaly: '⚡', scheduled_report: '📊', system: '🔔',
};

const TYPE_LABELS: Record<NotificationAlertType, string> = {
  low_stock: 'Stock Bas',
  overdue: 'Échéance Dépassée',
  risk: 'Risque Crédit',
  sales_drop: 'Baisse des Ventes',
  high_receivables: 'Créances Élevées',
  dso: 'DSO',
  concentration: 'Concentration Client',
  churn: 'Churn',
  anomaly: 'Anomalie',
  scheduled_report: 'Rapport Planifié',
  system: 'Système',
};

// ─────────────────────────────────────────────────────────────────────────────
// Déduplication côté frontend
// Tant que la DB contient des doublons (même titre + même alert_type),
// on affiche seulement la version la plus récente par clé logique.
// Ceci est un filet de sécurité — le vrai fix est AlertsPage.tsx (useRef).
// ─────────────────────────────────────────────────────────────────────────────
function deduplicateNotifications(items: Notification[]): Notification[] {
  const seen = new Map<string, Notification>();

  // Trier du plus récent au plus ancien — on garde le plus récent par clé
  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const n of sorted) {
    let key: string;

    if (n.alert_type === 'low_stock' && (n.metadata as any)?.product_code) {
      key = `low_stock::${(n.metadata as any).product_code}`;
    } else if (n.alert_type === 'risk' && (n.metadata as any)?.id) {
      key = `risk::${(n.metadata as any).id}`;
    } else if (n.alert_type === 'dso') {
      key = 'dso';
    } else {
      key = `${n.alert_type}::${n.title.trim()}`;
    }

    // Garder le plus récent — si même clé, l'entrée déjà dans la Map est plus
    // récente (tri descendant), donc on ne l'écrase pas
    if (!seen.has(key)) {
      seen.set(key, n);
    }
  }

  // Retourner dans l'ordre décroissant de création
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function AlertHistoryTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState<NotificationSeverity | 'all'>('all');
  const [filterType, setFilterType] = useState<NotificationAlertType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');

  const load = useCallback(async (pageNum: number, replace = true) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: any = { page: pageNum, page_size: PAGE_SIZE };
      if (filterSev !== 'all') params.severity = filterSev;
      if (filterType !== 'all') params.alert_type = filterType;
      if (filterRead === 'unread') params.is_read = false;
      if (filterRead === 'read') params.is_read = true;
      if (search.trim()) params.search = search.trim();

      const res = await notificationsApi.list(params);
      const data = res as any;
      const raw: Notification[] = data.results ?? [];

      // Dédupliquer avant de stocker
      const items = deduplicateNotifications(raw);

      setTotal(data.count ?? 0);
      setNotifications(prev => replace ? items : deduplicateNotifications([...prev, ...items]));
      setPage(pageNum);
    } catch (err) {
      toast.error('Erreur de chargement de l\'historique');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterSev, filterType, filterRead, search]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const displayed = useMemo(() => {
    if (!search.trim()) return notifications;
    const q = search.toLowerCase();
    return notifications.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const hasMore = notifications.length < total && !search.trim();

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead({ ids: [id] });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      toast.error('Erreur');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markRead({ all: true });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Tout marqué comme lu');
      load(1, true);
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      toast.success('Notification supprimée');
    } catch {
      toast.error('Erreur de suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Bell className="h-6 w-6 text-indigo-600" />
            Historique des Alertes
          </h2>
          <p className="text-muted-foreground">{displayed.length} notification{displayed.length !== 1 ? 's' : ''} affichée{displayed.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={handleMarkAllRead} variant="outline">
          <CheckCheck className="mr-2 h-4 w-4" />
          Tout marquer lu
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher une alerte..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-10 rounded-xl border bg-background"
          />
        </div>

        <select value={filterSev} onChange={e => setFilterSev(e.target.value as any)} className="h-11 rounded-xl border px-4 bg-background">
          <option value="all">Toutes sévérités</option>
          <option value="critical">Critique</option>
          <option value="medium">Moyenne</option>
          <option value="low">Faible</option>
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="h-11 rounded-xl border px-4 bg-background">
          <option value="all">Tous types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select value={filterRead} onChange={e => setFilterRead(e.target.value as any)} className="h-11 rounded-xl border px-4 bg-background">
          <option value="all">Toutes</option>
          <option value="unread">Non lues</option>
          <option value="read">Lues</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune alerte trouvée avec ces filtres</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayed.map(n => (
              <div
                key={n.id}
                className={`p-5 rounded-2xl border border-l-4 ${SEVERITY_LEFT[n.severity]} ${
                  !n.is_read ? 'bg-accent/10' : 'bg-card'
                } transition-colors`}
              >
                <div className="flex gap-4">
                  <div className="text-3xl shrink-0">{TYPE_ICON[n.alert_type] ?? '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold truncate">{n.title}</span>
                        <Badge className={`shrink-0 ${SEVERITY_BADGE[n.severity]}`}>{n.severity}</Badge>
                        {!n.is_read && (
                          <span className="shrink-0 text-xs font-medium text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full">
                            Nouveau
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!n.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkRead(n.id)}
                            title="Marquer comme lu"
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(n.id)}
                          title="Supprimer"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{n.message}</p>
                    {n.detail && (
                      <p className="text-xs text-muted-foreground mt-1 opacity-75">{n.detail}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">{TYPE_LABELS[n.alert_type as NotificationAlertType] ?? n.alert_type}</span>
                      <span>·</span>
                      <span>{new Date(n.created_at).toLocaleString('fr-TN')}</span>
                      {n.is_read && n.read_at && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600">Lu le {new Date(n.read_at).toLocaleString('fr-TN')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => load(page + 1, false)}
                disabled={loadingMore}
                className="min-w-40"
              >
                {loadingMore ? (
                  <><RefreshCw className="animate-spin h-4 w-4 mr-2" />Chargement...</>
                ) : (
                  'Charger plus'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}