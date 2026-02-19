// Mock data for FASI platform

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  creditLimit: number;
  riskScore: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  productId: string;
  branchId: string;
  customerId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  productId: string;
  branchId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  type: 'low_stock' | 'high_sales' | 'risk' | 'overdue' | 'sales_drop' | 'exchange_rate' | 'seasonal';
  severity: 'low' | 'medium' | 'critical';
  productId?: string;
  branchId?: string;
  customerId?: string;
  message: string;
  date: string;
  daysActive: number;
  status: 'pending' | 'resolved';
  aiExplanation?: string;
}

export interface AgingReceivable {
  id: string;
  customerId: string;
  branchId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  daysOverdue: number;
}

// Generate mock products
export const products: Product[] = [
  { id: '1', name: 'Laptop Dell XPS 15', sku: 'LAP-001', category: 'Electronics', purchasePrice: 1200, salePrice: 1599, currentStock: 45, minStock: 10, maxStock: 100 },
  { id: '2', name: 'iPhone 15 Pro', sku: 'PHN-001', category: 'Electronics', purchasePrice: 900, salePrice: 1199, currentStock: 23, minStock: 15, maxStock: 80 },
  { id: '3', name: 'Samsung Galaxy S24', sku: 'PHN-002', category: 'Electronics', purchasePrice: 750, salePrice: 999, currentStock: 67, minStock: 20, maxStock: 100 },
  { id: '4', name: 'MacBook Pro 16"', sku: 'LAP-002', category: 'Electronics', purchasePrice: 2200, salePrice: 2799, currentStock: 12, minStock: 5, maxStock: 50 },
  { id: '5', name: 'iPad Air', sku: 'TAB-001', category: 'Electronics', purchasePrice: 500, salePrice: 649, currentStock: 34, minStock: 10, maxStock: 60 },
  { id: '6', name: 'AirPods Pro', sku: 'AUD-001', category: 'Accessories', purchasePrice: 180, salePrice: 249, currentStock: 156, minStock: 50, maxStock: 200 },
  { id: '7', name: 'Sony WH-1000XM5', sku: 'AUD-002', category: 'Accessories', purchasePrice: 300, salePrice: 399, currentStock: 89, minStock: 30, maxStock: 150 },
  { id: '8', name: 'LG OLED TV 55"', sku: 'TV-001', category: 'Electronics', purchasePrice: 1100, salePrice: 1499, currentStock: 8, minStock: 5, maxStock: 30 },
  { id: '9', name: 'Desk Office Chair', sku: 'FRN-001', category: 'Furniture', purchasePrice: 200, salePrice: 299, currentStock: 5, minStock: 8, maxStock: 50 },
  { id: '10', name: 'Standing Desk', sku: 'FRN-002', category: 'Furniture', purchasePrice: 350, salePrice: 499, currentStock: 15, minStock: 10, maxStock: 40 },
  { id: '11', name: 'Webcam HD Pro', sku: 'ACC-001', category: 'Accessories', purchasePrice: 80, salePrice: 129, currentStock: 92, minStock: 30, maxStock: 150 },
  { id: '12', name: 'Mechanical Keyboard', sku: 'ACC-002', category: 'Accessories', purchasePrice: 90, salePrice: 149, currentStock: 78, minStock: 25, maxStock: 120 },
];

// Generate mock branches
export const branches: Branch[] = [
  { id: '1', name: 'Main Store', location: 'Downtown' },
  { id: '2', name: 'North Branch', location: 'North District' },
  { id: '3', name: 'South Branch', location: 'South District' },
  { id: '4', name: 'East Branch', location: 'East District' },
];

