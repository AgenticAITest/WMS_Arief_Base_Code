import React, { useState, useEffect } from 'react';
import { Button } from '@client/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { Plus, Trash2, Eye } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { CreateAdjustmentModal } from '../components/CreateAdjustmentModal';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/alert-dialog';

interface Adjustment {
  id: string;
  adjustmentNumber: string;
  status: string;
  type: string;
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

export const AdjustmentCreate: React.FC = () => {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Adjustment | null>(null);
  const [deleting, setDeleting] = useState(false);
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
          limit: 100,
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

  const handleDelete = (item: Adjustment) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setDeleting(true);
      await axios.delete(`/api/modules/inventory-items/adjustments/${deletingItem.id}`);
      toast.success('Adjustment deleted successfully');
      fetchAdjustments();
    } catch (error: any) {
      console.error('Error deleting adjustment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete adjustment');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      created: 'secondary',
      submitted: 'outline',
      approved: 'default',
      rejected: 'destructive',
      applied: 'default',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Adjustment</h2>
          <p className="text-gray-600">Create and manage inventory adjustments</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Adjustment
        </Button>
      </div>

      {adjustments.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Adjustments Found</div>
          <div className="text-sm">
            Click "Add Adjustment" to create your first inventory adjustment.
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adjustment Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.map((adjustment) => (
                <TableRow key={adjustment.id}>
                  <TableCell className="font-mono">{adjustment.adjustmentNumber}</TableCell>
                  <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                  <TableCell className="capitalize">{adjustment.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{itemCounts[adjustment.id] || 0} items</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(adjustment.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {adjustment.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          window.location.href = `/console/modules/inventory-items/adjustment/${adjustment.id}`;
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {adjustment.status === 'created' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(adjustment)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateAdjustmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchAdjustments}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete adjustment{' '}
              <span className="font-mono font-semibold">{deletingItem?.adjustmentNumber}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
