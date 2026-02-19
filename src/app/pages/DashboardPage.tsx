import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Users,
  AlertTriangle,
  BarChart3,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  calculateKPIs,
  getSalesByMonth,
  getAgingDistribution,
  getTopRiskyCustomers,
  getTopProducts,
  getBranchPerformance,
  getProductById,
  branches,
  products,
} from '../lib/mockData';
import { formatCurrency, formatNumber } from '../lib/utils';

export function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  
  const kpis = calculateKPIs();
  const salesByMonth = getSalesByMonth();
  const agingDistribution = getAgingDistribution();
  const topRiskyCustomers = getTopRiskyCustomers();
  const topProducts = getTopProducts();
  const branchPerformance = getBranchPerformance();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your business performance and key metrics
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your dashboard view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
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
            <div>
              <label className="text-sm font-medium mb-2 block">Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.slice(0, 5).map(product => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Invoices"
          value={formatNumber(kpis.totalInvoices)}
          trend={{ value: 12.5, isPositive: true }}
          icon={ShoppingCart}
        />
        <KPICard
          title="Total Sales"
          value={formatCurrency(kpis.totalSales)}
          trend={{ value: 8.3, isPositive: true }}
          icon={TrendingUp}
        />
        <KPICard
          title="Current Stock Value"
          value={formatCurrency(kpis.stockValue)}
          trend={{ value: 3.2, isPositive: false }}
          icon={Package}
        />
        <KPICard
          title="Total Receivables"
          value={formatCurrency(kpis.totalReceivables)}
          trend={{ value: 5.7, isPositive: false }}
          icon={Wallet}
        />
        <KPICard
          title="Total Purchases"
          value={formatCurrency(kpis.totalPurchases)}
          trend={{ value: 6.1, isPositive: true }}
          icon={DollarSign}
        />
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          trend={{ value: 15.8, isPositive: true }}
          icon={BarChart3}
        />
        <KPICard
          title="Total Margin"
          value={formatCurrency(kpis.totalMargin)}
          trend={{ value: 9.4, isPositive: true }}
          icon={TrendingUp}
        />
        <KPICard
          title="Risk Level"
          value={
            <div className="flex items-center gap-2">
              <span>{kpis.riskLevel.toFixed(0)}</span>
              <Badge
                variant={kpis.riskLevel < 30 ? 'default' : kpis.riskLevel < 60 ? 'secondary' : 'destructive'}
              >
                {kpis.riskLevel < 30 ? 'Low' : kpis.riskLevel < 60 ? 'Medium' : 'High'}
              </Badge>
            </div>
          }
          icon={AlertTriangle}
          showSparkline={false}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales vs Purchases */}
        <ChartCard
          title="Sales vs Purchases"
          description="Monthly comparison of sales and purchase trends"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2} name="Sales" />
              <Line type="monotone" dataKey="purchases" stroke="#f59e0b" strokeWidth={2} name="Purchases" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Branch Comparison */}
        <ChartCard
          title="Branch Performance"
          description="Sales and stock comparison across branches"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={branchPerformance}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="branch" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#4f46e5" name="Sales" />
              <Bar dataKey="stock" fill="#8b5cf6" name="Stock Value" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Aging Receivables Distribution */}
        <ChartCard
          title="Aging Receivables Distribution"
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

        {/* Top Products */}
        <ChartCard
          title="Top 10 Products by Sales"
          description="Best performing products this period"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis type="category" dataKey="product.name" className="text-xs" width={120} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="total" fill="#4f46e5" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Risky Customers */}
      <ChartCard
        title="Top 5 Risky Customers"
        description="Customers with highest risk scores and overdue amounts"
      >
        <div className="space-y-4">
          {topRiskyCustomers.map((item) => (
            <div key={item.customer.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium truncate">{item.customer.name}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.totalOverdue)}
                    </span>
                    <Badge variant="destructive">{item.daysOverdue} days</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={item.riskScore} className="flex-1 h-2" />
                  <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                    {item.riskScore}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Margin Evolution */}
      <ChartCard
        title="Margin Evolution"
        description="Profit margin trend over time"
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={salesByMonth}>
            <defs>
              <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#colorMargin)"
              name="Margin"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}