// Generate mock customers
export const customers: Customer[] = [
  { id: '1', name: 'Tech Solutions Inc.', code: 'CUST-001', email: 'contact@techsol.com', phone: '555-0101', creditLimit: 50000, riskScore: 85 },
  { id: '2', name: 'Digital Services LLC', code: 'CUST-002', email: 'info@digiserv.com', phone: '555-0102', creditLimit: 30000, riskScore: 45 },
  { id: '3', name: 'Office Supplies Co.', code: 'CUST-003', email: 'sales@officesup.com', phone: '555-0103', creditLimit: 25000, riskScore: 65 },
  { id: '4', name: 'Retail Express', code: 'CUST-004', email: 'orders@retailexp.com', phone: '555-0104', creditLimit: 40000, riskScore: 30 },
  { id: '5', name: 'Enterprise Systems', code: 'CUST-005', email: 'contact@entsys.com', phone: '555-0105', creditLimit: 75000, riskScore: 20 },
  { id: '6', name: 'Global Trading', code: 'CUST-006', email: 'info@globaltrade.com', phone: '555-0106', creditLimit: 20000, riskScore: 72 },
  { id: '7', name: 'Smart Business Inc.', code: 'CUST-007', email: 'contact@smartbiz.com', phone: '555-0107', creditLimit: 35000, riskScore: 55 },
  { id: '8', name: 'Future Tech Corp.', code: 'CUST-008', email: 'sales@futuretech.com', phone: '555-0108', creditLimit: 60000, riskScore: 15 },
];

// Generate sales data for the last 12 months
const generateSales = (): Sale[] => {
  const sales: Sale[] = [];
  let invoiceCounter = 1000;
  
  for (let month = 0; month < 12; month++) {
    const numSales = Math.floor(Math.random() * 20) + 30;
    for (let i = 0; i < numSales; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - month);
      date.setDate(Math.floor(Math.random() * 28) + 1);
      
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const unitPrice = product.salePrice * (0.9 + Math.random() * 0.2); // ±10% variation
      
      sales.push({
        id: `sale-${invoiceCounter}`,
        invoiceNumber: `INV-${invoiceCounter}`,
        date: date.toISOString().split('T')[0],
        productId: product.id,
        branchId: branches[Math.floor(Math.random() * branches.length)].id,
        customerId: customers[Math.floor(Math.random() * customers.length)].id,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      });
      invoiceCounter++;
    }
  }
  
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Generate purchase data
const generatePurchases = (): Purchase[] => {
  const purchases: Purchase[] = [];
  let invoiceCounter = 2000;
  
  for (let month = 0; month < 12; month++) {
    const numPurchases = Math.floor(Math.random() * 15) + 20;
    for (let i = 0; i < numPurchases; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - month);
      date.setDate(Math.floor(Math.random() * 28) + 1);
      
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 20) + 5;
      const unitPrice = product.purchasePrice * (0.95 + Math.random() * 0.1);
      
      purchases.push({
        id: `purchase-${invoiceCounter}`,
        invoiceNumber: `PUR-${invoiceCounter}`,
        date: date.toISOString().split('T')[0],
        productId: product.id,
        branchId: branches[Math.floor(Math.random() * branches.length)].id,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      });
      invoiceCounter++;
    }
  }
  
  return purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Generate inventory data
const generateInventory = (): InventoryItem[] => {
  const inventory: InventoryItem[] = [];
  
  products.forEach(product => {
    branches.forEach(branch => {
      const quantity = Math.floor(Math.random() * product.maxStock);
      inventory.push({
        id: `inv-${product.id}-${branch.id}`,
        productId: product.id,
        branchId: branch.id,
        quantity,
        lastUpdated: new Date().toISOString(),
      });
    });
  });
  
  return inventory;
};

