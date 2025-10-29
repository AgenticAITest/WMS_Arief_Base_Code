import React, { useState, useEffect } from 'react';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import {
  Search,
  RefreshCw,
  Download,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';

interface AuditLog {
  id: string;
  module: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string | null;
  userName: string | null;
  description: string | null;
  changedFields: any;
  previousState: string | null;
  newState: string | null;
  status: string;
  errorMessage: string | null;
  ipAddress: string | null;
  documentPath: string | null;
  createdAt: string;
}

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Document viewer modal state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentType, setDocumentType] = useState<'PO' | 'GRN' | 'PUTAWAY'>('PO');
  const [documentId, setDocumentId] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Available filter options
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, moduleFilter, actionFilter, resourceTypeFilter, statusFilter]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    // Fetch distinct values for filter dropdowns
    try {
      const response = await axios.get('/api/audit-logs', {
        params: { page: 1, limit: 1000 }
      });

      if (response.data.success && response.data.data) {
        const logs = response.data.data;

        // Extract unique values
        const uniqueModules = [...new Set(logs.map((log: AuditLog) => log.module))].filter(Boolean);
        const uniqueActions = [...new Set(logs.map((log: AuditLog) => log.action))].filter(Boolean);
        const uniqueResourceTypes = [...new Set(logs.map((log: AuditLog) => log.resourceType))].filter(Boolean);

        setModules(uniqueModules as string[]);
        setActions(uniqueActions as string[]);
        setResourceTypes(uniqueResourceTypes as string[]);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      const params: any = {
        page: currentPage,
        limit,
      };

      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (moduleFilter && moduleFilter !== 'all') params.module = moduleFilter;
      if (actionFilter && actionFilter !== 'all') params.action = actionFilter;
      if (resourceTypeFilter && resourceTypeFilter !== 'all') params.resourceType = resourceTypeFilter;
      if (userIdFilter) params.userId = userIdFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get('/api/audit-logs', { params });

      if (response.data.success) {
        setLogs(response.data.data || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalRecords(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setModuleFilter('all');
    setActionFilter('all');
    setResourceTypeFilter('all');
    setUserIdFilter('');
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
    setTimeout(() => fetchAuditLogs(), 100);
  };

  const handleQuickFilter = (days: number) => {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);

    setDateFrom(format(fromDate, 'yyyy-MM-dd'));
    setDateTo(format(today, 'yyyy-MM-dd'));
    setCurrentPage(1);
    setTimeout(() => fetchAuditLogs(), 100);
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsModalOpen(true);
  };

  const handleExportCSV = async () => {
    try {
      const params: any = {
        page: 1,
        limit: 10000, // Get all records
      };

      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (moduleFilter && moduleFilter !== 'all') params.module = moduleFilter;
      if (actionFilter && actionFilter !== 'all') params.action = actionFilter;
      if (resourceTypeFilter && resourceTypeFilter !== 'all') params.resourceType = resourceTypeFilter;
      if (userIdFilter) params.userId = userIdFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get('/api/audit-logs', { params });

      if (response.data.success && response.data.data) {
        const csvData = convertToCSV(response.data.data);
        downloadCSV(csvData, `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
        toast.success('Audit logs exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export audit logs');
    }
  };

  const convertToCSV = (data: AuditLog[]): string => {
    const headers = [
      'Timestamp',
      'Module',
      'Action',
      'Resource Type',
      'Resource ID',
      'User',
      'Description',
      'Status',
      'IP Address',
    ];

    const rows = data.map(log => [
      format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      log.module,
      log.action,
      log.resourceType,
      log.resourceId,
      log.userName || log.userId || 'System',
      log.description || '',
      log.status,
      log.ipAddress || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (status: string | null) => {
    const statusLower = (status ?? '').toLowerCase();
    switch (statusLower) {
      case 'success':
        return 'bg-green-50 text-green-800 ring-green-600/20';
      case 'failed':
      case 'error':
        return 'bg-red-50 text-red-800 ring-red-600/20';
      default:
        return 'bg-gray-50 text-gray-800 ring-gray-600/20';
    }
  };

  const handleViewDocument = async (log: AuditLog) => {
    try {
      // 1. Determine document type based on audit log action
      let docType: 'PO' | 'GRN' | 'PUTAWAY';
      if (log.action === 'create') {
        docType = 'PO';
      } else if (log.action === 'receive') {
        docType = 'GRN';
      } else if (log.action === 'putaway_confirm') {
        docType = 'PUTAWAY';
      } else {
        toast.error('Unable to determine document type from action: ' + log.action);
        return;
      }

      // 2. Extract document number from documentPath
      // Example path: "storage/purchase-order/documents/tenants/xxx/po/2025/PO-2510-WH-0001.html"
      // or "storage/purchase-order/documents/tenants/xxx/grn/2025/GRN-2510-WH1-0002.html"
      // or "storage/purchase-order/documents/tenants/xxx/putaway/2025/PUTAWAY-2510-WH1-0003.html"
      if (!log.documentPath) {
        toast.error('No document path available');
        return;
      }

      const pathParts = log.documentPath.split('/');
      const fileName = pathParts[pathParts.length - 1]; // e.g., "PO-2510-WH-0001.html"
      const docNumber = fileName.replace('.html', ''); // Remove .html extension

      // 3. Make API call to get documentId based on document number
      const response = await axios.get(
        `/api/modules/document-numbering/documents/by-number/${encodeURIComponent(docNumber)}`
      );

      if (response.data && response.data.data && response.data.data.id) {
        const docId = response.data.data.id;

        // 4. Open modal to display the document
        setDocumentType(docType);
        setDocumentId(docId);
        setDocumentNumber(docNumber);
        setDocumentViewerOpen(true);
      } else {
        toast.error('Document not found in database');
      }
    } catch (error: any) {
      console.error('Error viewing document:', error);
      toast.error(error.response?.data?.error || 'Failed to load document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAuditLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(0)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(7)}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(30)}
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Module</Label>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    {modules.map((module) => (
                      <SelectItem key={module} value={module}>
                        {module}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second row of filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Resource Type</Label>
                <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {resourceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search description or resource ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Audit Logs ({totalRecords} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No audit logs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              {log.module}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{log.action}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{log.resourceType}</div>
                              <div className="text-muted-foreground truncate max-w-[150px]">
                                {log.resourceId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.userName || log.userId || 'System'}
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="truncate" title={log.description || ''}>
                              {log.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(log.status)}`}>
                              {log.status || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetails(log)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {log.documentPath && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewDocument(log)}
                                  title="View Document"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalRecords)} of {totalRecords} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground self-center ml-2">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-mono">
                    {format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(selectedLog.status)}`}>
                      {selectedLog.status || 'N/A'}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Module</Label>
                  <p>{selectedLog.module}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <p>{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Resource Type</Label>
                  <p>{selectedLog.resourceType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Resource ID</Label>
                  <p className="font-mono text-sm break-all">{selectedLog.resourceId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p>{selectedLog.userName || selectedLog.userId || 'System'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p>{selectedLog.ipAddress || 'N/A'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p>{selectedLog.description || 'N/A'}</p>
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <Label className="text-muted-foreground text-red-600">Error Message</Label>
                  <p className="text-red-600 bg-red-50 p-2 rounded">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}

              {selectedLog.previousState && (
                <div>
                  <Label className="text-muted-foreground">Previous State</Label>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {selectedLog.previousState}
                  </pre>
                </div>
              )}

              {selectedLog.newState && (
                <div>
                  <Label className="text-muted-foreground">New State</Label>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {selectedLog.newState}
                  </pre>
                </div>
              )}

              {selectedLog.changedFields && (
                <div>
                  <Label className="text-muted-foreground">Changed Fields</Label>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.changedFields, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        documentType={documentType}
        documentId={documentId}
        documentNumber={documentNumber}
      />
    </div>
  );
};

export default AuditLog;
