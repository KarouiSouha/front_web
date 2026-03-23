import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, Trash2, Loader2,
  Mail, Building2, RefreshCw, AlertTriangle, Search,
} from 'lucide-react';
import { CreateUserDialog } from '../components/CreateUserDialog';
import { ManagePermissionsDialog } from '../components/ManagePermissionsDialog';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../lib/authApi';
import { toast } from 'sonner';

interface Agent {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  branch_name: string | null;
  company_name: string | null;
  created_at: string;
  permissions_list: string[];
}

// ── Design tokens ─────────────────────────────────────────────────────────

const C = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  cyan:    '#0ea5e9',
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
};

const css = {
  card:    'hsl(var(--card))',
  cardFg:  'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))',
  muted:   'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg:      'hsl(var(--background))',
  fg:      'hsl(var(--foreground))',
};

const cardStyle: React.CSSProperties = {
  background:   css.card,
  borderRadius: 16,
  padding:      24,
  boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
  border:       `1px solid ${css.border}`,
};

// ── Stat card (mini KPI) ──────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{
      ...cardStyle,
      position:    'relative',
      overflow:    'hidden',
      borderTop:   `3px solid ${accent}`,
      paddingTop:  20,
    }}>
      <div style={{
        position:     'absolute',
        bottom:       -20,
        right:        -20,
        width:         80,
        height:        80,
        borderRadius: '50%',
        background:    accent,
        opacity:       0.06,
        pointerEvents:'none',
      }} />
      <p style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color:          css.mutedFg,
        margin:         0,
      }}>
        {label}
      </p>
      <p style={{
        fontSize:      26,
        fontWeight:    800,
        color:          accent === C.rose || accent === C.amber ? accent : css.cardFg,
        margin:        '6px 0 0',
        letterSpacing: '-0.03em',
        lineHeight:     1,
      }}>
        {value}
      </p>
      {/* Mini bar */}
      <div style={{ height: 3, borderRadius: 999, background: css.muted, overflow: 'hidden', marginTop: 14 }}>
        <div style={{ height: '100%', borderRadius: 999, width: '60%', background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
      </div>
    </div>
  );
}

