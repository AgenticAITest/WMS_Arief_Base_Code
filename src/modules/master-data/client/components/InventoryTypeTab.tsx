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
import InventoryTypeDialog from './InventoryTypeDialog';
import DataPagination from '@client/components/console/DataPagination';
import SortButton from '@client/components/console/SortButton';
import InputGroup from '@client/components/console/InputGroup';
import { DebouncedInput } from '@client/components/DebouncedInput';

interface InventoryType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

const InventoryTypeTab = () => {
  const { user } = useAuth();
  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryType | null>(null);

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
      axios.get('/api/modules/master-data/product-types', {
        params: {
          page,
          perPage,
          sort,
          order,
          filter
        }
      })
        .then(response => {
          setInventoryTypes(response.data.productTypes || []);
          setCount(response.data.count || 0);
        })
        .catch(error => {
          console.error(error);
          toast.error(error.response?.data?.message || 'Failed to fetch product types');
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

  const handleEdit = (item: InventoryType) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: InventoryType) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      await axios.delete(`/api/modules/master-data/product-types/${deletingItem.id}`);
      toast.success('Inventory type deleted successfully');
      setLoading(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete inventory type');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setLoading(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Inventory Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage inventory type categories used for classification
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <InputGroup>
            {/* <Input
              placeholder="Search inventory types..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="h-8 px-1 w-60 max-w-sm border-0 focus-visible:ring-0 shadow-none dark:bg-input/0"
            /> */}
            <DebouncedInput
              value={filter}
              onChange={(value) => setFilter(String(value))}
              placeholder="Search inventory types..."
              debounce={500}
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
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory Type
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] py-2 text-center">#</TableHead>
              <TableHead>
                <SortButton label="Name" column="name" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <SortButton label="Category" column="category" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead>
                <SortButton label="Status" column="isActive" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead className="w-[60px] py-2 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : inventoryTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No inventory types found
                </TableCell>
              </TableRow>
            ) : (
              inventoryTypes.map((type, index) => (
                <TableRow key={type.id}>
                  <TableCell className="text-center">{(page - 1) * perPage + index + 1}</TableCell>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{type.description || '-'}</TableCell>
                  <TableCell>{type.category || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? 'default' : 'secondary'}>
                      {type.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type)}
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

      <InventoryTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the inventory type "{deletingItem?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryTypeTab;
