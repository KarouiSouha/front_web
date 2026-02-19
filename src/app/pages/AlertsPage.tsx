import { useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DataTable } from '../components/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { alerts, getProductById, getBranchById, getCustomerById } from '../lib/mockData';
import { getAlertIcon, getSeverityColor, formatDate } from '../lib/utils';

export function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<typeof alerts[0] | null>(null);
  const [filter, setFilter] = useState('all');

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : filter === 'pending'
    ? alerts.filter(a => a.status === 'pending')
    : alerts.filter(a => a.status === 'resolved');

  const alertCounts = {
    all: alerts.length,
    pending: alerts.filter(a => a.status === 'pending').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
  };

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (row: typeof alerts[0]) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{getAlertIcon(row.type)}</span>
          <span className="font-medium capitalize">{row.type.replace('_', ' ')}</span>
        </div>
      ),
    },
    {
      key: 'message',
      label: 'Alert Message',
      render: (row: typeof alerts[0]) => (
        <div>
          <p className="font-medium">{row.message}</p>
          <p className="text-xs text-muted-foreground">
            {row.productId && getProductById(row.productId)?.name}
            {row.branchId && ` • ${getBranchById(row.branchId)?.name}`}
            {row.customerId && getCustomerById(row.customerId)?.name}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Alert Date',
      render: (row: typeof alerts[0]) => formatDate(row.date),
    },
    {
      key: 'daysActive',
      label: 'Days Active',
      render: (row: typeof alerts[0]) => (
        <Badge variant="outline">{row.daysActive} days</Badge>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (row: typeof alerts[0]) => (
        <Badge className={getSeverityColor(row.severity)}>
          {row.severity}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: typeof alerts[0]) => (
        <Badge variant={row.status === 'pending' ? 'secondary' : 'default'}>
          {row.status === 'pending' ? '⏳ Pending' : '✓ Resolved'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: typeof alerts[0]) => (
        <div className="flex gap-2">
          {row.status === 'pending' && (
            <Button variant="outline" size="sm">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Resolve
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedAlert(row)}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            AI Explain
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Smart Alerts</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered alerts and notifications for your business
        </p>
      </div>

      {/* Alert Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertCounts.all}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alertCounts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{alertCounts.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertCounts.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Alert Management</CardTitle>
              <CardDescription>Monitor and resolve system alerts</CardDescription>
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All ({alertCounts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({alertCounts.pending})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({alertCounts.resolved})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredAlerts}
            columns={columns}
            searchable
            exportable
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* AI Explanation Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              AI Alert Analysis
            </DialogTitle>
            <DialogDescription>
              Intelligent insights and recommendations
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4 pt-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getAlertIcon(selectedAlert.type)}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{selectedAlert.message}</h4>
                    <div className="flex gap-2 mb-3">
                      <Badge className={getSeverityColor(selectedAlert.severity)}>
                        {selectedAlert.severity}
                      </Badge>
                      <Badge variant="outline">
                        {selectedAlert.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    AI Analysis
                  </h5>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedAlert.aiExplanation}
                  </p>
                </div>

                <div className="grid gap-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium">Alert Created</span>
                    <span className="text-sm text-muted-foreground">{formatDate(selectedAlert.date)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium">Days Active</span>
                    <span className="text-sm text-muted-foreground">{selectedAlert.daysActive} days</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium">AI Confidence</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600" style={{ width: '87%' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">87%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  Apply Recommendation
                </Button>
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
