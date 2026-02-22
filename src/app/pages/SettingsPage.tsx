import { useState, useEffect } from 'react';
import { User, Building, Bell, Shield, Globe, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

export function SettingsPage() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // ── Profile form — loaded from API ──────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Load real profile data on mount
  useEffect(() => {
    api.get<{
      first_name: string;
      last_name: string;
      phone_number: string | null;
    }>('/users/profile/')
      .then(data => {
        setProfileForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
        });
      })
      .catch(() => {
        // Fallback to user context
        const nameParts = user?.name?.split(' ') ?? [];
        setProfileForm({
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          phone_number: '',
        });
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!profileForm.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!profileForm.last_name.trim()) {
      toast.error('Last name is required');
      return;
    }
    setSavingProfile(true);
    try {
      await api.patch('/users/profile/', profileForm);
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (err: any) {
      const data = err?.data ?? {};
      const msg = data.first_name?.[0] || data.last_name?.[0] || data.phone_number?.[0]
        || err?.userMessage || 'Error updating profile';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password form ─────────────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const handleChangePassword = async () => {
    setPasswordErrors({});

    if (!passwordForm.old_password) {
      setPasswordErrors(e => ({ ...e, old_password: 'Required field' }));
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordErrors(e => ({ ...e, new_password: 'Minimum 8 characters' }));
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      setPasswordErrors(e => ({ ...e, new_password_confirm: 'Passwords do not match' }));
      return;
    }
    if (passwordForm.old_password === passwordForm.new_password) {
      setPasswordErrors(e => ({ ...e, new_password: 'New password must be different' }));
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/users/change-password/', passwordForm);
      toast.success('Password changed. Signing you out in 2 seconds...');
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const data = err?.data ?? {};
      if (data.error) {
        setPasswordErrors({ old_password: data.error });
      } else if (data.old_password) {
        setPasswordErrors({ old_password: Array.isArray(data.old_password) ? data.old_password[0] : data.old_password });
      } else if (data.new_password) {
        setPasswordErrors({ new_password: Array.isArray(data.new_password) ? data.new_password[0] : data.new_password });
      } else if (data.new_password_confirm) {
        setPasswordErrors({ new_password_confirm: Array.isArray(data.new_password_confirm) ? data.new_password_confirm[0] : data.new_password_confirm });
      } else {
        toast.error(err?.userMessage ?? 'Error changing password');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* ── PROFILE ── */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5" />
                <div>
                  <CardTitle>Personal information</CardTitle>
                  <CardDescription>Update your profile information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingProfile ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name *</Label>
                      <Input
                        id="firstName"
                        value={profileForm.first_name}
                        onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))}
                        placeholder="Your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name *</Label>
                      <Input
                        id="lastName"
                        value={profileForm.last_name}
                        onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))}
                        placeholder="Your last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileForm.phone_number}
                      onChange={e => setProfileForm(f => ({ ...f, phone_number: e.target.value }))}
                      placeholder="+213 6XX XXX XXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={user?.role || ''}
                      disabled
                      className="opacity-60 capitalize cursor-not-allowed"
                    />
                  </div>

                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                      : 'Save'
                    }
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMPANY ── */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5" />
                <div>
                  <CardTitle>Company information</CardTitle>
                  <CardDescription>Details of your organization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input value={user?.companyName || 'Not assigned'} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input value={user?.branchName || 'Not assigned'} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <p className="text-xs text-muted-foreground">
                Company information is managed by the administrator.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NOTIFICATIONS ── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                <div>
                  <CardTitle>Notification preferences</CardTitle>
                  <CardDescription>Choose which notifications you receive</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { id: 'email-alerts', label: 'Email Alerts', desc: 'Email notifications for critical alerts', default: true },
                  { id: 'low-stock', label: 'Stock Alerts', desc: 'Notification when stock is low', default: true },
                  { id: 'overdue', label: 'Overdue Payments', desc: 'Alerts for overdue customer payments', default: true },
                  { id: 'ai-insights', label: 'AI Insights', desc: 'AI-powered recommendations', default: true },
                  { id: 'weekly-report', label: 'Weekly Report', desc: 'Weekly performance summary', default: false },
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={item.id}>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch id={item.id} defaultChecked={item.default} />
                  </div>
                ))}
              </div>
              <Button>Save preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECURITY — CONNECTED TO API ── */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                <div>
                  <CardTitle>Change password</CardTitle>
                  <CardDescription>
                    After changing, all your sessions will be closed and you will need to sign in again.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Old password */}
              <div className="space-y-2">
                <Label htmlFor="old-password">Current password *</Label>
                <div className="relative">
                  <Input
                    id="old-password"
                    type={showPasswords.old ? 'text' : 'password'}
                    value={passwordForm.old_password}
                    onChange={e => setPasswordForm(f => ({ ...f, old_password: e.target.value }))}
                    className={passwordErrors.old_password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPasswords(s => ({ ...s, old: !s.old }))}
                  >
                    {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.old_password && (
                  <p className="text-xs text-red-500">{passwordErrors.old_password}</p>
                )}
              </div>

              {/* New password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">New password *</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                    className={passwordErrors.new_password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <p className="text-xs text-red-500">{passwordErrors.new_password}</p>
                )}
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password *</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.new_password_confirm}
                    onChange={e => setPasswordForm(f => ({ ...f, new_password_confirm: e.target.value }))}
                    className={passwordErrors.new_password_confirm ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.new_password_confirm && (
                  <p className="text-xs text-red-500">{passwordErrors.new_password_confirm}</p>
                )}
              </div>

              <Button onClick={handleChangePassword} disabled={savingPassword}>
                {savingPassword
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</>
                  : 'Update password'
                }
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}