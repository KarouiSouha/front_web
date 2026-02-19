import { useState } from 'react';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { DataTable } from '../components/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { products, branches, inventory, getProductById, getBranchById } from '../lib/mockData';
import { getStockStatus, getStockColor, formatCurrency, formatNumber } from '../lib/utils';

export function InventoryPage() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const [selectedProduct, setSelectedProduct] = useState('all');

  // Calculate branch metrics
  const branchMetrics = branches.map(branch => {
    const branchInventory = inventory.filter(inv => inv.branchId === branch.id);
    const totalStock = branchInventory.reduce((sum, inv) => {
      const product = getProductById(inv.productId);
      return sum + (product ? inv.quantity * product.purchasePrice : 0);
    }, 0);
    
    const lowStockItems = branchInventory.filter(inv => {
      const product = getProductById(inv.productId);
      return product && inv.quantity < product.minStock;
    }).length;

    const stockHealth = (branchInventory.length - lowStockItems) / branchInventory.length * 100;

    return {
      branch,
      totalStock,
      totalItems: branchInventory.length,
      lowStockItems,
      stockHealth,
    };
  });

  // Prepare inventory table data
  const filteredInventory = selectedBranch === 'all' 
    ? inventory 
    : inventory.filter(inv => inv.branchId === selectedBranch);

  const inventoryData = filteredInventory.map(inv => {
    const product = getProductById(inv.productId);
    const branch = getBranchById(inv.branchId);
    const status = product ? getStockStatus(inv.quantity, product.minStock, product.maxStock) : 'normal';
    const stockPercentage = product ? (inv.quantity / product.maxStock) * 100 : 0;

    return {
      ...inv,
      product,
      branch,
      status,
      stockPercentage,
    };
  });

  const columns = [
    {
      key: 'product',
      label: 'Product',
      render: (row: typeof inventoryData[0]) => (
        <div>
          <p className="font-medium">{row.product?.name}</p>
          <p className="text-xs text-muted-foreground">{row.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (row: typeof inventoryData[0]) => row.branch?.name,
    },
    {
      key: 'quantity',
      label: 'Current Stock',
      render: (row: typeof inventoryData[0]) => (
        <span className="font-semibold">{row.quantity}</span>
      ),
    },
    {
      key: 'minStock',
      label: 'Min / Max',
      render: (row: typeof inventoryData[0]) => (
        <span className="text-sm text-muted-foreground">
          {row.product?.minStock} / {row.product?.maxStock}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: typeof inventoryData[0]) => (
        <Badge
          variant={row.status === 'normal' ? 'default' : row.status === 'low' ? 'secondary' : 'destructive'}
          className="gap-1"
        >
          {row.status === 'normal' ? '🟢 Normal' : row.status === 'low' ? '🟡 Low' : '🔴 Critical'}
        </Badge>
      ),
    },
    {
      key: 'stockLevel',
      label: 'Stock Level',
      render: (row: typeof inventoryData[0]) => (
        <div className="w-full">
          <div className="flex items-center gap-2">
            <Progress 
              value={row.stockPercentage} 
              className={`flex-1 h-2 [&>div]:${getStockColor(row.status)}`}
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {row.stockPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'value',
      label: 'Stock Value',
      render: (row: typeof inventoryData[0]) => (
        <span className="font-semibold">
          {row.product ? formatCurrency(row.quantity * row.product.purchasePrice) : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Multi-Branch Inventory</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage inventory across all branches
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your inventory view</CardDescription>
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

      {/* Branch Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {branchMetrics.map(metric => (
          <Card key={metric.branch.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{metric.branch.name}</CardTitle>
              <CardDescription className="text-xs">{metric.branch.location}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Stock</p>
                  <p className="text-lg font-bold">{formatCurrency(metric.totalStock)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="text-lg font-bold">{metric.totalItems}</p>
                </div>
              </div>
              {metric.lowStockItems > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">{metric.lowStockItems} low stock items</span>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Stock Health</span>
                  <span className="text-xs font-medium">{metric.stockHealth.toFixed(0)}%</span>
                </div>
                <Progress value={metric.stockHealth} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Inventory Details</CardTitle>
              <CardDescription>Complete inventory across all branches</CardDescription>
            </div>
            <Tabs value={selectedBranch} onValueChange={setSelectedBranch}>
              <TabsList>
                <TabsTrigger value="all">All Branches</TabsTrigger>
                {branches.map(branch => (
                  <TabsTrigger key={branch.id} value={branch.id}>
                    {branch.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={inventoryData}
            columns={columns}
            searchable
            exportable
            pageSize={15}
          />
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(inventoryData.reduce((sum, inv) => {
                return sum + (inv.product ? inv.quantity * inv.product.purchasePrice : 0);
              }, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {branches.length} branches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryData.filter(inv => inv.status === 'critical' || inv.status === 'low').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active product lines
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}