import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@client/provider/AuthProvider';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Input } from '@client/components/ui/input';
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
import TransporterDialog from './TransporterDialog';

interface Transporter {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  serviceAreas: string[] | null;
  isActive: boolean;
  notes: string | null;
}

const TransporterTab = () => {
  const { user } = useAuth();
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transporter | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Transporter | null>(null);

  const fetchTransporters = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/master-data/transporters', {
        params: {
          page: 1,
          limit: 100,
          search: searchTerm || undefined,
        },
      });
      setTransporters(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch transporters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransporters();
  }, [searchTerm]);

  const handleAdd = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Transporter) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDeleteClick = (item: Transporter) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      await axios.delete(`/api/modules/master-data/transporters/${deletingItem.id}`);
      toast.success('Transporter deleted successfully');
      fetchTransporters();
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete transporter');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Search transporters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transporter
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Service Areas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : transporters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No transporters found
                </TableCell>
              </TableRow>
            ) : (
              transporters.map((transporter) => (
                <TableRow key={transporter.id}>
                  <TableCell className="font-medium">{transporter.name}</TableCell>
                  <TableCell>{transporter.code}</TableCell>
                  <TableCell>{transporter.contactPerson || '-'}</TableCell>
                  <TableCell>{transporter.phone || '-'}</TableCell>
                  <TableCell>{transporter.email || '-'}</TableCell>
                  <TableCell>
                    {transporter.serviceAreas && transporter.serviceAreas.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {transporter.serviceAreas.slice(0, 2).map((area, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                        {transporter.serviceAreas.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{transporter.serviceAreas.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transporter.isActive ? 'default' : 'secondary'}>
                      {transporter.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(transporter)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(transporter)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TransporterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        onSuccess={fetchTransporters}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transporter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransporterTab;
