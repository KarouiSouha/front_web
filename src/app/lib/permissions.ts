export interface Permission {
  id: string;
  label: string;
  description: string;
  category: 'data' | 'analytics' | 'sales' | 'system';
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: 'import-data',           label: 'Import Data',              description: 'Import Excel files into the database',       category: 'data' },
  { id: 'view-dashboard',        label: 'View Dashboard',           description: 'Access main dashboard with KPIs',            category: 'analytics' },
  { id: 'view-reports',          label: 'View Reports',             description: 'Access and view all reports',                category: 'analytics' },
  { id: 'view-kpi',              label: 'View KPIs',                description: 'Access KPI Engine and metrics',              category: 'analytics' },
  { id: 'view-sales',            label: 'View Sales',               description: 'Access sales and purchases data',            category: 'sales' },
  { id: 'view-inventory',        label: 'View Inventory',           description: 'Check product availability and stock levels', category: 'sales' },
  { id: 'view-aging',            label: 'View Aging Receivables',   description: 'Track overdue payments and receivables',     category: 'sales' },
  { id: 'receive-notifications', label: 'Receive Notifications',    description: 'Get notified about important events',        category: 'system' },
  { id: 'view-profile',          label: 'View Profile',             description: 'Access personal profile',                   category: 'system' },
  { id: 'ai-insights',           label: 'AI Insights',              description: 'Access AI-powered insights and chat',        category: 'analytics' },
];

export const DEFAULT_AGENT_PERMISSIONS: string[] = [
  'import-data',
  'view-dashboard',
  'view-reports',
  'view-kpi',
  'receive-notifications',
  'view-profile',
];

export const DEFAULT_MANAGER_PERMISSIONS: string[] = AVAILABLE_PERMISSIONS.map(p => p.id);