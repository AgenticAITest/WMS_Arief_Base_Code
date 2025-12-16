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
import ProductDialog from './ProductDialog';
import DataPagination from '@client/components/console/DataPagination';
import SortButton from '@client/components/console/SortButton';
import InputGroup from '@client/components/console/InputGroup';
import { DebouncedInput } from '@client/components/DebouncedInput';
import Authorized from '@client/components/auth/Authorized';

interface Product {
  id: string;
  sku: string;
  name: string;
  inventoryTypeId: string | null;
  packageTypeId: string | null;
  weight: string | null;
  dimensions: string | null;
  minimumStockLevel: number | null;
  hasExpiryDate: boolean;
  active: boolean;
  productType?: {
    name: string;
  };
  packageType?: {
    name: string;
  };
}

const ProductTab = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('sku');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Product | null>(null);

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
      axios.get('/api/modules/master-data/products', {
        params: {
          page,
          perPage,
          sort,
          order,
          filter
        }
      })
        .then(response => {
          setProducts(response.data.products || []);
          setCount(response.data.count || 0);
        })
        .catch(error => {
          console.error(error);
          toast.error(error.response?.data?.message || 'Failed to fetch products');
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

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: Product) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      await axios.delete(`/api/modules/master-data/products/${deletingItem.id}`);
      toast.success('Product deleted successfully');
      setLoading(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
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
    <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Inventory Items</h2>
          <p className="text-sm text-muted-foreground">
            Manage your inventory master data
          </p>
        </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <InputGroup>
            {/* <Input
              placeholder="Search products..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="h-8 px-1 w-60 max-w-sm border-0 focus-visible:ring-0 shadow-none dark:bg-input/0"
            /> */}
            <DebouncedInput
              value={filter}
              onChange={(value) => setFilter(String(value))}
              placeholder="Search products..."
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
            <Plus className="mr-2 h-4 w-4" />
            Add Inventory Item
          </Button>
        </Authorized>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/20 font-semibold">
            <TableRow>
              <TableHead className="w-[50px] py-2 text-center">#</TableHead>
              <TableHead className="py-2">
                <SortButton column="sku" label="SKU" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">
                <SortButton column="name" label="Item Name" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">Type</TableHead>
              <TableHead className="py-2">Package</TableHead>
              <TableHead className="py-2">
                <SortButton column="weight" label="Size/Weight" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">
                <SortButton column="minimumStockLevel" label="Min Stock" sort={sort} order={order} sortBy={sortBy} />
              </TableHead>
              <TableHead className="py-2">Expiry</TableHead>
              <TableHead className="py-2">Status</TableHead>
              <TableHead className="w-[60px] py-2 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, i) => (
                <TableRow key={product.id}>
                  <TableCell className="text-center">{(page - 1) * perPage + i + 1}</TableCell>
                  <TableCell className="font-medium">{product.sku}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.productType?.name || '-'}</TableCell>
                  <TableCell>{product.packageType?.name || '-'}</TableCell>
                  <TableCell>
                    {product.weight || product.dimensions
                      ? `${product.weight || ''} ${product.dimensions || ''}`.trim()
                      : '-'}
                  </TableCell>
                  <TableCell>{product.minimumStockLevel || '-'}</TableCell>
                  <TableCell>
                    {product.hasExpiryDate ? 'Has Expiry' : 'No Expiry'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.active ? 'default' : 'secondary'}>
                      {product.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Authorized roles="ADMIN" permissions="master-data.edit">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      </Authorized>
                      <Authorized roles="ADMIN" permissions="master-data.delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product)}
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

      <ProductDialog
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
              This will permanently delete the product "{deletingItem?.name}".
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

export default ProductTab;
