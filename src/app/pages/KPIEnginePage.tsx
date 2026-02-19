import { useState } from 'react';
import { TrendingUp, Package, DollarSign, BarChart3, Info } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Badge } from '../components/ui/badge';
import { products, branches, sales, calculateKPIs } from '../lib/mockData';
import { formatCurrency, formatNumber } from '../lib/utils';

export function KPIEnginePage() {
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  const kpis = calculateKPIs();

  // Calculate product-specific KPIs
  const productSales = products.map(product => {
    const productSalesData = sales.filter(s => s.productId === product.id);
    const totalSales = productSalesData.reduce((sum, s) => sum + s.total, 0);
    const totalQuantity = productSalesData.reduce((sum, s) => sum + s.quantity, 0);
    
    return {
      product,
      totalSales,
      totalQuantity,
      avgPrice: totalQuantity > 0 ? totalSales / totalQuantity : 0,
      margin: ((product.salePrice - product.purchasePrice) / product.salePrice) * 100,
      rotationRate: (totalQuantity / product.currentStock) || 0,
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  const topProduct = productSales[0];
  const avgSales = productSales.reduce((sum, p) => sum + p.totalSales, 0) / productSales.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">KPI Engine</h1>
        <p className="text-muted-foreground mt-1">
          Automated calculation and monitoring of key performance indicators
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your KPI view</CardDescription>
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

      {/* Product & Inventory KPIs */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Product & Inventory KPIs</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <KPICard
                    title="Total Product Sales"
                    value={formatCurrency(kpis.totalSales)}
                    trend={{ value: 12.5, isPositive: true }}
                    icon={TrendingUp}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sum of all sales across all products</p>
                <p className="text-xs text-muted-foreground">Formula: SUM(sales.total)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Card className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950">
                        <Info className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Average Product Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(avgSales)}</p>
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Average sales per product</p>
                <p className="text-xs text-muted-foreground">Formula: AVG(product_sales)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <KPICard
                    title="Stock Rotation Rate"
                    value={`${topProduct.rotationRate.toFixed(2)}x`}
                    icon={Package}
                    showSparkline={false}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>How many times inventory turns over</p>
                <p className="text-xs text-muted-foreground">Formula: Sales Qty / Current Stock</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <KPICard
                    title="Total Revenue"
                    value={formatCurrency(kpis.totalRevenue)}
                    trend={{ value: 8.7, isPositive: true }}
                    icon={DollarSign}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total revenue from all sales</p>
                <p className="text-xs text-muted-foreground">Formula: SUM(sales.total)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <KPICard
                    title="Profit Margin"
                    value={`${((kpis.totalMargin / kpis.totalSales) * 100).toFixed(1)}%`}
                    trend={{ value: 3.2, isPositive: true }}
                    icon={BarChart3}
                    showSparkline={false}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Overall profit margin percentage</p>
                <p className="text-xs text-muted-foreground">Formula: (Revenue - Cost) / Revenue * 100</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Card className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950">
                        <Package className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Stock Coverage</p>
                      <p className="text-2xl font-bold">45 days</p>
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Days of stock coverage at current sales rate</p>
                <p className="text-xs text-muted-foreground">Formula: Current Stock / Avg Daily Sales</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Top Products by Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products Performance</CardTitle>
          <CardDescription>Best performing products with detailed KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productSales.slice(0, 5).map((item, index) => (
              <div key={item.product.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 font-bold text-indigo-600 dark:text-indigo-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.totalSales)}</p>
                      <p className="text-sm text-muted-foreground">{item.totalQuantity} units</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      Margin: {item.margin.toFixed(1)}%
                    </Badge>
                    <Badge variant="outline">
                      Rotation: {item.rotationRate.toFixed(2)}x
                    </Badge>
                    <Badge variant="outline">
                      Avg Price: {formatCurrency(item.avgPrice)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer KPIs Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Customer KPIs</CardTitle>
          <CardDescription>Key customer metrics and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-3xl font-bold">245</p>
              <Badge variant="default">+12 this month</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Active Customers</p>
              <p className="text-3xl font-bold">187</p>
              <Badge variant="default">76%</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Customer Credit</p>
              <p className="text-3xl font-bold">{formatCurrency(kpis.totalReceivables)}</p>
              <Badge variant="secondary">Outstanding</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Payment Delay</p>
              <p className="text-3xl font-bold">28 days</p>
              <Badge variant="secondary">Within target</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
