import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
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
import DataPagination from '@client/components/console/DataPagination';
import SortButton from '@client/components/console/SortButton';
import InputGroup from '@client/components/console/InputGroup';

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
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('code');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transporter | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Transporter | null>(null);

  function gotoPage(p: number) {
    if (p < 1 || (count !== 0 && p > Math.ceil(count / perPage))) return;
    setPage(p);
    setLoading(true);
  }

  function sortBy(column: string) {
    if (sort === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(column);
      setOrder('asc');
    }
  }

  function applyFilter() {
    setPage(1);
    setLoading(true);
  }

  function clearFilter() {
    setFilter('');
  }

  useEffect(() => {
    setPage(1);
    setLoading(true);
  }, [sort, order, filter]);

  useEffect(() => {
    if (loading) {
      axios.get('/api/modules/master-data/transporters', {
        params: {
          page,
          perPage,
          sort,
          order,
          filter
        }
      })
        .then(response => {
          setTransporters(response.data.transporters || []);
          setCount(response.data.count || 0);
        })
        .catch(error => {
          console.error(error);
          toast.error(error.response?.data?.message || 'Failed to fetch transporters');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [loading]);

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
      setLoading(true);
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
          <InputGroup>
            <Input
              placeholder="Search transporters..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="h-8 px-1 w-60 max-w-sm border-0 focus-visible:ring-0 shadow-none dark:bg-input/0"
            />
            {filter !== '' && (
              <X size={20} className="text-muted-foreground cursor-pointer mx-2 hover:text-foreground" 
                  onClick={clearFilter}/>
            )}
            {filter === '' && (
              <Search size={20} className="text-muted-foreground mx-2 hover:text-foreground" />
            )}
          </InputGroup>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transporter
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/20 font-semibold">
            <TableRow>
              <TableHead className="w-[50px] py-2 text-center">#</TableHead>
              <TableHead className="py-2">
                <SortButton column="name" label="Name" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">
                <SortButton column="code" label="Code" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">
                <SortButton column="contactPerson" label="Contact Person" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">
                <SortButton column="phone" label="Phone" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">
                <SortButton column="email" label="Email" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">Service Areas</TableHead>
              <TableHead className="py-2">Status</TableHead>
              <TableHead className="w-[60px] py-2 text-center">Actions</TableHead>
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
              transporters.map((transporter, i) => (
                <TableRow key={transporter.id}>
                  <TableCell className="text-center">{(page - 1) * perPage + i + 1}</TableCell>
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

      <DataPagination
        count={count}
        perPage={perPage}
        page={page}
        gotoPage={gotoPage}
      />

      <TransporterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        onSuccess={() => setLoading(true)}
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
