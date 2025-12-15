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
  Calendar,
  FileText
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import DataPagination from '@client/components/console/DataPagination';
import { useNavigate } from 'react-router';

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
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Document viewer modal state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentPath, setDocumentPath] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(Number(params.get('page')) || 1);
  const [perPage, setPerPage] = useState(Number(params.get('perPage')) || 20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [dateFrom, setDateFrom] = useState(params.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(params.get('dateTo') || '');
  const [moduleFilter, setModuleFilter] = useState(params.get('module') || 'all');
  const [actionFilter, setActionFilter] = useState(params.get('action') || 'all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState(params.get('resourceType') || 'all');
  const [userIdFilter, setUserIdFilter] = useState(params.get('userId') || '');
  const [statusFilter, setStatusFilter] = useState(params.get('status') || 'all');
  const [searchTerm, setSearchTerm] = useState(params.get('search') || '');
  const [activeQuickFilter, setActiveQuickFilter] = useState<number | null>(null);

  // Track previous filter values to detect changes
  const [prevDateFrom, setPrevDateFrom] = useState(params.get('dateFrom') || '');
  const [prevDateTo, setPrevDateTo] = useState(params.get('dateTo') || '');
  const [prevModuleFilter, setPrevModuleFilter] = useState(params.get('module') || 'all');
  const [prevActionFilter, setPrevActionFilter] = useState(params.get('action') || 'all');
  const [prevResourceTypeFilter, setPrevResourceTypeFilter] = useState(params.get('resourceType') || 'all');
  const [prevUserIdFilter, setPrevUserIdFilter] = useState(params.get('userId') || '');
  const [prevStatusFilter, setPrevStatusFilter] = useState(params.get('status') || 'all');
  const [prevSearchTerm, setPrevSearchTerm] = useState(params.get('search') || '');

  // Available filter options
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);

  function gotoPage(p: number) {
    if (p < 1 || (totalRecords !== 0 && p > Math.ceil(totalRecords / perPage))) return;

    const urlParams = new URLSearchParams(window.location.search);
    setCurrentPage(p);
    urlParams.set('page', p.toString());
    urlParams.set('perPage', perPage.toString());
    if (dateFrom) urlParams.set('dateFrom', dateFrom);
    if (dateTo) urlParams.set('dateTo', dateTo);
    if (moduleFilter && moduleFilter !== 'all') urlParams.set('module', moduleFilter);
    if (actionFilter && actionFilter !== 'all') urlParams.set('action', actionFilter);
    if (resourceTypeFilter && resourceTypeFilter !== 'all') urlParams.set('resourceType', resourceTypeFilter);
    if (userIdFilter) urlParams.set('userId', userIdFilter);
    if (statusFilter && statusFilter !== 'all') urlParams.set('status', statusFilter);
    if (searchTerm) urlParams.set('search', searchTerm);

    navigate(`${window.location.pathname}?${urlParams.toString()}`);
    setLoading(true);
  }

  useEffect(() => {
    const fetchFilterOptions = async () => {
      // Fetch distinct values for filter dropdowns
      try {
        const response = await axios.get('/api/audit-logs', {
          params: { page: 1, perPage: 1000 }
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

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    // Check if any filter changed
    const filterChanged = 
      dateFrom !== prevDateFrom || 
      dateTo !== prevDateTo || 
      moduleFilter !== prevModuleFilter || 
      actionFilter !== prevActionFilter || 
      resourceTypeFilter !== prevResourceTypeFilter || 
      userIdFilter !== prevUserIdFilter || 
      statusFilter !== prevStatusFilter || 
      searchTerm !== prevSearchTerm;

    // Reset to page 1 when filters change (but don't fetch yet)
    if (filterChanged && currentPage !== 1) {
      setPrevDateFrom(dateFrom);
      setPrevDateTo(dateTo);
      setPrevModuleFilter(moduleFilter);
      setPrevActionFilter(actionFilter);
      setPrevResourceTypeFilter(resourceTypeFilter);
      setPrevUserIdFilter(userIdFilter);
      setPrevStatusFilter(statusFilter);
      setPrevSearchTerm(searchTerm);
      setCurrentPage(1);
      return; // Skip fetching, let the page change trigger the fetch
    }

    // Update previous filter values if they changed
    if (filterChanged) {
      setPrevDateFrom(dateFrom);
      setPrevDateTo(dateTo);
      setPrevModuleFilter(moduleFilter);
      setPrevActionFilter(actionFilter);
      setPrevResourceTypeFilter(resourceTypeFilter);
      setPrevUserIdFilter(userIdFilter);
      setPrevStatusFilter(statusFilter);
      setPrevSearchTerm(searchTerm);
    }

    // Fetch audit logs for current page/filter combination
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);

        const apiParams: any = {
          page: currentPage,
          perPage,
        };

        if (dateFrom) apiParams.dateFrom = dateFrom;
        if (dateTo) apiParams.dateTo = dateTo;
        if (moduleFilter && moduleFilter !== 'all') apiParams.module = moduleFilter;
        if (actionFilter && actionFilter !== 'all') apiParams.action = actionFilter;
        if (resourceTypeFilter && resourceTypeFilter !== 'all') apiParams.resourceType = resourceTypeFilter;
        if (userIdFilter) apiParams.userId = userIdFilter;
        if (statusFilter && statusFilter !== 'all') apiParams.status = statusFilter;
        if (searchTerm) apiParams.search = searchTerm;

        const response = await axios.get('/api/audit-logs', { params: apiParams });

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

    fetchAuditLogs();
  }, [currentPage, perPage, moduleFilter, actionFilter, resourceTypeFilter, statusFilter, dateFrom, dateTo, userIdFilter, searchTerm]);

  const handleSearch = () => {
    gotoPage(1);
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
    setActiveQuickFilter(null);
  };

  const handleQuickFilter = (days: number) => {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);

    setDateFrom(format(fromDate, 'yyyy-MM-dd'));
    setDateTo(format(today, 'yyyy-MM-dd'));
    setCurrentPage(1);
    setActiveQuickFilter(days);
  };

  // Reset quick filter when manual date changes
  useEffect(() => {
    if (activeQuickFilter !== null) {
      const today = new Date();
      const expectedFrom = new Date();
      expectedFrom.setDate(today.getDate() - activeQuickFilter);
      const expectedFromStr = format(expectedFrom, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      if (dateFrom !== expectedFromStr || dateTo !== todayStr) {
        setActiveQuickFilter(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsModalOpen(true);
  };

  const handleExportCSV = async () => {
    try {
      const apiParams: any = {
        page: 1,
        perPage: 10000,
      };

      if (dateFrom) apiParams.dateFrom = dateFrom;
      if (dateTo) apiParams.dateTo = dateTo;
      if (moduleFilter && moduleFilter !== 'all') apiParams.module = moduleFilter;
      if (actionFilter && actionFilter !== 'all') apiParams.action = actionFilter;
      if (resourceTypeFilter && resourceTypeFilter !== 'all') apiParams.resourceType = resourceTypeFilter;
      if (userIdFilter) apiParams.userId = userIdFilter;
      if (statusFilter && statusFilter !== 'all') apiParams.status = statusFilter;
      if (searchTerm) apiParams.search = searchTerm;

      const response = await axios.get('/api/audit-logs', { params: apiParams });

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
      case 'failure':
      case 'error':
        return 'bg-red-50 text-red-800 ring-red-600/20';
      default:
        return 'bg-gray-50 text-gray-800 ring-gray-600/20';
    }
  };

  const handleRefresh = () => {
    // Force re-fetch by updating a state that triggers the useEffect
    setCurrentPage(currentPage); // This will trigger the useEffect
  };

  const handleViewDocument = (log: AuditLog) => {
    if (!log.documentPath) {
      toast.error('No document path available');
      return;
    }

    // Extract document number from path
    const pathParts = log.documentPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const docNumber = fileName.replace('.html', '');

    // Open modal with direct file path
    setDocumentPath(log.documentPath);
    setDocumentNumber(docNumber);
    setDocumentViewerOpen(true);
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
          <Button variant="outline" onClick={handleRefresh}>
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
                variant={activeQuickFilter === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickFilter(0)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Today
              </Button>
              <Button
                variant={activeQuickFilter === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickFilter(7)}
              >
                Last 7 Days
              </Button>
              <Button
                variant={activeQuickFilter === 30 ? "default" : "outline"}
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
                    <SelectItem value="failure">Failure</SelectItem>
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

            {/* <div className="flex justify-end">
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div> */}
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
              <div className="mt-4">
                <DataPagination
                  count={totalRecords}
                  perPage={perPage}
                  page={currentPage}
                  gotoPage={gotoPage}
                />
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
        documentPath={documentPath}
        documentNumber={documentNumber}
      />
    </div>
  );
};

export default withModuleAuthorization(AuditLog, {
  moduleId: 'reports',
  moduleName: 'Reports'
});
