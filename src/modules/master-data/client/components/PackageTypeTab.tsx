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
import PackageTypeDialog from './PackageTypeDialog';
import DataPagination from '@client/components/console/DataPagination';
import SortButton from '@client/components/console/SortButton';
import InputGroup from '@client/components/console/InputGroup';
import { DebouncedInput } from '@client/components/DebouncedInput';
import Authorized from '@client/components/auth/Authorized';

interface PackageType {
  id: string;
  name: string;
  description: string | null;
  barcode: string | null;
  unitsPerPackage: number | null;
  weight: string | null;
  dimensions: string | null;
  isActive: boolean;
}

const PackageTypeTab = () => {
  const { user } = useAuth();
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackageType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PackageType | null>(null);


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
      axios.get('/api/modules/master-data/package-types', {
        params: {
          page,
          perPage,
          sort,
          order,
          filter
        }
      })
        .then(response => {
          setPackageTypes(response.data.packageTypes || []);
          setCount(response.data.count || 0);
        })
        .catch(error => {
          console.error(error);
          toast.error(error.response?.data?.message || 'Failed to fetch package types');
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

  const handleEdit = (item: PackageType) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: PackageType) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      await axios.delete(`/api/modules/master-data/package-types/${deletingItem.id}`);
      toast.success('Package type deleted successfully');
      setLoading(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete package type');
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
          <h2 className="text-lg font-semibold">Package Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage packaging types used for inventory items
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <InputGroup>
            {/* <Input
              placeholder="Search package types..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="h-8 px-1 w-60 max-w-sm border-0 focus-visible:ring-0 shadow-none dark:bg-input/0"
            /> */}
            <DebouncedInput
              value={filter}
              onChange={(value) => setFilter(String(value))}
              placeholder="Search package types..."
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
        <Authorized roles="ADMIN" permissions="master-data.create">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Package Type
          </Button>
        </Authorized>
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
                <SortButton label="Barcode" column="barcode" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead>
                <SortButton label="Units/Package" column="unitsPerPackage" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead>
                <SortButton label="Weight" column="weight" sort={sort} order={order} sortBy={sortBy}/>
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
                <TableCell colSpan={8} className="text-center py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : packageTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No package types found
                </TableCell>
              </TableRow>
            ) : (
              packageTypes.map((type, index) => (
                <TableRow key={type.id}>
                  <TableCell className="text-center">{(page - 1) * perPage + index + 1}</TableCell>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{type.description || '-'}</TableCell>
                  <TableCell>{type.barcode || '-'}</TableCell>
                  <TableCell>{type.unitsPerPackage || '-'}</TableCell>
                  <TableCell>{type.weight || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? 'default' : 'secondary'}>
                      {type.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Authorized roles="ADMIN" permissions="master-data.edit">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      </Authorized>
                      <Authorized roles="ADMIN" permissions="master-data.delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      </Authorized>
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

      <PackageTypeDialog
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
              This will permanently delete the package type "{deletingItem?.name}".
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

export default PackageTypeTab;
