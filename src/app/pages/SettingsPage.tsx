import { useState, useEffect } from 'react';
import { User, Building, Bell, Shield, Loader2, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

// ─── Inject fonts + design tokens once ────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  /* All colors are pulled from the app-level CSS variables so dark mode works automatically */
  .settings-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--card-foreground);
    background: transparent;
    min-height: 100vh;
    padding: 2.5rem 2rem;
  }

  /* Header */
  .settings-header h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 2.4rem; font-weight: 400; letter-spacing: -.02em;
    color: var(--card-foreground); margin: 0 0 .25rem;
  }
  .settings-header p { color: var(--muted-foreground); font-size: .9rem; margin: 0; }

  /* Sidebar nav */
  .settings-layout { display: grid; grid-template-columns: 220px 1fr; gap: 2rem; margin-top: 2.5rem; }
  @media (max-width: 700px) { .settings-layout { grid-template-columns: 1fr; } }

  .settings-nav { display: flex; flex-direction: column; gap: .35rem; }
  .nav-item {
    display: flex; align-items: center; gap: .75rem;
    padding: .65rem 1rem; border-radius: 10px;
    font-size: .875rem; font-weight: 500; letter-spacing: .01em;
    color: var(--muted-foreground); cursor: pointer;
    border: 1px solid transparent;
    background: transparent; transition: all .2s ease;
  }
  .nav-item:hover { color: var(--card-foreground); background: var(--muted); }
  .nav-item.active {
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    border-color: color-mix(in srgb, var(--primary) 30%, transparent);
  }
  .nav-item .icon { flex-shrink: 0; }
  .nav-item .chevron { margin-left: auto; opacity: .4; }
  .nav-item.active .chevron { opacity: 1; color: var(--primary); }

  /* Cards */
  .s-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden; transition: border-color .25s;
  }
  .s-card:hover { border-color: color-mix(in srgb, var(--border) 200%, transparent); }

  .s-card-header {
    padding: 1.5rem 1.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: flex-start; gap: 1rem;
  }
  .s-card-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: var(--primary);
  }
  .s-card-header h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.15rem; font-weight: 400; margin: 0 0 .2rem; color: var(--card-foreground);
  }
  .s-card-header p { font-size: .8rem; color: var(--muted-foreground); margin: 0; line-height: 1.5; }
  .s-card-body { padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }

  /* Form */
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 560px) { .field-grid { grid-template-columns: 1fr; } }

  .field { display: flex; flex-direction: column; gap: .45rem; }
  .field label {
    font-size: .78rem; font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .field .hint { font-size: .75rem; color: var(--muted-foreground); margin: 0; }
  .field .err  { font-size: .75rem; color: var(--destructive); margin: 0; }

  .s-input {
    background: var(--input-background);
    border: 1px solid var(--border);
    border-radius: 10px; padding: .65rem .9rem;
    font-size: .875rem; color: var(--card-foreground);
    font-family: 'DM Sans', sans-serif;
    width: 100%; box-sizing: border-box;
    transition: border-color .2s, box-shadow .2s;
    outline: none;
  }
  .s-input::placeholder { color: var(--muted-foreground); }
  .s-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
  }
  .s-input:disabled { opacity: .45; cursor: not-allowed; }
  .s-input.error { border-color: var(--destructive); }

  .input-wrap { position: relative; }
  .input-wrap .s-input { padding-right: 2.5rem; }
  .eye-btn {
    position: absolute; right: .7rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--muted-foreground); display: flex; align-items: center;
    padding: 0; transition: color .15s;
  }
  .eye-btn:hover { color: var(--card-foreground); }

  /* Buttons */
  .s-btn {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .65rem 1.4rem; border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: .875rem; font-weight: 600; letter-spacing: .02em;
    border: none; cursor: pointer; transition: all .2s ease;
  }
  .s-btn-primary {
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .s-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 40%, transparent);
    background: color-mix(in srgb, var(--primary) 85%, black);
  }
  .s-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

  /* Notification rows */
  .notif-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: .85rem 0; border-bottom: 1px solid var(--border);
  }
  .notif-row:last-child { border-bottom: none; }
  .notif-row-left label {
    font-size: .875rem; font-weight: 500; color: var(--card-foreground);
    display: block; margin-bottom: .15rem; cursor: pointer;
  }
  .notif-row-left p { font-size: .8rem; color: var(--muted-foreground); margin: 0; }

  /* Company badge */
  .info-row { display: flex; flex-direction: column; gap: .4rem; }
  .info-row label {
    font-size: .78rem; font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .info-badge {
    background: var(--input-background); border: 1px solid var(--border);
    border-radius: 10px; padding: .65rem .9rem;
    font-size: .875rem; color: var(--muted-foreground);
  }

  /* Spinner */
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin .75s linear infinite; }

  /* Divider */
  .divider { height: 1px; background: var(--border); margin: .25rem 0; }
