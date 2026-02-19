import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DataTable } from '../components/DataTable';
import { sales, purchases, getProductById, getBranchById, getCustomerById, branches, products } from '../lib/mockData';
import { formatCurrency, formatDate } from '../lib/utils';
import { Eye } from 'lucide-react';
import { useState } from 'react';

export function SalesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  
  // Combine sales and purchases for display
  const transactions = [
    ...sales.slice(0, 50).map(sale => ({
      ...sale,
      type: 'sale' as const,
      product: getProductById(sale.productId),
      branch: getBranchById(sale.branchId),
      customer: getCustomerById(sale.customerId),
      price: sale.unitPrice,
      value: sale.total,
    })),
    ...purchases.slice(0, 30).map(purchase => ({
      ...purchase,
      type: 'purchase' as const,
      product: getProductById(purchase.productId),
      branch: getBranchById(purchase.branchId),
      customer: null,
      price: purchase.unitPrice,
      value: purchase.total,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (row: typeof transactions[0]) => (
        <Badge variant={row.type === 'sale' ? 'default' : 'secondary'}>
          {row.type === 'sale' ? 'Sale' : 'Purchase'}
        </Badge>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row: typeof transactions[0]) => formatDate(row.date),
    },
    {
      key: 'invoiceNumber',
      label: 'Invoice',
      render: (row: typeof transactions[0]) => (
        <span className="font-mono text-sm">{row.invoiceNumber}</span>
      ),
    },
    {
      key: 'product',
      label: 'Product',
      render: (row: typeof transactions[0]) => (
        <div>
          <p className="font-medium">{row.product?.name}</p>
          <p className="text-xs text-muted-foreground">{row.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (row: typeof transactions[0]) => row.branch?.name || '-',
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (row: typeof transactions[0]) => row.customer?.name || '-',
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (row: typeof transactions[0]) => (
        <span className="font-medium">{row.quantity}</span>
      ),
    },
    {
      key: 'price',
      label: 'Unit Price',
      render: (row: typeof transactions[0]) => formatCurrency(row.price),
    },
    {
      key: 'value',
      label: 'Total Value',
      render: (row: typeof transactions[0]) => (
        <span className="font-semibold">{formatCurrency(row.value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: typeof transactions[0]) => (
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
          Completed
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: typeof transactions[0]) => (
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Sales & Purchases</h1>
        <p className="text-muted-foreground mt-1">
          Complete transaction history and analysis
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your sales view</CardDescription>
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

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold mt-2">
            {formatCurrency(sales.reduce((sum, s) => sum + s.total, 0))}
          </p>
          <p className="text-xs text-green-600 mt-1">↑ 12.5% vs last period</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Purchases</p>
          <p className="text-2xl font-bold mt-2">
            {formatCurrency(purchases.reduce((sum, p) => sum + p.total, 0))}
          </p>
          <p className="text-xs text-green-600 mt-1">↑ 6.8% vs last period</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-2xl font-bold mt-2">{transactions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Avg Transaction</p>
          <p className="text-2xl font-bold mt-2">
            {formatCurrency(sales.reduce((sum, s) => sum + s.total, 0) / sales.length)}
          </p>
          <p className="text-xs text-green-600 mt-1">↑ 3.2% vs last period</p>
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable
        data={transactions}
        columns={columns}
        searchable
        exportable
        pageSize={15}
      />
    </div>
  );
}