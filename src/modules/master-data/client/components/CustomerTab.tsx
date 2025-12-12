import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, MapPin, Search, X } from 'lucide-react';
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
import CustomerDialog from './CustomerDialog';
import DataPagination from '@client/components/console/DataPagination';
import SortButton from '@client/components/console/SortButton';
import InputGroup from '@client/components/console/InputGroup';
import { DebouncedInput } from '@client/components/DebouncedInput';

interface CustomerLocation {
  id: string;
  customerId: string;
  locationType: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isActive: boolean;
}

interface Customer {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  locationCount?: number;
  locations?: CustomerLocation[];
  isActive?: boolean;
}

const CustomerTab = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Customer | null>(null);

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
      axios.get('/api/modules/master-data/customers', {
        params: {
          page,
          perPage,
          sort,
          order,
          filter
        }
      })
        .then(response => {
          setCustomers(response.data.customers || []);
          setCount(response.data.count || 0);
        })
        .catch(error => {
          console.error(error);
          toast.error(error.response?.data?.message || 'Failed to fetch customers');
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

  const handleEdit = async (item: Customer) => {
    try {
      const response = await axios.get(`/api/modules/master-data/customers/${item.id}`);
      setEditingItem(response.data.data);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch customer details');
    }
  };

  const handleDelete = (item: Customer) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      await axios.delete(`/api/modules/master-data/customers/${deletingItem.id}`);
      toast.success('Customer deleted successfully');
      setLoading(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
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
          <h2 className="text-lg font-semibold">Customer Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage customers and their delivery locations
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <InputGroup>
            {/* <Input
              placeholder="Search customers..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              className="h-8 px-1 w-60 max-w-sm border-0 focus-visible:ring-0 shadow-none dark:bg-input/0"
            /> */}
            <DebouncedInput
              value={filter}
              onChange={(value) => setFilter(String(value))}
              placeholder="Search customers..."
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
          Add Customer
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] py-2 text-center">#</TableHead>
              <TableHead>
                <SortButton label="Customer" column="name" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead>
                <SortButton label="Code" column="taxId" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead>
                <SortButton label="Contact" column="contactPerson" sort={sort} order={order} sortBy={sortBy}/>
              </TableHead>
              <TableHead>Delivery Locations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px] py-2 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell className="text-center">{(page - 1) * perPage + index + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      {customer.contactPerson && (
                        <span className="text-sm text-muted-foreground">
                          {customer.contactPerson}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{customer.taxId || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {customer.email && (
                        <span className="text-sm">{customer.email}</span>
                      )}
                      {customer.phone && (
                        <span className="text-sm text-muted-foreground">
                          {customer.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {customer.locationCount || 0} location{customer.locationCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive !== false ? 'default' : 'secondary'}>
                      {customer.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(customer)}
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

      <CustomerDialog
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
              This will permanently delete the customer "{deletingItem?.name}" and all associated locations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerTab;
