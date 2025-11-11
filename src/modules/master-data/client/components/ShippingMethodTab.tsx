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
import { Card, CardContent } from '@client/components/ui/card';
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ShippingMethodDialog from './ShippingMethodDialog';
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
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<ShippingMethod | null>(null);

  useEffect(() => {
    fetchShippingMethods();
  }, [search]);

  const fetchShippingMethods = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/modules/master-data/shipping-methods', {
        params: { search, limit: 100 },
      });
      setShippingMethods(response.data.data || []);
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
      toast.error('Failed to fetch shipping methods');
    } finally {
      setLoading(false);
    }
  };

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
      fetchShippingMethods();
    } catch (error: any) {
      console.error('Error deleting shipping method:', error);
      toast.error(error.response?.data?.message || 'Failed to delete shipping method');
    } finally {
      setDeleteDialogOpen(false);
      setMethodToDelete(null);
    }
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedMethod(null);
    fetchShippingMethods();
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shipping methods..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchShippingMethods}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shipping Method
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading shipping methods...</div>
          ) : shippingMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shipping methods found. Click "Add Shipping Method" to create one.
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cost Method</TableHead>
                    <TableHead>Base Cost</TableHead>
                    <TableHead>Est. Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white dark:bg-gray-900">
                  {shippingMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell>
                        <code className="text-sm">{method.code}</code>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950/30 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                          {method.type}
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
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            method.isActive
                              ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {method.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(method)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(method)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
