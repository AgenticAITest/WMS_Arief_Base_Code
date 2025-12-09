import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Eye, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import { ViewAdjustmentModal } from '../components/ViewAdjustmentModal';
import DataPagination from '@client/components/console/DataPagination';
import { useNavigate } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';

interface Adjustment {
  id: string;
  adjustmentNumber: string;
  status: string;
  type: string;
  notes: string | null;
  createdAt: string;
  appliedAt: string | null;
  createdBy: string;
  approvedBy: string | null;
}

export const AdjustmentHistory: React.FC = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);

  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [perPage, setPerPage] = useState(Number(params.get('perPage')) || 10);

  // Filters
  const [statusFilter, setStatusFilter] = useState(params.get('status') || 'all');

  // Document viewer
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocumentPath, setSelectedDocumentPath] = useState<string>('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<string>('');

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);

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
    fetchAdjustments();
  }, [page, perPage, statusFilter]);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const apiParams: any = {
        page,
        perPage,
      };

      if (statusFilter && statusFilter !== 'all') apiParams.status = statusFilter;

      const response = await axios.get('/api/modules/inventory-items/adjustments', {
        params: apiParams,
      });

      if (response.data.success) {
        // Filter out adjustments with status 'created' for history view
        const filteredAdjustments = (response.data.data || []).filter(
          (adj: Adjustment) => adj.status !== 'created'
        );
        setAdjustments(filteredAdjustments);
        setCount(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching adjustments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleViewAdjustment = (id: string) => {
    setSelectedAdjustmentId(id);
    setViewModalOpen(true);
  };

  const handleViewDocument = async (adjustmentId: string, adjustmentNumber: string) => {
    try {
      const response = await axios.get(
        `/api/modules/inventory-items/adjustments/${adjustmentId}/document`
      );

      if (response.data.success && response.data.data?.documentPath) {
        setSelectedDocumentPath(response.data.data.documentPath);
        setSelectedDocumentNumber(adjustmentNumber);
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

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      regular: 'outline',
      cycle_count: 'secondary',
    };

    const displayText = type === 'cycle_count' ? 'Cycle Count' : 'Regular';

    return (
      <Badge variant={variants[type] || 'outline'}>
        {displayText}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adjustment History</h1>
          <p className="text-muted-foreground">
            View all approved and rejected inventory adjustments
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
      ) : adjustments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No adjustment history found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Processed Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow key={adjustment.id}>
                    <TableCell className="font-medium">{adjustment.adjustmentNumber}</TableCell>
                    <TableCell>{getTypeBadge(adjustment.type)}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(adjustment.createdAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {adjustment.appliedAt
                        ? format(new Date(adjustment.appliedAt), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewAdjustment(adjustment.id)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {adjustment.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleViewDocument(adjustment.id, adjustment.adjustmentNumber)
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

      {/* View Adjustment Modal */}
      {selectedAdjustmentId && (
        <ViewAdjustmentModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          adjustmentId={selectedAdjustmentId}
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