// ── Search box ────────────────────────────────────────────────────────────

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', maxWidth: 340 }}>
      <Search size={14} style={{
        position:  'absolute',
        left:       12,
        top:       '50%',
        transform: 'translateY(-50%)',
        color:      css.mutedFg,
        pointerEvents: 'none',
      }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by name or email…"
        style={{
          width:        '100%',
          height:        38,
          paddingLeft:   36,
          paddingRight:  12,
          borderRadius:  10,
          border:       `1px solid ${css.border}`,
          background:    css.card,
          color:         css.cardFg,
          fontSize:      13,
          outline:       'none',
          boxShadow:    '0 1px 3px rgba(0,0,0,0.05)',
        }}
      />
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const [color, label] =
    status === 'active'    ? [C.emerald, 'Active'    ] :
    status === 'suspended' ? [C.rose,    'Suspended' ] :
                             [C.amber,   'Pending'   ];
  return (
    <span style={{
      fontSize:      10,
      fontWeight:    700,
      padding:       '2px 9px',
      borderRadius:  20,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      background:    `${color}15`,
      color,
      border:        `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

// ── Permission badge ──────────────────────────────────────────────────────

function PermBadge({ count }: { count: number }) {
  return (
    <span style={{
      fontSize:   10,
      fontWeight: 600,
      padding:    '2px 8px',
      borderRadius: 20,
      background:   `${C.indigo}12`,
      color:         C.indigo,
      border:       `1px solid ${C.indigo}25`,
    }}>
      {count} perm{count !== 1 ? 's' : ''}
    </span>
  );
}

// ── Agent row card ────────────────────────────────────────────────────────

function AgentCard({ agent, onDelete }: { agent: Agent; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const initials = agent.full_name
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        padding:    '16px 20px',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow:   hovered
          ? '0 4px 24px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.08)'
          : cardStyle.boxShadow,
        transform:   hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {/* Avatar */}
          <div style={{
            width:          42,
            height:         42,
            borderRadius:   13,
            flexShrink:     0,
            background:     `${C.violet}18`,
            border:         `1px solid ${C.violet}30`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       14,
            fontWeight:     800,
            color:           C.violet,
            letterSpacing:  '-0.03em',
          }}>
            {initials || <Users size={16} style={{ color: C.violet }} />}
          </div>

          {/* Name + meta */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0 }}>
                {agent.full_name}
              </p>
              <StatusBadge status={agent.status} />
              <PermBadge count={agent.permissions_list?.length ?? 0} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: css.mutedFg }}>
                <Mail size={11} />
                {agent.email}
              </span>
              {agent.company_name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: css.mutedFg }}>
                  <Building2 size={11} />
                  {agent.company_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:             5,
            height:          34,
            padding:        '0 14px',
            borderRadius:    10,
            border:         `1px solid ${C.rose}30`,
            background:      hovered ? `${C.rose}08` : 'transparent',
            color:            C.rose,
            fontSize:         12,
            fontWeight:       600,
            cursor:          'pointer',
            transition:      'background 0.15s',
            flexShrink:       0,
          }}
        >
          <Trash2 size={13} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────

function DeleteConfirmModal({
  agent, onConfirm, onCancel, isLoading,
}: {
  agent: Agent; onConfirm: () => void; onCancel: () => void; isLoading: boolean;
}) {
  return (
    <div style={{
      position:       'fixed',
      inset:           0,
      zIndex:          50,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.5)',
      padding:         16,
    }}>
      <div style={{
        ...cardStyle,
        width:    '100%',
        maxWidth: 440,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width:          44,
            height:         44,
            borderRadius:   13,
            background:    `${C.rose}15`,
            border:        `1px solid ${C.rose}30`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}>
            <AlertTriangle size={18} style={{ color: C.rose }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: css.cardFg, margin: 0 }}>
              Delete agent account
            </h3>
            <p style={{ fontSize: 12, color: css.mutedFg, marginTop: 2 }}>{agent.full_name}</p>
          </div>
        </div>

        {/* Warning box */}
        <div style={{
          padding:      '12px 14px',
          borderRadius:  12,
          background:   `${C.rose}08`,
          border:       `1px solid ${C.rose}25`,
          marginBottom:  20,
        }}>
          <p style={{ fontSize: 13, color: C.rose, margin: 0, lineHeight: 1.5 }}>
            ⚠️ This action is <strong>irreversible</strong>. The account of{' '}
            <strong>{agent.full_name}</strong> ({agent.email}) will be permanently deleted.
            All sessions will also be revoked.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              flex:           1,
              height:          40,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:             6,
              borderRadius:    11,
              border:         'none',
              background:      isLoading ? `${C.rose}70` : C.rose,
              color:          '#fff',
              fontSize:        13,
              fontWeight:      700,
              cursor:           isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading
              ? <><Loader2 size={14} className="animate-spin" /> Deleting…</>
              : <><Trash2 size={14} /> Confirm deletion</>
            }
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              height:       40,
              padding:      '0 20px',
              borderRadius:  11,
              border:       `1px solid ${css.border}`,
              background:    css.card,
              color:         css.cardFg,
              fontSize:      13,
              fontWeight:    600,
              cursor:         isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TeamPage ──────────────────────────────────────────────────────────────

export function TeamPage() {
  const { user, createAgent, updateUserPermissions } = useAuth();

  const [agents,                setAgents]                = useState<Agent[]>([]);
  const [isLoading,             setIsLoading]             = useState(true);
  const [nameSearch,            setNameSearch]            = useState('');
  const [showCreateDialog,      setShowCreateDialog]      = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [deleteTarget,          setDeleteTarget]          = useState<Agent | null>(null);
  const [deleteLoading,         setDeleteLoading]         = useState(false);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authApi.getAgents();
      setAgents(res.agents as Agent[]);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error loading agents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleCreateAgent = async (userData: {
    name: string; email: string; role: string;
    permissions: string[]; branchId?: string; tempPassword?: string;
  }) => {
    await createAgent(userData);
    await fetchAgents();
    toast.success(`Agent account created for ${userData.name}`);
  };

  const handleUpdatePermissions = async (userId: string, permissions: string[]) => {
    await updateUserPermissions(userId, permissions);
    await fetchAgents();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await authApi.deleteAgent(deleteTarget.id);
      toast.success(`Account of ${deleteTarget.full_name} deleted.`);
      setDeleteTarget(null);
      await fetchAgents();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error during deletion');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAgents = agents.filter(a =>
    !nameSearch.trim() ||
    a.full_name.toLowerCase().includes(nameSearch.trim().toLowerCase()) ||
    a.email.toLowerCase().includes(nameSearch.trim().toLowerCase())
  );

  const agentsAsUsers = agents.map(a => ({
    id:          a.id,
    name:        a.full_name,
    email:       a.email,
    role:        a.role as any,
    permissions: a.permissions_list ?? [],
    isVerified:  true,
    createdAt:   a.created_at,
  }));

  const activeCount    = agents.filter(a => a.status === 'active').length;
  const suspendedCount = agents.filter(a => a.status === 'suspended').length;

  return (
    <>
      {deleteTarget && (
        <DeleteConfirmModal
          agent={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteLoading}
        />
      )}

      <CreateUserDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateUser={handleCreateAgent}
      />

      <ManagePermissionsDialog
        open={showPermissionsDialog}
        onClose={() => setShowPermissionsDialog(false)}
        users={agentsAsUsers}
        onUpdatePermissions={handleUpdatePermissions}
      />

      <div style={{ background: css.bg, minHeight: '100vh', padding: '32px 28px' }}>

        {/* ── Header ── */}
        <div style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          flexWrap:       'wrap',
          gap:             16,
          marginBottom:    28,
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: css.fg, letterSpacing: '-0.03em', margin: 0 }}>
              My Team
            </h1>
            <p style={{ fontSize: 13, color: css.mutedFg, marginTop: 4 }}>
              Manage agents of {user?.companyName ?? 'your company'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Refresh */}
            <button
              onClick={fetchAgents}
              disabled={isLoading}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:         6,
                height:      36,
                padding:    '0 16px',
                borderRadius: 10,
                border:     `1px solid ${css.border}`,
                background:  css.card,
                color:       css.mutedFg,
                fontSize:    13,
                cursor:       isLoading ? 'not-allowed' : 'pointer',
                opacity:      isLoading ? 0.6 : 1,
                boxShadow:  '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {isLoading
                ? <Loader2 size={13} className="animate-spin" />
                : <RefreshCw size={13} />}
              Refresh
            </button>

            {/* Manage Permissions */}
            <button
              onClick={() => setShowPermissionsDialog(true)}
              disabled={agents.length === 0}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:         6,
                height:      36,
                padding:    '0 16px',
                borderRadius: 10,
                border:     `1px solid ${css.border}`,
                background:  css.card,
                color:       css.cardFg,
                fontSize:    13,
                fontWeight:  600,
                cursor:       agents.length === 0 ? 'not-allowed' : 'pointer',
                opacity:      agents.length === 0 ? 0.5 : 1,
                boxShadow:  '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <Shield size={14} />
              Manage permissions
            </button>

            {/* Create agent */}
            <button
              onClick={() => setShowCreateDialog(true)}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:         6,
                height:      36,
                padding:    '0 18px',
                borderRadius: 10,
                border:     'none',
                background:  C.indigo,
                color:      '#fff',
                fontSize:    13,
                fontWeight:  700,
                cursor:     'pointer',
                boxShadow:  `0 2px 12px ${C.indigo}40`,
              }}
            >
              <UserPlus size={14} />
              Create agent
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                  16,
          marginBottom:         24,
        }}>
          <StatCard label="Total Agents"  value={agents.length}    accent={C.indigo}  />
          <StatCard label="Active"        value={activeCount}       accent={C.emerald} />
          <StatCard label="Suspended"     value={suspendedCount}    accent={C.rose}    />
        </div>

        {/* ── Search ── */}
        <div style={{ marginBottom: 20 }}>
          <SearchBox value={nameSearch} onChange={setNameSearch} />
        </div>

        {/* ── Agent list ── */}
        {isLoading ? (
          <div style={{
            ...cardStyle,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:         64,
            gap:             12,
          }}>
            <Loader2 size={28} className="animate-spin" style={{ color: C.indigo }} />
            <p style={{ fontSize: 13, color: css.mutedFg }}>Loading agents…</p>
          </div>

        ) : agents.length === 0 ? (
          <div style={{
            ...cardStyle,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:         64,
            gap:             12,
            textAlign:      'center',
          }}>
            <div style={{
              width:          64,
              height:         64,
              borderRadius:   20,
              background:    `${C.indigo}10`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}>
              <Users size={28} style={{ color: C.indigo, opacity: 0.6 }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: css.cardFg, margin: 0 }}>No agents yet</h3>
            <p style={{ fontSize: 13, color: css.mutedFg, margin: 0 }}>
              Create your first agent account to get started.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:         6,
                height:      38,
                padding:    '0 20px',
                borderRadius: 11,
                border:     'none',
                background:  C.indigo,
                color:      '#fff',
                fontSize:    13,
                fontWeight:  700,
                cursor:     'pointer',
                marginTop:   4,
              }}
            >
              <UserPlus size={14} /> Create agent
            </button>
          </div>

        ) : filteredAgents.length === 0 ? (
          <div style={{
            ...cardStyle,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:         64,
            gap:             10,
          }}>
            <Search size={32} style={{ color: css.mutedFg, opacity: 0.4 }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: css.cardFg, margin: 0 }}>No results</h3>
            <p style={{ fontSize: 13, color: css.mutedFg, margin: 0 }}>
              No agent matches "<strong>{nameSearch}</strong>".
            </p>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onDelete={() => setDeleteTarget(agent)}
              />
            ))}
          </div>
        )}

      </div>
    </>
  );
}