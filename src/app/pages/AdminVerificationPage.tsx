import { useState, useEffect, useCallback } from 'react';
import {
  Check, X, Mail, Calendar, Building2,
  Loader2, RefreshCw, Ban, UserCheck, Filter,
  Globe, MapPin, Server, Briefcase, Shield, ChevronRight,
  Users, Clock, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManagerUser {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: string;
  status: string;
  company: string | null;
  company_name: string | null;
  company_industry?: string | null;
  company_country?: string | null;
  company_city?: string | null;
  company_current_erp?: string | null;
  created_at: string;
  permissions_list: string[];
}

// ---------------------------------------------------------------------------
// RejectModal
// ---------------------------------------------------------------------------

function RejectModal({ manager, onConfirm, onCancel, isLoading }: {
  manager: ManagerUser;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px rgba(239,68,68,0.15), 0 0 0 1px rgba(239,68,68,0.05)',
      }} className="w-full max-w-md p-7 space-y-5">
        <div className="flex items-center gap-4">
          <div style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            borderRadius: '14px',
            padding: '10px',
            boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
          }}>
            <X className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.1rem' }}>Reject Request</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{manager.full_name}</p>
          </div>
        </div>
        <div className="space-y-2">
          <label style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.7 }}>
            Reason for rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            style={{
              width: '100%', minHeight: '100px', borderRadius: '12px',
              border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)',
              padding: '12px', fontSize: '0.875rem', resize: 'none', outline: 'none',
              fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.2s',
              color: 'var(--foreground)',
            }}
            placeholder="Explain why this request is being rejected..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading || !reason.trim()}
            style={{
              flex: 1, background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px',
              fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.875rem',
              cursor: isLoading || !reason.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !reason.trim() ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
            }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Confirm Rejection
          </button>
          <button onClick={onCancel} disabled={isLoading} style={{
            padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)',
            background: 'transparent', cursor: 'pointer', fontFamily: "'Sora', sans-serif",
            fontWeight: 600, fontSize: '0.875rem', color: 'var(--foreground)',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuspendModal
// ---------------------------------------------------------------------------

function SuspendModal({ user, onConfirm, onCancel, isLoading }: {
  user: ManagerUser;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px rgba(249,115,22,0.15)',
      }} className="w-full max-w-md p-7 space-y-5">
        <div className="flex items-center gap-4">
          <div style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            borderRadius: '14px', padding: '10px',
            boxShadow: '0 4px 15px rgba(249,115,22,0.4)',
          }}>
            <Ban className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.1rem' }}>Suspend Account</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{user.full_name}</p>
          </div>
        </div>
        <div className="space-y-2">
          <label style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.7 }}>
            Reason <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          <textarea
            style={{
              width: '100%', minHeight: '90px', borderRadius: '12px',
              border: '1px solid rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.03)',
              padding: '12px', fontSize: '0.875rem', resize: 'none', outline: 'none',
              fontFamily: "'DM Sans', sans-serif", color: 'var(--foreground)',
            }}
            placeholder="Reason for suspension..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading}
            style={{
              flex: 1, background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px',
              fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.875rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 15px rgba(249,115,22,0.3)',
            }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Suspend Account
          </button>
          <button onClick={onCancel} disabled={isLoading} style={{
            padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)',
            background: 'transparent', cursor: 'pointer', fontFamily: "'Sora', sans-serif",
            fontWeight: 600, fontSize: '0.875rem', color: 'var(--foreground)',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Pending',   color: '#d97706', bg: 'rgba(217,119,6,0.1)',   dot: '#f59e0b' },
  active:    { label: 'Active',    color: '#059669', bg: 'rgba(5,150,105,0.1)',   dot: '#10b981' },
  approved:  { label: 'Approved',  color: '#059669', bg: 'rgba(5,150,105,0.1)',   dot: '#10b981' },
  suspended: { label: 'Suspended', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   dot: '#ef4444' },
  rejected:  { label: 'Rejected',  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#9ca3af' },
};

const roleConfig: Record<string, { color: string; bg: string }> = {
  manager: { color: '#4f46e5', bg: 'rgba(79,70,229,0.1)' },
  agent:   { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  admin:   { color: '#0369a1', bg: 'rgba(3,105,161,0.1)' },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// ---------------------------------------------------------------------------
// Tabs config
// ---------------------------------------------------------------------------

type TabId = 'pending' | 'managers' | 'agents' | 'suspended' | 'all';

const TABS: { id: TabId; label: string; url: string; icon: React.ReactNode }[] = [
  { id: 'all',       label: 'All Users', url: '/users/users/',                  icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: 'pending',   label: 'Pending',   url: '/users/users/?status=pending',   icon: <Clock className="h-3.5 w-3.5" /> },
  { id: 'managers',  label: 'Managers',  url: '/users/users/?role=manager',     icon: <Shield className="h-3.5 w-3.5" /> },
  { id: 'agents',    label: 'Agents',    url: '/users/users/?role=agent',       icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'suspended', label: 'Suspended', url: '/users/users/?status=suspended', icon: <Ban className="h-3.5 w-3.5" /> },
];

// ---------------------------------------------------------------------------
// CompanyInfo
// ---------------------------------------------------------------------------

function CompanyInfo({ user }: { user: ManagerUser }) {
  const items = [
    user.company_name     && { icon: <Building2 className="h-3 w-3" />, label: user.company_name },
    user.company_industry && { icon: <Briefcase  className="h-3 w-3" />, label: user.company_industry },
    user.company_country && user.company_city
      ? { icon: <MapPin className="h-3 w-3" />, label: `${user.company_city}, ${user.company_country}` }
      : user.company_country
        ? { icon: <Globe className="h-3 w-3" />, label: user.company_country }
        : null,
    user.company_current_erp && { icon: <Server className="h-3 w-3" />, label: `ERP: ${user.company_current_erp}` },
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[];

  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '0.72rem', padding: '3px 10px', borderRadius: '100px',
          background: 'rgba(14,165,233,0.08)', color: '#0ea5e9',
          border: '1px solid rgba(14,165,233,0.15)',
          fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
        }}>
          {item.icon}{item.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UserCard
// ---------------------------------------------------------------------------

function UserCard({ user, onApprove, onReject, onSuspend, onReactivate, isActing }: {
  user: ManagerUser;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  isActing: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isPending   = user.status === 'pending';
  const isSuspended = user.status === 'suspended';
  const canSuspend  = user.role === 'manager' && (user.status === 'active' || user.status === 'approved');
  const sConf = statusConfig[user.status] ?? statusConfig.rejected;
  const rConf = roleConfig[user.role]     ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--card)' : 'var(--card)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.25)' : 'rgba(0,0,0,0.07)'}`,
        borderRadius: '16px',
        padding: '20px',
        transition: 'all 0.25s ease',
        boxShadow: hovered
          ? '0 8px 30px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.04)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent line on hover */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.25s ease',
      }} />

      <div className="flex items-start justify-between gap-4">
        {/* Avatar + Info */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Avatar */}
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
            background: `linear-gradient(135deg, ${rConf.color}22, ${rConf.color}44)`,
            border: `1.5px solid ${rConf.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1rem',
              color: rConf.color,
            }}>
              {user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {/* Name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '0.95rem' }}>
                {user.full_name}
              </span>
              <span style={{
                fontSize: '0.7rem', padding: '2px 10px', borderRadius: '100px',
                background: rConf.bg, color: rConf.color,
                fontFamily: "'Sora', sans-serif", fontWeight: 600,
                textTransform: 'capitalize', letterSpacing: '0.03em',
                border: `1px solid ${rConf.color}20`,
              }}>
                {user.role}
              </span>
              <span style={{
                fontSize: '0.7rem', padding: '2px 10px', borderRadius: '100px',
                background: sConf.bg, color: sConf.color,
                fontFamily: "'Sora', sans-serif", fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                border: `1px solid ${sConf.color}20`,
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sConf.dot, display: 'inline-block' }} />
                {sConf.label}
              </span>
            </div>

            {/* Contact */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--muted-foreground)', fontFamily: "'DM Sans', sans-serif" }}>
                <Mail className="h-3 w-3" />{user.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--muted-foreground)', fontFamily: "'DM Sans', sans-serif" }}>
                <Calendar className="h-3 w-3" />{formatDate(user.created_at)}
              </span>
            </div>

            {user.role === 'manager' && <CompanyInfo user={user} />}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isPending && (
            <>
              <button
                onClick={onApprove}
                disabled={isActing}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white', border: 'none', borderRadius: '10px',
                  padding: '8px 16px', fontSize: '0.8rem',
                  fontFamily: "'Sora', sans-serif", fontWeight: 600,
                  cursor: isActing ? 'not-allowed' : 'pointer',
                  opacity: isActing ? 0.6 : 1,
                  boxShadow: '0 3px 12px rgba(16,185,129,0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </button>
              <button
                onClick={onReject}
                disabled={isActing}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
                  padding: '8px 16px', fontSize: '0.8rem',
                  fontFamily: "'Sora', sans-serif", fontWeight: 600,
                  cursor: isActing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <X className="h-3.5 w-3.5" />Reject
              </button>
            </>
          )}
          {canSuspend && (
            <button
              onClick={onSuspend}
              disabled={isActing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(249,115,22,0.08)', color: '#f97316',
                border: '1px solid rgba(249,115,22,0.2)', borderRadius: '10px',
                padding: '8px 16px', fontSize: '0.8rem',
                fontFamily: "'Sora', sans-serif", fontWeight: 600,
                cursor: isActing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Suspend
            </button>
          )}
          {isSuspended && (
            <button
              onClick={onReactivate}
              disabled={isActing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white', border: 'none', borderRadius: '10px',
                padding: '8px 16px', fontSize: '0.8rem',
                fontFamily: "'Sora', sans-serif", fontWeight: 600,
                cursor: isActing ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 12px rgba(16,185,129,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
              Reactivate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function AdminVerificationPage() {
  const [activeTab, setActiveTab]         = useState<TabId>('all');
  const [users, setUsers]                 = useState<ManagerUser[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget]   = useState<ManagerUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ManagerUser | null>(null);

  const fetchUsers = useCallback(async (tab: TabId) => {
    setIsLoading(true);
    try {
      const url = TABS.find(t => t.id === tab)?.url ?? '/users/users/';
      const res = await api.get(url) as any;
      let list: ManagerUser[] = Array.isArray(res)
        ? res
        : res?.users ?? res?.pending_managers ?? res?.data ?? [];
      if (tab === 'all')      list = list.filter(u => u.status !== 'rejected');
      if (tab === 'managers') list = list.filter(u => u.status === 'approved' || u.status === 'active');
      setUsers(list);
    } catch (err: any) {
      toast.error(err?.userMessage ?? 'Error loading users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(activeTab); }, [activeTab, fetchUsers]);

  const handleTabChange = (tab: TabId) => { setActiveTab(tab); setUsers([]); };

  const handleApprove = async (user: ManagerUser) => {
    setActionLoading(user.id);
    try {
      await api.post(`/users/signup/review/${user.id}/`, { action: 'approve' });
      toast.success(`✓ ${user.full_name} approved.`);
      fetchUsers(activeTab);
    } catch (err: any) {
      toast.error(err?.data?.error ?? 'Error during approval');
    } finally { setActionLoading(null); }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await api.post(`/users/signup/review/${rejectTarget.id}/`, { action: 'reject', reason });
      toast.info(`Request from ${rejectTarget.full_name} rejected.`);
      setRejectTarget(null);
      fetchUsers(activeTab);
    } catch (err: any) {
      toast.error(err?.data?.error ?? 'Error during rejection');
    } finally { setActionLoading(null); }
  };

  const handleSuspendConfirm = async (reason: string) => {
    if (!suspendTarget) return;
    setActionLoading(suspendTarget.id);
    try {
      await api.patch(`/users/users/${suspendTarget.id}/status/`, { status: 'suspended', ...(reason ? { reason } : {}) });
      toast.info(`${suspendTarget.full_name} suspended.`);
      setSuspendTarget(null);
      fetchUsers(activeTab);
    } catch (err: any) {
      toast.error(err?.data?.error ?? 'Error during suspension');
    } finally { setActionLoading(null); }
  };

  const handleReactivate = async (user: ManagerUser) => {
    setActionLoading(user.id);
    try {
      await api.patch(`/users/users/${user.id}/status/`, { status: 'active' });
      toast.success(`${user.full_name} reactivated.`);
      fetchUsers(activeTab);
    } catch (err: any) {
      toast.error(err?.data?.error ?? 'Error during reactivation');
    } finally { setActionLoading(null); }
  };

  const pendingCount = activeTab === 'pending' ? users.length : 0;

  return (
    <>
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      {rejectTarget && (
        <RejectModal manager={rejectTarget} onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)} isLoading={actionLoading === rejectTarget.id} />
      )}
      {suspendTarget && (
        <SuspendModal user={suspendTarget} onConfirm={handleSuspendConfirm}
          onCancel={() => setSuspendTarget(null)} isLoading={actionLoading === suspendTarget.id} />
      )}

      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', opacity: 0.5, fontSize: '0.78rem', fontFamily: "'Sora', sans-serif" }}>
                <Shield className="h-3.5 w-3.5" />
                <span>Admin</span>
                <ChevronRight className="h-3 w-3" />
                <span>User Management</span>
              </div>
              <h1 style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.85rem',
                letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '6px',
                background: 'linear-gradient(135deg, var(--foreground) 40%, #6366f1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                User Management
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>
                Validate access requests and manage account statuses
              </p>
            </div>

            <button
              onClick={() => fetchUsers(activeTab)}
              disabled={isLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'var(--card)', border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '12px', padding: '9px 18px', cursor: 'pointer',
                fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.82rem',
                transition: 'all 0.2s ease', color: 'var(--foreground)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#6366f1' }} />
                : <RefreshCw className="h-4 w-4" style={{ color: '#6366f1' }} />
              }
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '24px',
          background: 'var(--card)', padding: '5px', borderRadius: '14px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflowX: 'auto',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '10px', border: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                  fontFamily: "'Sora', sans-serif", fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: isActive ? 'white' : 'var(--muted-foreground)',
                  boxShadow: isActive ? '0 3px 12px rgba(99,102,241,0.35)' : 'none',
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'pending' && pendingCount > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#f59e0b',
                    color: isActive ? 'white' : 'white',
                    fontSize: '0.68rem', fontWeight: 700, borderRadius: '100px',
                    padding: '1px 7px', minWidth: '20px', textAlign: 'center',
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{
            border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px',
            padding: '80px 20px', textAlign: 'center', background: 'var(--card)',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#6366f1' }} />
            </div>
            <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Loading users...</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Fetching the latest data</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{
            border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px',
            padding: '80px 20px', textAlign: 'center', background: 'var(--card)',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: 'rgba(99,102,241,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Filter className="h-6 w-6" style={{ color: '#6366f1' }} />
            </div>
            <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>No users found</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
              {activeTab === 'pending' ? 'No pending requests at the moment.' : 'No users match this filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Count bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))',
              border: '1px solid rgba(99,102,241,0.1)',
              marginBottom: '4px',
            }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.8rem', color: '#6366f1' }}>
                {users.length} user{users.length !== 1 ? 's' : ''} found
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                {TABS.find(t => t.id === activeTab)?.label} · Last updated just now
              </span>
            </div>

            {users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onApprove={() => handleApprove(user)}
                onReject={() => setRejectTarget(user)}
                onSuspend={() => setSuspendTarget(user)}
                onReactivate={() => handleReactivate(user)}
                isActing={actionLoading === user.id}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}