import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  FileText,
  Sparkles,
  Settings,
  X,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import weegLogo from './image/logo.jpeg';
import weegLogoDark from './image/logoDark.png';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuGroups = [
  {
    label: 'Overview',
    items: [
      { id: '', label: 'Dashboard', icon: LayoutDashboard, permission: 'view-dashboard' },
      { id: 'team', label: 'My Team', icon: Users, permission: 'view-team' },
      { id: 'alerts', label: 'Smart Alerts', icon: Bell, permission: 'receive-notifications'},
    ],
  },
  {
    label: 'Data',
    items: [
      { id: 'import', label: 'Data Import', icon: Upload, permission: 'import-data' },
      { id: 'kpi', label: 'KPI Engine', icon: TrendingUp, permission: 'view-kpi' },
      { id: 'sales', label: 'Sales & Purchases', icon: ShoppingCart, permission: 'view-sales' },
      { id: 'inventory', label: 'Multi-Branch Inventory', icon: Package, permission: 'view-inventory' },
      { id: 'aging', label: 'Aging Receivables', icon: AlertTriangle, permission: 'view-aging' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'reports', label: 'Reports', icon: FileText, permission: 'view-reports' },
      { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, permission: 'ai-insights', highlight: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, permission: 'view-profile' },
    ],
  },
];

