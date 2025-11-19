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
import { Eye } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';

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
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocumentPath, setSelectedDocumentPath] = useState<string>('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<string>('');
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/adjustments', {
        params: {
          page: 1,
          limit: 1000,
        },
      });
      
      // Filter out adjustments with status 'created'
      const filteredAdjustments = (response.data.data || []).filter(
        (adj: Adjustment) => adj.status !== 'created'
      );
      setAdjustments(filteredAdjustments);

      // Fetch item counts for each adjustment
      const counts: Record<string, number> = {};
      await Promise.all(
        filteredAdjustments.map(async (adj: Adjustment) => {
          try {
            const itemsResponse = await axios.get(
              `/api/modules/inventory-items/adjustments/${adj.id}/items`,
              {
                params: { page: 1, limit: 1 },
              }
            );
            counts[adj.id] = itemsResponse.data.pagination?.total || 0;
          } catch (error) {
            counts[adj.id] = 0;
          }
        })
      );
      setItemCounts(counts);
    } catch (error: any) {
      console.error('Error fetching adjustments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (adjustmentId: string, adjustmentNumber: string) => {
    try {
      // Fetch document metadata from generated_documents table
      const response = await axios.get(`/api/modules/inventory-items/adjustments/${adjustmentId}/document`);
      
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

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : adjustments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No adjustment history found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adjustment Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Processed Date</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Processed By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.map((adjustment) => (
                <TableRow key={adjustment.id}>
                  <TableCell className="font-medium">{adjustment.adjustmentNumber}</TableCell>
                  <TableCell>{getTypeBadge(adjustment.type)}</TableCell>
                  <TableCell>{itemCounts[adjustment.id] || 0}</TableCell>
                  <TableCell>
                    {format(new Date(adjustment.createdAt), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {adjustment.appliedAt
                      ? format(new Date(adjustment.appliedAt), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>{adjustment.createdBy}</TableCell>
                  <TableCell>{adjustment.approvedBy || '-'}</TableCell>
                  <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(adjustment.id, adjustment.adjustmentNumber)}
                        title="View Document"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DocumentViewerModal
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        documentPath={selectedDocumentPath}
        documentNumber={selectedDocumentNumber}
      />
    </div>
  );
};
