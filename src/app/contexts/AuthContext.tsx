import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'admin' | 'manager' | 'agent';

export interface Permission {
  id: string;
  label: string;
  description: string;
  category: 'data' | 'analytics' | 'sales' | 'system';
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
  // Data Management
  { id: 'import-data', label: 'Import Data', description: 'Import Excel files into the database', category: 'data' },
  { id: 'export-data', label: 'Export Data', description: 'Export data to Excel/CSV files', category: 'data' },
  
  // Analytics & Reports
  { id: 'view-dashboard', label: 'View Dashboard', description: 'Access main dashboard with KPIs', category: 'analytics' },
  { id: 'view-reports', label: 'View Reports', description: 'Access and view all reports', category: 'analytics' },
  { id: 'generate-reports', label: 'Generate Reports', description: 'Create and generate custom reports', category: 'analytics' },
  { id: 'view-kpi', label: 'View KPIs', description: 'Access KPI Engine and metrics', category: 'analytics' },
  { id: 'filter-dashboard', label: 'Filter Dashboard', description: 'Apply filters to dashboard data', category: 'analytics' },
  
  // Sales & Inventory
  { id: 'view-sales', label: 'View Sales', description: 'Access sales and purchases data', category: 'sales' },
  { id: 'view-inventory', label: 'View Inventory', description: 'Check product availability and stock levels', category: 'sales' },
  { id: 'view-customer-payments', label: 'View Customer Payments', description: 'Access customer payment history', category: 'sales' },
  { id: 'view-aging', label: 'View Aging Receivables', description: 'Track overdue payments and receivables', category: 'sales' },
  
  // System & Alerts
  { id: 'receive-notifications', label: 'Receive Notifications', description: 'Get notified about important events', category: 'system' },
  { id: 'manage-alerts', label: 'Manage Alerts', description: 'Mark alerts as resolved', category: 'system' },
  { id: 'view-profile', label: 'View Profile', description: 'Access personal profile', category: 'system' },
  { id: 'change-password', label: 'Change Password', description: 'Update account password', category: 'system' },
  { id: 'ai-insights', label: 'AI Insights', description: 'Access AI-powered insights and chat', category: 'analytics' },
];

// Default permissions for each role
export const DEFAULT_AGENT_PERMISSIONS = [
  'import-data',
  'view-dashboard',
  'view-reports',
  'generate-reports',
  'view-kpi',
  'filter-dashboard',
  'view-sales',
  'view-inventory',
  'view-customer-payments',
  'receive-notifications',
  'manage-alerts',
  'view-profile',
  'change-password',
];

export const DEFAULT_MANAGER_PERMISSIONS = [
  ...AVAILABLE_PERMISSIONS.map(p => p.id),
];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  isVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (userData: { name: string; email: string; password: string; role: UserRole }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  verifyManager: (userId: string) => void;
  rejectManager: (userId: string) => void;
  updateUserPermissions: (userId: string, permissions: string[]) => void;
  createAgent: (userData: { name: string; email: string; role: string; permissions: string[] }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock password storage (in production, use proper backend with hashed passwords)
const mockPasswords: Record<string, string> = {
  'admin@fasi.com': 'admin123',
  'john@company.com': 'manager123',
  'sarah@company.com': 'agent123',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize with default users
  const getInitialUsers = (): User[] => {
    const savedUsers = localStorage.getItem('fasi_users');
    if (savedUsers) {
      try {
        return JSON.parse(savedUsers);
      } catch (e) {
        console.error('Failed to parse saved users', e);
      }
    }
    // Return default users
    return [
      {
        id: '1',
        name: 'Admin FASI',
        email: 'admin@fasi.com',
        role: 'admin',
        permissions: ['all'],
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'John Manager',
        email: 'john@company.com',
        role: 'manager',
        permissions: DEFAULT_MANAGER_PERMISSIONS,
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Sarah Agent',
        email: 'sarah@company.com',
        role: 'agent',
        permissions: DEFAULT_AGENT_PERMISSIONS,
        isVerified: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  };

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('fasi_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    return null;
  });

  const [users, setUsers] = useState<User[]>(getInitialUsers);

  // Load passwords from localStorage on mount
  useEffect(() => {
    const savedPasswords = localStorage.getItem('fasi_passwords');
    if (savedPasswords) {
      try {
        Object.assign(mockPasswords, JSON.parse(savedPasswords));
      } catch (e) {
        console.error('Failed to parse saved passwords', e);
      }
    } else {
      // Initialize default passwords
      localStorage.setItem('fasi_passwords', JSON.stringify(mockPasswords));
    }
  }, []);

  // Save users to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fasi_users', JSON.stringify(users));
  }, [users]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const foundUser = users.find(u => u.email === email);

    if (!foundUser) {
      return { success: false, message: 'User not found' };
    }

    if (mockPasswords[email] !== password) {
      return { success: false, message: 'Invalid password' };
    }

    if (foundUser.role === 'manager' && !foundUser.isVerified) {
      return { success: false, message: 'Your account is pending admin verification' };
    }

    setUser(foundUser);
    localStorage.setItem('fasi_user', JSON.stringify(foundUser));
    return { success: true, message: 'Login successful' };
  };

  const signup = async (userData: { name: string; email: string; password: string; role: UserRole }): Promise<{ success: boolean; message: string }> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
      return { success: false, message: 'Email already registered' };
    }

    // Only allow manager signup (admin and agents are created by managers/admins)
    if (userData.role !== 'manager') {
      return { success: false, message: 'Invalid role for signup' };
    }

    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      permissions: [],
      isVerified: false, // Manager accounts need admin verification
      createdAt: new Date().toISOString(),
    };

    // Store password
    mockPasswords[userData.email] = userData.password;
    localStorage.setItem('fasi_passwords', JSON.stringify(mockPasswords));

    setUsers([...users, newUser]);
    return { success: true, message: 'Account created successfully! Please wait for admin verification.' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fasi_user');
  };

  const verifyManager = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { 
            ...u, 
            isVerified: true,
            permissions: ['dashboard', 'reports', 'kpi', 'sales', 'inventory', 'aging', 'ai-insights']
          } 
        : u
    ));
  };

  const rejectManager = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    // Remove password
    const rejectedUser = users.find(u => u.id === userId);
    if (rejectedUser) {
      delete mockPasswords[rejectedUser.email];
      localStorage.setItem('fasi_passwords', JSON.stringify(mockPasswords));
    }
  };

  const updateUserPermissions = (userId: string, permissions: string[]) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, permissions } : u
    ));
    
    // Update current user if they're the one being modified
    if (user?.id === userId) {
      const updatedUser = { ...user, permissions };
      setUser(updatedUser);
      localStorage.setItem('fasi_user', JSON.stringify(updatedUser));
    }
  };

  const createAgent = (userData: { name: string; email: string; role: string; permissions: string[] }) => {
    // Generate a default password for the agent
    const defaultPassword = 'agent123';
    
    const newAgent: User = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      role: 'agent',
      permissions: userData.permissions,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    mockPasswords[userData.email] = defaultPassword;
    localStorage.setItem('fasi_passwords', JSON.stringify(mockPasswords));

    setUsers([...users, newAgent]);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users, 
      login, 
      signup, 
      logout, 
      verifyManager, 
      rejectManager,
      updateUserPermissions,
      createAgent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}