import { useState } from 'react';
import { X, Check } from 'lucide-react';
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
import { AVAILABLE_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface UserAccount {
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateUser: (userData: UserAccount) => void;
}

export function CreateUserDialog({ open, onClose, onCreateUser }: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(DEFAULT_AGENT_PERMISSIONS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    onCreateUser({
      ...formData,
      role: 'agent',
      permissions: selectedPermissions,
    });

    toast.success(`Agent account created for ${formData.name}`, {
      description: 'Default password: agent123',
    });

    // Reset form
    setFormData({ name: '', email: '' });
    setSelectedPermissions(DEFAULT_AGENT_PERMISSIONS);
    onClose();
  };

  const togglePermission = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionId));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    }
  };

  const selectAllInCategory = (category: string) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p));
    
    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter(p => !categoryPermissions.includes(p)));
    } else {
      const newPermissions = [...new Set([...selectedPermissions, ...categoryPermissions])];
      setSelectedPermissions(newPermissions);
    }
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Agent Account</DialogTitle>
          <DialogDescription>
            Create a new agent account with specific permissions. Default password will be 'agent123'.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 overflow-hidden">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Agent name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
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

          {/* Quick Selection */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Quick Select:</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedPermissions(DEFAULT_AGENT_PERMISSIONS)}
              >
                Default Agent
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id))}
              >
                All Permissions
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedPermissions([])}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Permissions */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Permissions ({selectedPermissions.length} selected)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the permissions this agent will have in the system
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
                    {permissions.every(p => selectedPermissions.includes(p.id)) ? 'Deselect All' : 'Select All'}
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
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {permission.description}
                        </div>
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Agent Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
