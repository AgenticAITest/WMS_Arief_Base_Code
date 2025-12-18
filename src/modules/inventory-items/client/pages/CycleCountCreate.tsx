import React, { useState, useEffect } from 'react';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
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
import { CreateCountModal } from '../components/CreateCountModal';
import { ViewCountModal } from '../components/ViewCountModal';
import { EditCountModal } from '../components/EditCountModal';
import { Badge } from '@client/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Authorized from '@client/components/auth/Authorized';

const CycleCountCreate: React.FC = () => {
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [countToDelete, setCountToDelete] = useState<any>(null);

  useEffect(() => {
    fetchCycleCounts();
  }, []);

  const fetchCycleCounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts', {
        params: {
          status: 'created',
          page: 1,
          perPage: 100,
        },
      });
      setCycleCounts(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching cycle counts:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch cycle counts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    fetchCycleCounts();
  };

  const handleViewCount = (id: string) => {
    setSelectedCountId(id);
    setIsViewModalOpen(true);
  };

  const handleEditCount = (id: string) => {
    setSelectedCountId(id);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedCountId(null);
    fetchCycleCounts();
  };

  const handleDeleteClick = (count: any) => {
    setCountToDelete(count);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!countToDelete) return;

    try {
      await axios.delete(`/api/modules/inventory-items/cycle-counts/${countToDelete.id}`);
      toast.success('Cycle count deleted successfully');
      setDeleteDialogOpen(false);
      setCountToDelete(null);
      fetchCycleCounts();
    } catch (error: any) {
      console.error('Error deleting cycle count:', error);
      toast.error(error.response?.data?.message || 'Failed to delete cycle count');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      created: 'default',
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cycle Count</h1>
          <p className="text-muted-foreground">Create and manage inventory cycle counts</p>
        </div>
        <Authorized roles="ADMIN" permissions="inventory-items.cycle-count.create">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Cycle Count
          </Button>
        </Authorized>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Created Cycle Counts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : cycleCounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cycle counts found. Create your first cycle count to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Count Number</TableHead>
                  <TableHead>Count Type</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycleCounts.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell className="font-medium">{count.countNumber}</TableCell>
                    <TableCell className="capitalize">{count.countType || 'Partial'}</TableCell>
                    <TableCell>
                      {count.scheduledDate 
                        ? format(new Date(count.scheduledDate), 'MMM dd, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(count.status)}</TableCell>
                    <TableCell>
                      {format(new Date(count.createdAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewCount(count.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Authorized roles="ADMIN" permissions="inventory-items.cycle-count.edit">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCount(count.id)}
                            title="Edit"
                            disabled={count.status !== 'created'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Authorized>
                        <Authorized roles="ADMIN" permissions="inventory-items.cycle-count.delete">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(count)}
                            title="Delete"
                            disabled={count.status !== 'created'}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </Authorized>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateCountModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />

      {selectedCountId && (
        <>
          <ViewCountModal
            open={isViewModalOpen}
            onOpenChange={setIsViewModalOpen}
            countId={selectedCountId}
          />
          <EditCountModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            countId={selectedCountId}
            onSuccess={handleEditSuccess}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cycle Count</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete cycle count{' '}
              <strong>{countToDelete?.countNumber}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default withModuleAuthorization(CycleCountCreate, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
