import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import ShippingMethodDialog from './ShippingMethodDialog';
import DataPagination from '@client/components/console/DataPagination';
import SortButton from '@client/components/console/SortButton';
import InputGroup from '@client/components/console/InputGroup';
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
import { DebouncedInput } from '@client/components/DebouncedInput';
import Authorized from '@client/components/auth/Authorized';
import { Badge } from '@client/components/ui/badge';

interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  type: string;
  transporterId?: string;
  costCalculationMethod: string;
  baseCost?: string;
  estimatedDays?: number;
  isActive: boolean;
  description?: string;
}

export default function ShippingMethodTab() {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('code');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<ShippingMethod | null>(null);

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
      axios.get('/api/modules/master-data/shipping-methods', {
        params: {
          page,
          perPage,
          sort,
          order,
          filter
        }
      })
        .then(response => {
          setShippingMethods(response.data.shippingMethods || []);
          setCount(response.data.count || 0);
        })
        .catch(error => {
          console.error(error);
          toast.error(error.response?.data?.message || 'Failed to fetch shipping methods');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [loading]);

  const handleCreate = () => {
    setSelectedMethod(null);
    setDialogOpen(true);
  };

  const handleEdit = (method: ShippingMethod) => {
    setSelectedMethod(method);
    setDialogOpen(true);
  };

  const handleDelete = (method: ShippingMethod) => {
    setMethodToDelete(method);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!methodToDelete) return;

    try {
      await axios.delete(`/api/modules/master-data/shipping-methods/${methodToDelete.id}`);
      toast.success('Shipping method deleted successfully');
      setLoading(true);
      setDeleteDialogOpen(false);
      setMethodToDelete(null);
    } catch (error: any) {
      console.error('Error deleting shipping method:', error);
      toast.error(error.response?.data?.message || 'Failed to delete shipping method');
    }
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedMethod(null);
    setLoading(true);
  };

  return (
    <>
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <InputGroup>
                {/* <Input
                  placeholder="Search shipping methods..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
                  className="h-8 px-1 w-60 max-w-sm border-0 focus-visible:ring-0 shadow-none dark:bg-input/0"
                /> */}
                <DebouncedInput
                  value={filter}
                  onChange={(value) => setFilter(String(value))}
                  placeholder="Search shipping methods..."
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
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shipping Method
            </Button>
            </Authorized>
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
                    <SortButton column="type" label="Type" sort={sort} order={order} sortBy={sortBy} />
                  </TableHead>
                  <TableHead className="py-2">
                    <SortButton column="costCalculationMethod" label="Cost Method" sort={sort} order={order} sortBy={sortBy} />
                  </TableHead>
                  <TableHead className="py-2">
                    <SortButton column="baseCost" label="Base Cost" sort={sort} order={order} sortBy={sortBy} />
                  </TableHead>
                  <TableHead className="py-2">
                    <SortButton column="estimatedDays" label="Est. Days" sort={sort} order={order} sortBy={sortBy} />
                  </TableHead>
                  <TableHead className="py-2">Status</TableHead>
                  <TableHead className="w-[60px] py-2 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : shippingMethods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No shipping methods found
                    </TableCell>
                  </TableRow>
                ) : (
                  shippingMethods.map((method, i) => ( (
                    <TableRow key={method.id}>
                      <TableCell className="text-center">{(page - 1) * perPage + i + 1}</TableCell>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell>
                        <code className="text-sm">{method.code}</code>
                      </TableCell>
                      <TableCell>
                        {/* <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950/30 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                          {method.type}
                        </span> */}
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            method.type === 'internal'
                              ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                              : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200'
                          }`}
                        >
                          {method.type === 'internal' ? 'Internal' : 'Third Party'}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">
                        {method.costCalculationMethod?.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        {method.baseCost ? `$${parseFloat(method.baseCost).toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {method.estimatedDays ? `${method.estimatedDays} days` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {/* <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            method.isActive
                              ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {method.isActive ? 'Active' : 'Inactive'}
                        </span> */}
                        <Badge variant={method.isActive ? 'default' : 'secondary'}>
                          {method.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Authorized roles="ADMIN" permissions="master-data.edit">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(method)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          </Authorized>
                          <Authorized roles="ADMIN" permissions="master-data.delete">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(method)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                          </Authorized>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            count={count}
            perPage={perPage}
            page={page}
            gotoPage={gotoPage}
          />
      </div>

      <ShippingMethodDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedMethod(null);
        }}
        onSuccess={handleSuccess}
        shippingMethod={selectedMethod}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the shipping method "{methodToDelete?.name}". This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMethodToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
