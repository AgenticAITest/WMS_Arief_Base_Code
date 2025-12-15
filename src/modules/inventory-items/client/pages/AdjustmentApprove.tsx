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
import { ApproveAdjustmentModal } from '../components/ApproveAdjustmentModal';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

interface Adjustment {
  id: string;
  adjustmentNumber: string;
  status: string;
  type: string;
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

const AdjustmentApprove: React.FC = () => {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/adjustments', {
        params: {
          status: 'created',
          page: 1,
          perPage: 100,
        },
      });
      const adjustmentsList = response.data.data || [];
      setAdjustments(adjustmentsList);

      // Fetch item counts for each adjustment
      const counts: Record<string, number> = {};
      await Promise.all(
        adjustmentsList.map(async (adj: Adjustment) => {
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

  const handleView = (id: string) => {
    setSelectedAdjustmentId(id);
    setApproveModalOpen(true);
  };

  const handleApproveSuccess = () => {
    setApproveModalOpen(false);
    setSelectedAdjustmentId(null);
    fetchAdjustments();
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
          <h1 className="text-3xl font-bold tracking-tight">Approve Adjustments</h1>
          <p className="text-muted-foreground">
            Review and approve pending inventory adjustments
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : adjustments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No pending adjustments to approve</p>
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
                <TableHead>Created By</TableHead>
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
                  <TableCell>{adjustment.createdBy}</TableCell>
                  <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(adjustment.id)}
                        title="View and Approve"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedAdjustmentId && (
        <ApproveAdjustmentModal
          open={approveModalOpen}
          onOpenChange={setApproveModalOpen}
          adjustmentId={selectedAdjustmentId}
          onSuccess={handleApproveSuccess}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(AdjustmentApprove, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});