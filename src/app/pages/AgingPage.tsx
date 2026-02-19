import { Eye, Send, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ChartCard } from '../components/ChartCard';
import { DataTable } from '../components/DataTable';
import { Progress } from '../components/ui/progress';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { agingReceivables, getCustomerById, getBranchById, getAgingDistribution, getTopRiskyCustomers, branches } from '../lib/mockData';
import { formatCurrency, formatDate, getAgingStatus, getAgingColor } from '../lib/utils';

export function AgingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const [selectedBranch, setSelectedBranch] = useState('all');
  
  const agingDistribution = getAgingDistribution();
  const topRiskyCustomers = getTopRiskyCustomers();
  
  const totalReceivables = agingReceivables.reduce((sum, rec) => sum + rec.remainingBalance, 0);
  const overdueAmount = agingReceivables.filter(r => r.daysOverdue > 0).reduce((sum, rec) => sum + rec.remainingBalance, 0);
  const avgDelay = agingReceivables.length > 0
    ? agingReceivables.reduce((sum, rec) => sum + rec.daysOverdue, 0) / agingReceivables.length
    : 0;

  // Mock monthly trend data
  const monthlyTrend = [
    { month: 'Aug', receivables: 85000, payments: 72000 },
    { month: 'Sep', receivables: 92000, payments: 78000 },
    { month: 'Oct', receivables: 88000, payments: 85000 },
    { month: 'Nov', receivables: 95000, payments: 82000 },
    { month: 'Dec', receivables: 103000, payments: 88000 },
    { month: 'Jan', receivables: 98000, payments: 91000 },
  ];

  const columns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (row: typeof agingReceivables[0]) => {
        const customer = getCustomerById(row.customerId);
        return (
          <div>
            <p className="font-medium">{customer?.name}</p>
            <p className="text-xs text-muted-foreground">{customer?.code}</p>
          </div>
        );
      },
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (row: typeof agingReceivables[0]) => getBranchById(row.branchId)?.name,
    },
    {
      key: 'invoiceNumber',
      label: 'Invoice',
      render: (row: typeof agingReceivables[0]) => (
        <span className="font-mono text-sm">{row.invoiceNumber}</span>
      ),
    },
    {
      key: 'invoiceDate',
      label: 'Invoice Date',
      render: (row: typeof agingReceivables[0]) => formatDate(row.invoiceDate),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (row: typeof agingReceivables[0]) => formatDate(row.dueDate),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row: typeof agingReceivables[0]) => formatCurrency(row.totalAmount),
    },
    {
      key: 'paidAmount',
      label: 'Paid',
      render: (row: typeof agingReceivables[0]) => formatCurrency(row.paidAmount),
    },
    {
      key: 'remainingBalance',
      label: 'Balance',
      render: (row: typeof agingReceivables[0]) => (
        <span className="font-semibold">{formatCurrency(row.remainingBalance)}</span>
      ),
    },
    {
      key: 'daysOverdue',
      label: 'Days Overdue',
      render: (row: typeof agingReceivables[0]) => (
        <Badge className={getAgingStatus(row.daysOverdue) === 'current' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : getAgingStatus(row.daysOverdue) === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}>
          {row.daysOverdue} days
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: typeof agingReceivables[0]) => {
        const status = getAgingStatus(row.daysOverdue);
        return (
          <Badge variant={status === 'current' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
            {status === 'current' ? '🟢 Current' : status === 'warning' ? '🟡 Warning' : '🔴 Critical'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: typeof agingReceivables[0]) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Aging Receivables</h1>
        <p className="text-muted-foreground mt-1">
          Monitor customer payment status and aging analysis
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your aging view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Last Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="12m">Last 12 Months</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agingReceivables.length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Payment Delay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDelay.toFixed(0)} days</div>
            <p className="text-xs text-yellow-600 mt-1">
              Above target (30 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span>Medium</span>
              <Badge variant="secondary">58</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Risk score out of 100
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Aging Distribution */}
        <ChartCard
          title="Aging Distribution"
          description="Breakdown of receivables by aging period"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={agingDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {agingDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly Trend */}
        <ChartCard
          title="Monthly Receivables Trend"
          description="Receivables and payments over time"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Line type="monotone" dataKey="receivables" stroke="#ef4444" strokeWidth={2} name="Receivables" />
              <Line type="monotone" dataKey="payments" stroke="#10b981" strokeWidth={2} name="Payments" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Risky Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Risky Customers</CardTitle>
          <CardDescription>Customers requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topRiskyCustomers.map((item, index) => (
              <div key={item.customer.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 font-bold text-red-600 dark:text-red-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{item.customer.name}</p>
                      <p className="text-sm text-muted-foreground">{item.customer.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{formatCurrency(item.totalOverdue)}</p>
                      <Badge variant="destructive" className="mt-1">{item.daysOverdue} days overdue</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={item.riskScore} className="flex-1 h-2 [&>div]:bg-red-500" />
                    <span className="text-sm font-medium text-muted-foreground w-16 text-right">
                      Risk: {item.riskScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Receivables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Receivables Details</CardTitle>
          <CardDescription>Complete list of outstanding invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={agingReceivables}
            columns={columns}
            searchable
            exportable
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}