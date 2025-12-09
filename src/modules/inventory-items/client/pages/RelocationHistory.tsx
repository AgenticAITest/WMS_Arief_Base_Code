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
import { ViewRelocationModal } from '../components/ViewRelocationModal';
import DataPagination from '@client/components/console/DataPagination';
import { useNavigate } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

interface Relocation {
  id: string;
  relocationNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  createdBy: string;
  approvedBy: string | null;
}

const RelocationHistory: React.FC = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);

  const [relocations, setRelocations] = useState<Relocation[]>([]);
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
  const [selectedRelocationId, setSelectedRelocationId] = useState<string | null>(null);

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
    fetchRelocations();
  }, [page, perPage, statusFilter]);

  const fetchRelocations = async () => {
    try {
      setLoading(true);
      const apiParams: any = {
        page,
        limit: perPage,
      };

      if (statusFilter && statusFilter !== 'all') apiParams.status = statusFilter;

      const response = await axios.get('/api/modules/inventory-items/relocations', {
        params: apiParams,
      });

      if (response.data.success) {
        // Filter out relocations with status 'created' for history view
        const filteredRelocations = (response.data.data || []).filter(
          (reloc: Relocation) => reloc.status !== 'created'
        );
        setRelocations(filteredRelocations);
        setCount(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching relocations:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch relocations');
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

  const handleViewRelocation = (id: string) => {
    setSelectedRelocationId(id);
    setViewModalOpen(true);
  };

  const handleViewDocument = async (relocationId: string, relocationNumber: string) => {
    try {
      const response = await axios.get(
        `/api/modules/inventory-items/relocations/${relocationId}/document`
      );

      if (response.data.success && response.data.data?.documentPath) {
        setSelectedDocumentPath(response.data.data.documentPath);
        setSelectedDocumentNumber(relocationNumber);
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
          <h1 className="text-3xl font-bold tracking-tight">Relocation History</h1>
          <p className="text-muted-foreground">
            View all approved and rejected inventory relocations
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
      ) : relocations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No relocation history found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relocation Number</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Processed Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relocations.map((relocation) => (
                  <TableRow key={relocation.id}>
                    <TableCell className="font-medium">{relocation.relocationNumber}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(relocation.createdAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {relocation.completedAt
                        ? format(new Date(relocation.completedAt), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(relocation.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewRelocation(relocation.id)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {relocation.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleViewDocument(relocation.id, relocation.relocationNumber)
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

      {/* View Relocation Modal */}
      {selectedRelocationId && (
        <ViewRelocationModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          relocationId={selectedRelocationId}
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

export default withModuleAuthorization(RelocationHistory, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items',
});
