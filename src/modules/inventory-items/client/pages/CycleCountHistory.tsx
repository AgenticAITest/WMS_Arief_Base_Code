import React, { useState, useEffect } from 'react';
import { Eye, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { ViewCountModal } from '../components/ViewCountModal';
import DataPagination from '@client/components/console/DataPagination';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import { useNavigate } from 'react-router';

interface CycleCount {
  id: string;
  countNumber: string;
  status: string;
  countType: string;
  scheduledDate: string;
  completedDate: string | null;
  createdAt: string;
  approvedBy: string | null;
}

const CycleCountHistory: React.FC = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);

  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [perPage, setPerPage] = useState(Number(params.get('perPage')) || 10);

  // Filters
  const [statusFilter, setStatusFilter] = useState(params.get('status') || 'all');
  const [prevStatusFilter, setPrevStatusFilter] = useState(params.get('status') || 'all');

  // View modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);

  // Document viewer
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocumentPath, setSelectedDocumentPath] = useState<string>('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<string>('');

  function gotoPage(p: number) {
    if (p < 1 || (count !== 0 && p > Math.ceil(count / perPage))) return;

    const urlParams = new URLSearchParams(window.location.search);
    setPage(p);
    urlParams.set('page', p.toString());
    urlParams.set('perPage', perPage.toString());
    if (statusFilter && statusFilter !== 'all') urlParams.set('status', statusFilter);

    navigate(`${window.location.pathname}?${urlParams.toString()}`);
    setLoading(true);
  }

  useEffect(() => {
    // Reset to page 1 when filter changes (but don't fetch yet)
    if (statusFilter !== prevStatusFilter && page !== 1) {
      setPrevStatusFilter(statusFilter);
      setPage(1);
      return; // Skip fetching, let the page change trigger the fetch
    }

    // Update previous filter if it changed
    if (statusFilter !== prevStatusFilter) {
      setPrevStatusFilter(statusFilter);
    }

    // Fetch cycle counts for current page/filter combination
    const fetchCycleCounts = async () => {
      try {
        setLoading(true);
        const apiParams: any = {
          page,
          perPage,
          excludeStatus: 'created', // Exclude 'created' status for history view
        };

        if (statusFilter && statusFilter !== 'all') apiParams.status = statusFilter;

        const response = await axios.get('/api/modules/inventory-items/cycle-counts', {
          params: apiParams,
        });

        if (response.data.success) {
          setCycleCounts(response.data.data || []);
          setCount(response.data.pagination?.total || 0);
        }
      } catch (error: any) {
        console.error('Error fetching cycle counts:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch cycle counts');
      } finally {
        setLoading(false);
      }
    };

    fetchCycleCounts();
  }, [page, perPage, statusFilter]);

  const handleViewCount = (id: string) => {
    setSelectedCountId(id);
    setIsViewModalOpen(true);
  };

  const handleViewDocument = async (cycleCountId: string, countNumber: string) => {
    try {
      const response = await axios.get(
        `/api/modules/inventory-items/cycle-counts/${cycleCountId}/document`
      );

      if (response.data.success && response.data.data?.documentPath) {
        setSelectedDocumentPath(response.data.data.documentPath);
        setSelectedDocumentNumber(countNumber);
        setDocumentViewerOpen(true);
      } else {
        toast.error('Document not found');
      }
    } catch (error: any) {
      console.error('Error fetching document:', error);
      toast.error(error.response?.data?.message || 'Failed to load document');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      created: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cycle Count History</h1>
          <p className="text-muted-foreground">
            View all approved and rejected cycle counts
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : cycleCounts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No cycle count history found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Count Number</TableHead>
                  <TableHead>Count Type</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycleCounts.map((cycleCount) => (
                  <TableRow key={cycleCount.id}>
                    <TableCell className="font-medium">{cycleCount.countNumber}</TableCell>
                    <TableCell className="capitalize">{cycleCount.countType || 'Partial'}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(cycleCount.createdAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cycleCount.completedDate
                        ? format(new Date(cycleCount.completedDate), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(cycleCount.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewCount(cycleCount.id)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {cycleCount.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleViewDocument(cycleCount.id, cycleCount.countNumber)
                            }
                            title="View Document"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4">
            <DataPagination
              count={count}
              perPage={perPage}
              page={page}
              gotoPage={gotoPage}
            />
          </div>
        </>
      )}

      {/* View Count Modal */}
      {selectedCountId && (
        <ViewCountModal
          open={isViewModalOpen}
          onOpenChange={setIsViewModalOpen}
          countId={selectedCountId}
        />
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        documentPath={selectedDocumentPath}
        documentNumber={selectedDocumentNumber}
      />
    </div>
  );
};

export default withModuleAuthorization(CycleCountHistory, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items',
});
