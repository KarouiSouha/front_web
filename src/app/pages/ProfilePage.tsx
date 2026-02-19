import { useState } from 'react';
import { useAuth, AVAILABLE_PERMISSIONS } from '../contexts/AuthContext';
import { User, Mail, Calendar, Shield, Key, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export function ProfilePage() {
  const { user } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // In a real app, this would be an API call
    toast.success('Password changed successfully');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getUserPermissions = () => {
    if (!user) return [];
    if (user.permissions.includes('all')) {
      return AVAILABLE_PERMISSIONS;
    }
    return AVAILABLE_PERMISSIONS.filter(p => user.permissions.includes(p.id));
  };

  const userPermissions = getUserPermissions();

  const groupedPermissions = userPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  const categoryLabels: Record<string, string> = {
    data: 'Data Management',
    analytics: 'Analytics & Reports',
    sales: 'Sales & Inventory',
    system: 'System Access',
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your account information
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 mb-4">
                <User className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              <span className={`mt-3 px-3 py-1 rounded-full text-sm font-medium capitalize ${
                user.role === 'admin'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : user.role === 'manager'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}>
                {user.role}
              </span>
            </div>

            <div className="space-y-3 pt-6 border-t">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium flex-1 truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined:</span>
                <span className="font-medium">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
            </div>

            <Button 
              className="w-full"
              variant="outline"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Change Password Form */}
          {showPasswordForm && (
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Update Password</Button>
                  <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Permissions */}
          <div className="border rounded-lg p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-lg">My Permissions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {user.role === 'admin' 
                  ? 'You have full administrative access to all system features'
                  : `You have ${userPermissions.length} permissions in the system`
                }
              </p>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([category, permissions]) => (
                <div key={category}>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-600"></div>
                    {categoryLabels[category]}
                  </h4>
                  <div className="grid gap-2">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{permission.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {permission.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