// Generate alerts
export const alerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'low_stock',
    severity: 'critical',
    productId: '9',
    branchId: '1',
    message: 'Desk Office Chair stock below minimum threshold',
    date: '2026-02-09',
    daysActive: 2,
    status: 'pending',
    aiExplanation: 'Stock level (5 units) is below minimum threshold (8 units). High sales velocity detected in last 7 days. Recommend immediate reorder of 20 units.'
  },
  {
    id: 'alert-2',
    type: 'overdue',
    severity: 'critical',
    customerId: '2',
    message: 'Digital Services LLC has overdue payment of $12,450',
    date: '2026-02-10',
    daysActive: 1,
    status: 'pending',
    aiExplanation: 'Customer has 67 days overdue payment. Risk score increased from 35 to 45. Previous payment pattern shows delays. Recommend immediate contact and payment plan.'
  },
  {
    id: 'alert-3',
    type: 'high_sales',
    severity: 'medium',
    productId: '6',
    branchId: '2',
    message: 'AirPods Pro experiencing 300% sales increase',
    date: '2026-02-08',
    daysActive: 3,
    status: 'pending',
    aiExplanation: 'Sales velocity increased significantly. Seasonal pattern detected. Current stock sufficient for 45 days. Consider promotional campaign continuation.'
  },
  {
    id: 'alert-4',
    type: 'risk',
    severity: 'critical',
    customerId: '6',
    message: 'Global Trading risk score increased to 72',
    date: '2026-02-07',
    daysActive: 4,
    status: 'pending',
    aiExplanation: 'Risk score jumped from 58 to 72. Multiple late payments detected. Total exposure: $8,900. Recommend credit limit review and stricter payment terms.'
  },
  {
    id: 'alert-5',
    type: 'sales_drop',
    severity: 'medium',
    productId: '8',
    branchId: '3',
    message: 'LG OLED TV 55" sales dropped 45% this month',
    date: '2026-02-06',
    daysActive: 5,
    status: 'pending',
    aiExplanation: 'Sales decline detected compared to historical average. Market analysis shows competitor pricing 12% lower. Recommend price adjustment or promotional campaign.'
  },
  {
    id: 'alert-6',
    type: 'seasonal',
    severity: 'low',
    productId: '11',
    message: 'Webcam HD Pro entering high-demand season',
    date: '2026-02-05',
    daysActive: 6,
    status: 'pending',
    aiExplanation: 'Historical data shows 200% increase in demand during Q1. Current stock levels adequate. Consider increasing orders by 50% to meet projected demand.'
  },
  {
    id: 'alert-7',
    type: 'low_stock',
    severity: 'medium',
    productId: '4',
    branchId: '1',
    message: 'MacBook Pro 16" approaching minimum stock level',
    date: '2026-02-04',
    daysActive: 7,
    status: 'pending',
    aiExplanation: 'Current stock: 12 units, minimum: 5 units. Average sales: 3 units/week. Stock sufficient for 4 weeks. Recommend reorder of 15 units within 2 weeks.'
  },
  {
    id: 'alert-8',
    type: 'exchange_rate',
    severity: 'medium',
    message: 'USD/EUR exchange rate increased 3.2%',
    date: '2026-02-03',
    daysActive: 8,
    status: 'resolved',
    aiExplanation: 'Exchange rate volatility detected. Impact on imported products: +$4,200 in costs. Recommend reviewing pricing strategy for affected SKUs.'
  },
];

// Generate aging receivables
const generateAgingReceivables = (): AgingReceivable[] => {
  const receivables: AgingReceivable[] = [];
  let counter = 1;
  
  customers.forEach(customer => {
    const numInvoices = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numInvoices; i++) {
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 120));
      
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      const totalAmount = Math.floor(Math.random() * 15000) + 1000;
      const paidAmount = Math.random() > 0.5 ? Math.floor(totalAmount * (Math.random() * 0.5)) : 0;
      
      if (paidAmount < totalAmount) {
        receivables.push({
          id: `rec-${counter}`,
          customerId: customer.id,
          branchId: branches[Math.floor(Math.random() * branches.length)].id,
          invoiceNumber: `INV-${3000 + counter}`,
          invoiceDate: invoiceDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          totalAmount,
          paidAmount,
          remainingBalance: totalAmount - paidAmount,
          daysOverdue,
        });
        counter++;
      }
    }
  });
  
  return receivables.sort((a, b) => b.daysOverdue - a.daysOverdue);
};

export const sales = generateSales();
export const purchases = generatePurchases();
export const inventory = generateInventory();
export const agingReceivables = generateAgingReceivables();

// Helper functions
export const getProductById = (id: string) => products.find(p => p.id === id);
export const getBranchById = (id: string) => branches.find(b => b.id === id);
export const getCustomerById = (id: string) => customers.find(c => c.id === id);

