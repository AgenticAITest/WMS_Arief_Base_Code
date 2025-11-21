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
import { Plus, Trash2, Eye, Pencil } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { CreateRelocationModal } from '../components/CreateRelocationModal';
import { ViewRelocationModal } from '../components/ViewRelocationModal';
import { EditRelocationModal } from '../components/EditRelocationModal';
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
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

interface Relocation {
  id: string;
  relocationNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

const RelocationCreate: React.FC = () => {
  const [relocations, setRelocations] = useState<Relocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRelocationId, setSelectedRelocationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Relocation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchRelocations();
  }, []);

  const fetchRelocations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/relocations', {
        params: {
          status: 'created',
          page: 1,
          limit: 100,
        },
      });
      const relocationsList = response.data.data || [];
      setRelocations(relocationsList);

      const counts: Record<string, number> = {};
      await Promise.all(
        relocationsList.map(async (reloc: Relocation) => {
          try {
            const itemsResponse = await axios.get(
              `/api/modules/inventory-items/relocations/${reloc.id}/items`,
              {
                params: { page: 1, limit: 1 },
              }
            );
            counts[reloc.id] = itemsResponse.data.pagination?.total || 0;
          } catch (error) {
            counts[reloc.id] = 0;
          }
        })
      );
      setItemCounts(counts);
    } catch (error: any) {
      console.error('Error fetching relocations:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch relocations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRelocation = (id: string) => {
    setSelectedRelocationId(id);
    setViewModalOpen(true);
  };

  const handleEditRelocation = (id: string) => {
    setSelectedRelocationId(id);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedRelocationId(null);
    fetchRelocations();
  };

  const handleDelete = (item: Relocation) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setDeleting(true);
      await axios.delete(`/api/modules/inventory-items/relocations/${deletingItem.id}`);
      toast.success('Relocation deleted successfully');
      fetchRelocations();
    } catch (error: any) {
      console.error('Error deleting relocation:', error);
      toast.error(error.response?.data?.message || 'Failed to delete relocation');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
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
          <h2 className="text-2xl font-bold">Inventory Relocation</h2>
          <p className="text-gray-600">Create and manage inventory relocations</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Relocation
        </Button>
      </div>

      {relocations.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Relocations Found</div>
          <div className="text-sm">
            Click "Create Relocation" to create your first inventory relocation.
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Relocation Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relocations.map((relocation) => (
                <TableRow key={relocation.id}>
                  <TableCell className="font-medium">{relocation.relocationNumber}</TableCell>
                  <TableCell>{getStatusBadge(relocation.status)}</TableCell>
                  <TableCell>{itemCounts[relocation.id] || 0}</TableCell>
                  <TableCell>
                    {relocation.createdAt
                      ? format(new Date(relocation.createdAt), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {relocation.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewRelocation(relocation.id)}
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRelocation(relocation.id)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(relocation)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateRelocationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchRelocations}
      />

      {selectedRelocationId && (
        <>
          <ViewRelocationModal
            open={viewModalOpen}
            onOpenChange={setViewModalOpen}
            relocationId={selectedRelocationId}
          />
          <EditRelocationModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            relocationId={selectedRelocationId}
            onSuccess={handleEditSuccess}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete relocation {deletingItem?.relocationNumber}? This
              action cannot be undone.
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

export default withModuleAuthorization(RelocationCreate, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items',
});
