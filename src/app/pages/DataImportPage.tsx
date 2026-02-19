import { useState } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const templates = [
  {
    id: 'sales',
    title: 'Sales Template',
    description: 'Import sales transactions and invoices',
    icon: '📄',
    role: ['agent', 'manager'],
  },
  {
    id: 'purchases',
    title: 'Purchases Template',
    description: 'Import purchase orders and supplier invoices',
    icon: '📄',
    role: ['manager'],
  },
  {
    id: 'stock',
    title: 'Stock Movements Template',
    description: 'Import inventory movements and transfers',
    icon: '📄',
    role: ['agent', 'manager'],
  },
  {
    id: 'customers',
    title: 'Customer Balances Template',
    description: 'Import customer account balances',
    icon: '📄',
    role: ['manager'],
  },
  {
    id: 'exchange',
    title: 'Exchange Rates Template',
    description: 'Import currency exchange rates',
    icon: '📄',
    role: ['manager'],
  },
];

const mockPreviewData = [
  { id: 1, date: '2026-02-10', invoice: 'INV-1001', product: 'Laptop Dell XPS 15', quantity: 2, amount: 3198, status: '✓' },
  { id: 2, date: '2026-02-10', invoice: 'INV-1002', product: 'iPhone 15 Pro', quantity: 5, amount: 5995, status: '✓' },
  { id: 3, date: '2026-02-09', invoice: 'INV-1003', product: 'MacBook Pro 16"', quantity: 1, amount: 2799, status: '✓' },
  { id: 4, date: '2026-02-09', invoice: 'INV-1004', product: 'Invalid Product', quantity: -1, amount: 0, status: '✗' },
  { id: 5, date: '2026-02-08', invoice: 'INV-1005', product: 'AirPods Pro', quantity: 10, amount: 2490, status: '✓' },
];

export function DataImportPage() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const userRole = 'manager'; // Mock user role

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setShowPreview(false);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadComplete(true);
          setTimeout(() => setShowPreview(true), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      // Process file
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleFileUpload({ target: input } as any);
    }
  };

  const validRows = mockPreviewData.filter(row => row.status === '✓').length;
  const invalidRows = mockPreviewData.filter(row => row.status === '✗').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Data Import Center</h1>
        <p className="text-muted-foreground mt-1">
          Upload Excel files to import your business data
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Drag and drop your Excel file or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950">
                <Upload className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-lg font-medium">Drop your Excel file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse (max 10MB, .xlsx only)
                </p>
              </div>
              <Button>Browse Files</Button>
            </div>
            <input
              id="file-input"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Uploading...</span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${uploadProgress > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>Uploading</span>
                </div>
                <span>→</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${uploadProgress > 40 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>Validating</span>
                </div>
                <span>→</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${uploadProgress > 70 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>Processing</span>
                </div>
                <span>→</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${uploadProgress === 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Upload Success */}
          {uploadComplete && !isUploading && (
            <Alert className="mt-6 border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                File uploaded successfully! Review the preview below and confirm import.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Template Downloads */}
      <Card>
        <CardHeader>
          <CardTitle>Download Templates</CardTitle>
          <CardDescription>
            Download Excel templates for different data types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const canAccess = template.role.includes(userRole);
              
              return (
                <Card key={template.id} className={!canAccess ? 'opacity-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950 text-2xl">
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{template.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0 mt-2"
                          disabled={!canAccess}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* File Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>File Preview</CardTitle>
                <CardDescription>
                  Review the first 10 rows of your data
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-500">
                  {validRows} Valid
                </Badge>
                {invalidRows > 0 && (
                  <Badge variant="destructive">
                    {invalidRows} Invalid
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden mb-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPreviewData.map((row) => (
                    <TableRow key={row.id} className={row.status === '✗' ? 'bg-red-50 dark:bg-red-950' : ''}>
                      <TableCell>
                        {row.status === '✓' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.invoice}</TableCell>
                      <TableCell>{row.product}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>${row.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {invalidRows > 0 && (
              <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-600">
                  Some rows contain errors. Please fix them before importing or remove invalid rows.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button className="flex-1" size="lg">
                Confirm Import
              </Button>
              <Button variant="outline" size="lg" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Processing Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Data Processing Pipeline</CardTitle>
          <CardDescription>
            How your data flows through the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-muted/30 rounded-lg">
            {[
              { icon: FileSpreadsheet, label: 'Excel File', color: 'text-blue-600' },
              { icon: CheckCircle2, label: 'Validation', color: 'text-green-600' },
              { icon: Upload, label: 'Database Storage', color: 'text-purple-600' },
              { icon: Upload, label: 'KPI Engine', color: 'text-indigo-600' },
              { icon: Upload, label: 'Dashboard Update', color: 'text-orange-600' },
              { icon: AlertCircle, label: 'Smart Alerts', color: 'text-red-600' },
            ].map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card border-2">
                    <step.icon className={`h-8 w-8 ${step.color}`} />
                  </div>
                  <span className="text-sm font-medium text-center">{step.label}</span>
                </div>
                {index < 5 && (
                  <div className="hidden md:block text-2xl text-muted-foreground">→</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