`;

function inject(css: string) {
  if (document.getElementById('settings-style')) return;
  const el = document.createElement('style');
  el.id = 'settings-style';
  el.textContent = css;
  document.head.appendChild(el);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SCard({ icon, title, desc, children }: {
  icon: React.ReactNode; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="s-card">
      <div className="s-card-header">
        <div className="s-card-icon">{icon}</div>
        <div><h2>{title}</h2><p>{desc}</p></div>
      </div>
      <div className="s-card-body">{children}</div>
    </div>
  );
}

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <p className="err">{error}</p>}
      {hint && !error && <p className="hint">{hint}</p>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Tab = 'profile' | 'company' | 'notifications' | 'security';

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',       icon: <User size={15} /> },
  { id: 'company',       label: 'Company',        icon: <Building size={15} /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={15} /> },
  { id: 'security',      label: 'Security',       icon: <Shield size={15} /> },
];

export function SettingsPage() {
  inject(STYLE);
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');

  // ── Profile ──────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone_number: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    api.get<{ first_name: string; last_name: string; phone_number: string | null }>('/users/profile/')
      .then(d => setProfileForm({ first_name: d.first_name || '', last_name: d.last_name || '', phone_number: d.phone_number || '' }))
      .catch(() => {
        const parts = user?.name?.split(' ') ?? [];
        setProfileForm({ first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '', phone_number: '' });
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!profileForm.first_name.trim()) return toast.error('First name is required');
    if (!profileForm.last_name.trim()) return toast.error('Last name is required');
    setSavingProfile(true);
    try {
      await api.patch('/users/profile/', profileForm);
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err: any) {
      const d = err?.data ?? {};
      toast.error(d.first_name?.[0] || d.last_name?.[0] || d.phone_number?.[0] || err?.userMessage || 'Error updating profile');
    } finally { setSavingProfile(false); }
  };

  // ── Password ─────────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const handleChangePassword = async () => {
    setPwErrors({});
    if (!pwForm.old_password) return setPwErrors(e => ({ ...e, old_password: 'Required' }));
    if (pwForm.new_password.length < 8) return setPwErrors(e => ({ ...e, new_password: 'Minimum 8 characters' }));
    if (pwForm.new_password !== pwForm.new_password_confirm) return setPwErrors(e => ({ ...e, new_password_confirm: 'Passwords do not match' }));
    if (pwForm.old_password === pwForm.new_password) return setPwErrors(e => ({ ...e, new_password: 'Must differ from current password' }));
    setSavingPw(true);
    try {
      await api.post('/users/change-password/', pwForm);
      toast.success('Password changed — signing you out…');
      setTimeout(async () => { await logout(); navigate('/login'); }, 2000);
    } catch (err: any) {
      const d = err?.data ?? {};
      if (d.error) setPwErrors({ old_password: d.error });
      else if (d.old_password) setPwErrors({ old_password: [d.old_password].flat()[0] });
      else if (d.new_password) setPwErrors({ new_password: [d.new_password].flat()[0] });
      else toast.error(err?.userMessage ?? 'Error changing password');
    } finally { setSavingPw(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="settings-root">
      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <nav className="settings-nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-item${tab === n.id ? ' active' : ''}`} onClick={() => setTab(n.id)}>
              <span className="icon">{n.icon}</span>
              {n.label}
              <ChevronRight size={14} className="chevron" />
            </button>
          ))}
        </nav>

        {/* Panels */}
        <div>

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <SCard icon={<User size={16} />} title="Personal information" desc="Update your name, email and phone">
              {loadingProfile ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Loader2 size={22} className="spin" style={{ color: 'var(--muted-foreground)' }} />
                </div>
              ) : (
                <>
                  <div className="field-grid">
                    <Field label="First name *">
                      <input className="s-input" value={profileForm.first_name} placeholder="First name"
                        onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))} />
                    </Field>
                    <Field label="Last name *">
                      <input className="s-input" value={profileForm.last_name} placeholder="Last name"
                        onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))} />
                    </Field>
                  </div>

                  <Field label="Email" hint="Email address cannot be changed">
                    <input className="s-input" type="email" value={user?.email || ''} disabled />
                  </Field>

                  <Field label="Phone number">
                    <input className="s-input" type="tel" value={profileForm.phone_number} placeholder="+213 6XX XXX XXX"
                      onChange={e => setProfileForm(f => ({ ...f, phone_number: e.target.value }))} />
                  </Field>

                  <Field label="Role">
                    <input className="s-input" value={user?.role || ''} disabled style={{ textTransform: 'capitalize' }} />
                  </Field>

                  <div>
                    <button className="s-btn s-btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile ? <><Loader2 size={14} className="spin" /> Saving…</> : <><Check size={14} /> Save changes</>}
                    </button>
                  </div>
                </>
              )}
            </SCard>
          )}

          {/* ── COMPANY ── */}
          {tab === 'company' && (
            <SCard icon={<Building size={16} />} title="Company information" desc="Details of your organization">
              <div className="info-row">
                <label>Company name</label>
                <div className="info-badge">{user?.companyName || 'Not assigned'}</div>
              </div>
              <div className="info-row">
                <label>Branch</label>
                <div className="info-badge">{user?.branchName || 'Not assigned'}</div>
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--muted-foreground)', margin: 0 }}>
                Company information is managed by your administrator.
              </p>
            </SCard>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 'notifications' && (
            <SCard icon={<Bell size={16} />} title="Notification preferences" desc="Choose which alerts you receive">
              <div>
                {[
                  { id: 'email-alerts', label: 'Email Alerts',      desc: 'Critical alerts via email',                  on: true },
                  { id: 'low-stock',    label: 'Stock Alerts',       desc: 'Notify when stock is low',                   on: true },
                  { id: 'overdue',      label: 'Overdue Payments',   desc: 'Alerts for overdue customer payments',       on: true },
                  { id: 'ai-insights',  label: 'AI Insights',        desc: 'AI-powered recommendations and suggestions', on: true },
                  { id: 'weekly',       label: 'Weekly Report',      desc: 'Weekly performance summary',                 on: false },
                ].map(item => (
                  <div key={item.id} className="notif-row">
                    <div className="notif-row-left">
                      <label htmlFor={item.id}>{item.label}</label>
                      <p>{item.desc}</p>
                    </div>
                    <Switch id={item.id} defaultChecked={item.on} />
                  </div>
                ))}
              </div>
              <div>
                <button className="s-btn s-btn-primary">
                  <Check size={14} /> Save preferences
                </button>
              </div>
            </SCard>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <SCard icon={<Shield size={16} />} title="Change password" desc="After updating, all sessions will be closed and you'll need to sign in again.">
              {/* Old */}
              <Field label="Current password *" error={pwErrors.old_password}>
                <div className="input-wrap">
                  <input className={`s-input${pwErrors.old_password ? ' error' : ''}`}
                    type={showPw.old ? 'text' : 'password'} value={pwForm.old_password}
                    onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))} />
                  <button className="eye-btn" type="button" onClick={() => setShowPw(s => ({ ...s, old: !s.old }))}>
                    {showPw.old ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              {/* New */}
              <Field label="New password *" hint="Minimum 8 characters" error={pwErrors.new_password}>
                <div className="input-wrap">
                  <input className={`s-input${pwErrors.new_password ? ' error' : ''}`}
                    type={showPw.new ? 'text' : 'password'} value={pwForm.new_password}
                    onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
                  <button className="eye-btn" type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}>
                    {showPw.new ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              {/* Confirm */}
              <Field label="Confirm new password *" error={pwErrors.new_password_confirm}>
                <div className="input-wrap">
                  <input className={`s-input${pwErrors.new_password_confirm ? ' error' : ''}`}
                    type={showPw.confirm ? 'text' : 'password'} value={pwForm.new_password_confirm}
                    onChange={e => setPwForm(f => ({ ...f, new_password_confirm: e.target.value }))} />
                  <button className="eye-btn" type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}>
                    {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              <div>
                <button className="s-btn s-btn-primary" onClick={handleChangePassword} disabled={savingPw}>
                  {savingPw ? <><Loader2 size={14} className="spin" /> Updating…</> : <><Shield size={14} /> Update password</>}
                </button>
              </div>
            </SCard>
          )}

        </div>
      </div>
    </div>
  );
}