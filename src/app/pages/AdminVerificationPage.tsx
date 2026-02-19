import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Check, X, Mail, Calendar, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export function AdminVerificationPage() {
  const { users, verifyManager, rejectManager } = useAuth();

  const pendingManagers = users.filter(u => u.role === 'manager' && !u.isVerified);
  const verifiedManagers = users.filter(u => u.role === 'manager' && u.isVerified);
  const agents = users.filter(u => u.role === 'agent');

  const handleVerify = (userId: string, userName: string) => {
    verifyManager(userId);
    toast.success(`${userName}'s account has been verified`);
  };

  const handleReject = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to reject ${userName}'s application?`)) {
      rejectManager(userId);
      toast.info(`${userName}'s application has been rejected`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Verification</h1>
        <p className="text-muted-foreground mt-2">
          Review and verify manager account applications
        </p>
      </div>

      {/* Pending Managers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pending Manager Applications</h2>
          {pendingManagers.length > 0 && (
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-sm font-medium">
              {pendingManagers.length} Pending
            </span>
          )}
        </div>

        {pendingManagers.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
              <Check className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No pending applications</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingManagers.map((manager) => (
              <div key={manager.id} className="border rounded-lg p-6 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                        <UserIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{manager.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Mail className="h-4 w-4" />
                          <span>{manager.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>Applied {formatDate(manager.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-background border rounded-md p-3">
                      <p className="text-sm font-medium mb-1">Role: Manager</p>
                      <p className="text-xs text-muted-foreground">
                        Will be able to create agent accounts, manage permissions, and access all system features
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleVerify(manager.id, manager.name)}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                      Verify
                    </Button>
                    <Button
                      onClick={() => handleReject(manager.id, manager.name)}
                      variant="outline"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verified Managers */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Verified Managers</h2>
        {verifiedManagers.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">No verified managers</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {verifiedManagers.map((manager) => (
              <div key={manager.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">{manager.name}</p>
                    <p className="text-sm text-muted-foreground">{manager.email}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Verified {formatDate(manager.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Agents */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Agent Accounts</h2>
        {agents.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">No agent accounts created</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {agents.map((agent) => (
              <div key={agent.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {agent.permissions.length} permissions
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
