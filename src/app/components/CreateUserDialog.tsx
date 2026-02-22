import { useState } from 'react';
import { Check, Building } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { AVAILABLE_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS, useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface UserAccount {
  name: string;
  email: string;
  role: string;
  permissions: string[];
  branchId?: string;
  tempPassword?: string;
}

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateUser: (userData: UserAccount) => Promise<void>; // ← now async
}

export function CreateUserDialog({ open, onClose, onCreateUser }: CreateUserDialogProps) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tempPassword: '',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(DEFAULT_AGENT_PERMISSIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateUser({
        name: formData.name,
        email: formData.email,
        role: 'agent',
        permissions: selectedPermissions,
        tempPassword: formData.tempPassword || undefined,
      });
      // Only reset + close on success
      setFormData({ name: '', email: '', tempPassword: '' });
      setSelectedPermissions(DEFAULT_AGENT_PERMISSIONS);
      onClose();
    } catch (err: any) {
      const data = err?.data ?? {};
      if (data.email) {
        toast.error(`Email: ${Array.isArray(data.email) ? data.email[0] : data.email}`);
      } else if (data.non_field_errors) {
        toast.error(Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors);
      } else {
        toast.error(err?.userMessage ?? 'Error creating account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId) ? prev.filter(p => p !== permissionId) : [...prev, permissionId]
    );
  };

  const selectAllInCategory = (category: string) => {
    const ids = AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const allSelected = ids.every(p => selectedPermissions.includes(p));
    setSelectedPermissions(prev =>
      allSelected ? prev.filter(p => !ids.includes(p)) : [...new Set([...prev, ...ids])]
    );
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  const categoryLabels: Record<string, string> = {
    data: 'Data Management',
    analytics: 'Analytics & Reports',
    sales: 'Sales & Inventory',
    system: 'System Access',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Agent Account</DialogTitle>
          <DialogDescription>
            Create an agent account for your company. The agent will be automatically linked to your company.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 overflow-hidden">
          {/* Company info — read only */}
          {user?.companyName && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <Building className="h-4 w-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{user.companyName}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground italic">
                Automatically inherited
              </span>
            </div>
          )}

          {/* Basic information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                placeholder="Agent name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Temporary password */}
          <div className="space-y-2">
            <Label htmlFor="tempPassword">Temporary password</Label>
            <Input
              id="tempPassword"
              type="text"
              placeholder="Leave blank for default password"
              value={formData.tempPassword}
              onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Default: Agent@123456</p>
          </div>

          {/* Quick permission selection */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Quick selection:</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedPermissions(DEFAULT_AGENT_PERMISSIONS)}>
                Default agent
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id))}>
                Select all
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedPermissions([])}>
                Clear all
              </Button>
            </div>
          </div>

          {/* Permissions */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Permissions ({selectedPermissions.length} selected)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the permissions granted to this agent in the system
              </p>
            </div>

            {Object.entries(groupedPermissions).map(([category, permissions]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{categoryLabels[category]}</h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => selectAllInCategory(category)}
                    className="h-auto py-1 text-xs"
                  >
                    {permissions.every(p => selectedPermissions.includes(p.id)) ? 'Deselect all' : 'Select all'}
                  </Button>
                </div>
                <div className="grid gap-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{permission.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{permission.description}</div>
                      </div>
                      {selectedPermissions.includes(permission.id) && (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create agent account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}