// KPI Calculations
export const calculateKPIs = () => {
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalRevenue = totalSales;
  const totalMargin = totalSales - purchases.reduce((sum, purchase) => {
    const sale = sales.find(s => s.productId === purchase.productId);
    return sum + (sale ? purchase.total : 0);
  }, 0);
  
  const stockValue = products.reduce((sum, product) => {
    return sum + (product.currentStock * product.purchasePrice);
  }, 0);
  
  const totalReceivables = agingReceivables.reduce((sum, rec) => sum + rec.remainingBalance, 0);
  
  const totalInvoices = sales.length;
  
  // Calculate average risk
  const overdueReceivables = agingReceivables.filter(r => r.daysOverdue > 0);
  const avgRisk = overdueReceivables.length > 0 ? 
    overdueReceivables.reduce((sum, r) => sum + (r.daysOverdue > 90 ? 90 : r.daysOverdue > 60 ? 60 : 30), 0) / overdueReceivables.length : 0;
  
  return {
    totalInvoices,
    totalPurchases,
    totalSales,
    stockValue,
    totalReceivables,
    totalRevenue,
    totalMargin,
    riskLevel: avgRisk,
  };
};

// Get sales data by month for charts
export const getSalesByMonth = () => {
  const monthlyData: { [key: string]: { sales: number; purchases: number; month: string } } = {};
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    monthlyData[monthKey] = {
      month: monthName,
      sales: 0,
      purchases: 0,
    };
  }
  
  sales.forEach(sale => {
    const monthKey = sale.date.slice(0, 7);
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].sales += sale.total;
    }
  });
  
  purchases.forEach(purchase => {
    const monthKey = purchase.date.slice(0, 7);
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].purchases += purchase.total;
    }
  });
  
  return Object.values(monthlyData);
};

// Get aging distribution
export const getAgingDistribution = () => {
  const distribution = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
  };
  
  agingReceivables.forEach(rec => {
    if (rec.daysOverdue <= 30) {
      distribution.current += rec.remainingBalance;
    } else if (rec.daysOverdue <= 60) {
      distribution.days30 += rec.remainingBalance;
    } else if (rec.daysOverdue <= 90) {
      distribution.days60 += rec.remainingBalance;
    } else {
      distribution.days90 += rec.remainingBalance;
    }
  });
  
  return [
    { name: '0-30 days', value: distribution.current, fill: '#10b981' },
    { name: '31-60 days', value: distribution.days30, fill: '#f59e0b' },
    { name: '61-90 days', value: distribution.days60, fill: '#f97316' },
    { name: '90+ days', value: distribution.days90, fill: '#ef4444' },
  ];
};

// Get top risky customers
export const getTopRiskyCustomers = () => {
  const customerRisk = customers.map(customer => {
    const customerReceivables = agingReceivables.filter(r => r.customerId === customer.id);
    const totalOverdue = customerReceivables.reduce((sum, r) => sum + r.remainingBalance, 0);
    const maxDaysOverdue = Math.max(...customerReceivables.map(r => r.daysOverdue), 0);
    
    return {
      customer,
      totalOverdue,
      daysOverdue: maxDaysOverdue,
      riskScore: customer.riskScore,
    };
  }).filter(c => c.totalOverdue > 0);
  
  return customerRisk.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
};

// Get top products by sales
export const getTopProducts = () => {
  const productSales: { [key: string]: number } = {};
  
  sales.forEach(sale => {
    if (!productSales[sale.productId]) {
      productSales[sale.productId] = 0;
    }
    productSales[sale.productId] += sale.total;
  });
  
  return Object.entries(productSales)
    .map(([productId, total]) => ({
      product: getProductById(productId)!,
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
};

// Get branch performance
export const getBranchPerformance = () => {
  const branchData: { [key: string]: { sales: number; stock: number } } = {};
  
  branches.forEach(branch => {
    branchData[branch.id] = { sales: 0, stock: 0 };
  });
  
  sales.forEach(sale => {
    if (branchData[sale.branchId]) {
      branchData[sale.branchId].sales += sale.total;
    }
  });
  
  inventory.forEach(inv => {
    if (branchData[inv.branchId]) {
      const product = getProductById(inv.productId);
      if (product) {
        branchData[inv.branchId].stock += inv.quantity * product.purchasePrice;
      }
    }
  });
  
  return branches.map(branch => ({
    branch: branch.name,
    sales: branchData[branch.id].sales,
    stock: branchData[branch.id].stock,
  }));
};
