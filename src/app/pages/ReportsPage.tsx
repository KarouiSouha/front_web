import { FileText, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ChartCard } from '../components/ChartCard';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const reportTypes = [
  {
    id: 'turnover',
    title: 'Inventory Turnover Report',
    description: 'Analyze stock rotation rates and identify slow-moving items',
    icon: '📊',
  },
  {
    id: 'profitability',
    title: 'Pricing & Profitability Report',
    description: 'Review margins, pricing strategies, and product profitability',
    icon: '💰',
  },
  {
    id: 'risk',
    title: 'Risk Assessment Report',
    description: 'Comprehensive customer credit risk analysis',
    icon: '⚠️',
  },
  {
    id: 'supply',
    title: 'Supply Policy Report',
    description: 'Reorder points, lead times, and optimal stock levels',
    icon: '📦',
  },
  {
    id: 'distribution',
    title: 'Distribution Behavior Report',
    description: 'Sales patterns by channel, region, and customer segment',
    icon: '🌍',
  },
  {
    id: 'aging',
    title: 'Aging Receivables Report',
    description: 'Detailed customer payment aging analysis',
    icon: '⏰',
  },
];

export function ReportsPage() {
  // Mock data for charts
  const turnoverData = [
    { product: 'Laptop Dell XPS', rate: 3.2 },
    { product: 'iPhone 15 Pro', rate: 4.8 },
    { product: 'AirPods Pro', rate: 5.6 },
    { product: 'MacBook Pro', rate: 2.1 },
    { product: 'iPad Air', rate: 3.9 },
  ];

  const marginData = [
    { product: 'Laptop Dell XPS', purchase: 1200, sale: 1599, margin: 25 },
    { product: 'iPhone 15 Pro', purchase: 900, sale: 1199, margin: 25 },
    { product: 'MacBook Pro', purchase: 2200, sale: 2799, margin: 21 },
    { product: 'AirPods Pro', purchase: 180, sale: 249, margin: 28 },
  ];

  const salesByChannel = [
    { name: 'Online Store', value: 45 },
    { name: 'Retail Store', value: 30 },
    { name: 'Wholesale', value: 15 },
    { name: 'Direct Sales', value: 10 },
  ];

  const COLORS = ['#4f46e5', '#8b5cf6', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate comprehensive business reports and analytics
        </p>
      </div>

      {/* Report Types Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{report.icon}</span>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button className="flex-1" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Preview Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>Interactive preview of available reports</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="turnover">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="turnover">Turnover</TabsTrigger>
              <TabsTrigger value="profitability">Profitability</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
              <TabsTrigger value="supply">Supply</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="aging">Aging</TabsTrigger>
            </TabsList>

            <TabsContent value="turnover" className="space-y-4 mt-6">
              <ChartCard
                title="Inventory Turnover Rate"
                description="Number of times inventory is sold and replaced"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={turnoverData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="product" className="text-xs" angle={-45} textAnchor="end" height={100} />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="rate" fill="#4f46e5" name="Turnover Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </TabsContent>

            <TabsContent value="profitability" className="space-y-4 mt-6">
              <ChartCard
                title="Product Profitability Analysis"
                description="Purchase price vs sale price comparison"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marginData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="product" className="text-xs" angle={-45} textAnchor="end" height={100} />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="purchase" fill="#f59e0b" name="Purchase Price" />
                    <Bar dataKey="sale" fill="#10b981" name="Sale Price" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4 mt-6">
              <div className="p-8 text-center text-muted-foreground">
                <p>Risk assessment report with customer credit analysis</p>
                <p className="text-sm mt-2">Generate full report to view detailed risk metrics</p>
              </div>
            </TabsContent>

            <TabsContent value="supply" className="space-y-4 mt-6">
              <div className="p-8 text-center text-muted-foreground">
                <p>Supply policy report with reorder points and lead times</p>
                <p className="text-sm mt-2">Generate full report to view supply recommendations</p>
              </div>
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4 mt-6">
              <ChartCard
                title="Sales Distribution by Channel"
                description="Breakdown of sales across different channels"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={salesByChannel}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {salesByChannel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </TabsContent>

            <TabsContent value="aging" className="space-y-4 mt-6">
              <div className="p-8 text-center text-muted-foreground">
                <p>Comprehensive aging receivables analysis</p>
                <p className="text-sm mt-2">Visit Aging Receivables page for interactive dashboard</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common report operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export All Reports
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Schedule Reports
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Email Reports
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Report Templates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