const adminMenuItems = [
  { id: 'admin-verification', label: 'Verify Managers', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true });
    return () => obs.disconnect();
  }, []);

  const logoSrc = isDarkMode ? weegLogoDark : weegLogo;

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'manager' || user.role === 'admin') return true;
    return user.permissions.includes(permission);
  };

  const filterItems = (items: typeof menuGroups[0]['items']) => {
    if (user?.role === 'admin') return [];
    if (user?.role === 'manager') return items;
    return items.filter(i => hasPermission(i.permission));
  };

  const visibleGroups = isAdmin
    ? []
    : menuGroups
        .map(g => ({ ...g, items: filterItems(g.items) }))
        .filter(g => g.items.length > 0);

  const dark = isDarkMode;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-[240px] transform transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: dark ? '#0d1117' : '#ffffff',
          borderRight: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
        }}
      >
        {/* Top gradient stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #0ea5e9 0%, #6366f1 55%, #f59e0b 100%)',
        }} />

        <div className="flex h-full flex-col">

          {/* ── Logo header ── */}
          <div style={{
            height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 18px',
            borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          }}>
            <img src={logoSrc} alt="Weeg" width={100} style={{ objectFit: 'contain', flexShrink: 0 }} />
            <button
              onClick={onClose}
              className="lg:hidden"
              style={{
                padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', lineHeight: 0,
                color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* ── User identity pill ── */}
          {user && (
            <div style={{ padding: '12px 12px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 11px',
                borderRadius: 12,
                background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0,
                  letterSpacing: '0.04em',
                }}>
                  {(user.name ?? 'U').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    fontSize: 12.5, fontWeight: 500, margin: 0, lineHeight: 1.3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: dark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
                  }}>{user.name}</p>
                  <p style={{
                    fontSize: 11, margin: 0, lineHeight: 1.3, textTransform: 'capitalize',
                    color: dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.38)',
                  }}>{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation groups ── */}
          <nav style={{
            flex: 1, overflowY: 'auto', padding: '12px 10px',
            scrollbarWidth: 'none',
          }}>
            {visibleGroups.map((group, gi) => (
              <div key={group.label} style={{ marginBottom: gi < visibleGroups.length - 1 ? 18 : 0 }}>
                {/* Group label */}
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                  textTransform: 'uppercase', margin: '0 0 3px',
                  padding: '0 8px',
                  color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)',
                }}>
                  {group.label}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    const isHov = hoveredItem === item.id && !isActive;
                    const isHighlight = !!(item as any).highlight;
                    const badge = (item as any).badge as number | undefined;

                    return (
                      <button
                        key={item.id}
                        onClick={() => { onNavigate(item.id); onClose(); }}
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          width: '100%', padding: '7px 8px', borderRadius: 9,
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          position: 'relative', transition: 'background 0.13s',
                          background: isActive
                            ? (dark ? 'rgba(14,165,233,0.13)' : 'rgba(14,165,233,0.08)')
                            : isHov
                            ? (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                            : 'transparent',
                        }}
                      >
                        {/* Active left pip */}
                        {isActive && (
                          <span style={{
                            position: 'absolute', left: 0, top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3, height: 16, borderRadius: '0 3px 3px 0',
                            background: 'linear-gradient(180deg, #0ea5e9, #6366f1)',
                          }} />
                        )}

                        {/* Icon box */}
                        <span style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.13s',
                          background: isActive
                            ? (dark ? 'rgba(14,165,233,0.22)' : 'rgba(14,165,233,0.13)')
                            : isHighlight
                            ? (dark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)')
                            : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                          color: isActive
                            ? '#0ea5e9'
                            : isHighlight
                            ? '#6366f1'
                            : (dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)'),
                        }}>
                          <Icon size={14} />
                        </span>

                        {/* Label */}
                        <span style={{
                          fontSize: 13, flex: 1,
                          fontWeight: isActive ? 500 : 400,
                          color: isActive
                            ? (dark ? '#38bdf8' : '#0284c7')
                            : isHighlight && !isActive
                            ? (dark ? 'rgba(167,139,250,0.85)' : 'rgba(79,70,229,0.85)')
                            : (dark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.62)'),
                          transition: 'color 0.13s',
                        }}>
                          {item.label}
                        </span>

                        {/* Notification badge */}
                        {badge && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: '#fff',
                            background: '#f43f5e', borderRadius: 20,
                            padding: '1px 5px', lineHeight: 1.6, flexShrink: 0,
                          }}>{badge}</span>
                        )}

                        {/* Highlight dot */}
                        {isHighlight && !isActive && !badge && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#6366f1', flexShrink: 0,
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* ── Admin group ── */}
            {isAdmin && (
              <div>
                <div style={{
                  height: 1, margin: '6px 8px 10px',
                  background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                }} />
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                  textTransform: 'uppercase', margin: '0 0 3px', padding: '0 8px',
                  color: dark ? 'rgba(167,139,250,0.45)' : 'rgba(99,102,241,0.55)',
                }}>Admin</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {adminMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    const isHov = hoveredItem === `adm-${item.id}` && !isActive;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { onNavigate(item.id); onClose(); }}
                        onMouseEnter={() => setHoveredItem(`adm-${item.id}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          width: '100%', padding: '7px 8px', borderRadius: 9,
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          position: 'relative', transition: 'background 0.13s',
                          background: isActive
                            ? (dark ? 'rgba(139,92,246,0.15)' : 'rgba(99,102,241,0.09)')
                            : isHov
                            ? (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                            : 'transparent',
                        }}
                      >
                        {isActive && (
                          <span style={{
                            position: 'absolute', left: 0, top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3, height: 16, borderRadius: '0 3px 3px 0',
                            background: 'linear-gradient(180deg, #a78bfa, #6366f1)',
                          }} />
                        )}
                        <span style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isActive
                            ? (dark ? 'rgba(139,92,246,0.22)' : 'rgba(99,102,241,0.12)')
                            : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                          color: isActive ? '#a78bfa' : (dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)'),
                        }}>
                          <Icon size={14} />
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: isActive ? 500 : 400,
                          color: isActive
                            ? (dark ? '#c4b5fd' : '#7c3aed')
                            : (dark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.62)'),
                        }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* ── AI footer card ── */}
          <div style={{ padding: '0 10px 12px' }}>
            <div style={{
              borderRadius: 14, padding: '12px 14px',
              position: 'relative', overflow: 'hidden',
              background: dark ? 'rgba(99,102,241,0.11)' : 'rgba(99,102,241,0.06)',
              border: dark ? '1px solid rgba(99,102,241,0.22)' : '1px solid rgba(99,102,241,0.16)',
            }}>
              {/* Decorative circle bg */}
              <div style={{
                position: 'absolute', top: -18, right: -18, width: 72, height: 72,
                borderRadius: '50%', pointerEvents: 'none',
                background: dark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(99,102,241,0.4)',
                }}>
                  <Sparkles size={14} color="#fff" />
                </div>
                <div>
                  <p style={{
                    fontSize: 12.5, fontWeight: 500, margin: 0,
                    color: dark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.78)',
                  }}>AI Powered</p>
                  <p style={{
                    fontSize: 11, margin: '1px 0 0', lineHeight: 1.4,
                    color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)',
                  }}>Smart insights & recommendations</p>
                </div>
              </div>

              <div style={{
                marginTop: 10, height: 1,
                background: dark
                  ? 'linear-gradient(90deg, rgba(99,102,241,0.45), rgba(14,165,233,0.2), transparent)'
                  : 'linear-gradient(90deg, rgba(99,102,241,0.3), rgba(14,165,233,0.12), transparent)',
              }} />
            </div>
          </div>

        </div>
      </aside>

      <style>{`aside nav::-webkit-scrollbar{display:none}`}</style>
    </>
  );
}