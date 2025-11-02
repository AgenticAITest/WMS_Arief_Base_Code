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
import { CreateSOModal } from '../components/CreateSOModal';
import { SOConfirmationModal } from '../components/SOConfirmationModal';
import { SOPrintView } from '../components/SOPrintView';
import axios from 'axios';
import { toast } from 'sonner';

const SalesOrderCreate: React.FC = () => {
  const [incompleteSOs, setIncompleteSOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [selectedSOData, setSelectedSOData] = useState<any>(null);
  const [createdSO, setCreatedSO] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [soToDelete, setSOToDelete] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);

  useEffect(() => {
    fetchIncompleteSOs();
    fetchCustomers();
    fetchShippingMethods();
  }, []);

  const fetchIncompleteSOs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/sales-order/sales-orders', {
        params: {
          page: 1,
          limit: 100,
        },
      });
      setIncompleteSOs(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching incomplete SOs:', error);
      toast.error('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/modules/master-data/customers', {
        params: { page: 1, limit: 1000 },
      });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchShippingMethods = async () => {
    try {
      const response = await axios.get('/api/modules/master-data/shipping-methods', {
        params: { page: 1, limit: 100 },
      });
      setShippingMethods(response.data.data || []);
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
    }
  };

  const enrichSOData = (soData: any) => {
    const customer = customers.find((c) => c.id === soData.customerId);
    const shippingMethod = shippingMethods.find((m) => m.id === soData.shippingMethodId);
    
    return {
      ...soData,
      customerName: customer?.name || 'N/A',
      shippingMethodName: shippingMethod?.name || null,
    };
  };

  const handleProceedToConfirm = (soData: any) => {
    const enrichedData = enrichSOData(soData);
    setSelectedSOData(enrichedData);
    setIsCreateModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSO = async (soData: any) => {
    try {
      const response = await axios.post('/api/modules/sales-order/sales-orders', soData);
      
      if (response.data.success) {
        toast.success('Sales Order created successfully');
        const enrichedCreatedSO = enrichSOData(response.data.data);
        setCreatedSO(enrichedCreatedSO);
        setIsConfirmModalOpen(false);
        setIsPrintViewOpen(true);
        fetchIncompleteSOs();
      } else {
        toast.error(response.data.message || 'Failed to create sales order');
        throw new Error(response.data.message || 'Failed to create sales order');
      }
    } catch (error: any) {
      console.error('Error creating SO:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create sales order';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handlePrintViewClose = () => {
    setIsPrintViewOpen(false);
    setCreatedSO(null);
    setSelectedSOData(null);
  };

  const viewSODetails = async (soId: string) => {
    try {
      const response = await axios.get(`/api/modules/sales-order/sales-orders/${soId}`);
      if (response.data.success) {
        const enrichedSO = enrichSOData(response.data.data);
        setCreatedSO(enrichedSO);
        setIsPrintViewOpen(true);
      }
    } catch (error) {
      toast.error('Failed to fetch SO details');
    }
  };

  const handleEditSO = async (soId: string) => {
    try {
      const response = await axios.get(`/api/modules/sales-order/sales-orders/${soId}`);
      if (response.data.success) {
        const soData = response.data.data;
        setSelectedSOData({
          id: soData.id,
          customerId: soData.customerId,
          shippingLocationId: soData.shippingLocationId,
          shippingMethodId: soData.shippingMethodId,
          orderDate: soData.orderDate,
          requestedDeliveryDate: soData.requestedDeliveryDate,
          trackingNumber: soData.trackingNumber,
          deliveryInstructions: soData.deliveryInstructions,
          notes: soData.notes,
          items: (soData.items || []).map((item: any) => ({
            productId: item.productId,
            sku: item.sku,
            name: item.productName,
            orderedQuantity: item.orderedQuantity,
            unitPrice: parseFloat(item.unitPrice),
          })),
        });
        setIsEditModalOpen(true);
      }
    } catch (error) {
      toast.error('Failed to fetch SO for editing');
    }
  };

  const handleUpdateSO = async (soData: any) => {
    try {
      const response = await axios.put(
        `/api/modules/sales-order/sales-orders/${selectedSOData.id}`,
        soData
      );

      if (response.data.success) {
        toast.success('Sales Order updated successfully');
        setIsConfirmModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedSOData(null);
        fetchIncompleteSOs();
      }
    } catch (error: any) {
      console.error('Error updating SO:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update sales order';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleDeleteClick = (so: any) => {
    setSOToDelete(so);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!soToDelete) return;

    try {
      const response = await axios.delete(
        `/api/modules/sales-order/sales-orders/${soToDelete.id}`
      );

      if (response.data.success) {
        toast.success('Sales Order deleted successfully');
        fetchIncompleteSOs();
      } else {
        toast.error('Failed to delete sales order');
      }
    } catch (error: any) {
      console.error('Error deleting SO:', error);
      toast.error(error.response?.data?.message || 'Failed to delete sales order');
    } finally {
      setDeleteDialogOpen(false);
      setSOToDelete(null);
    }
  };

  const handleEditProceedToConfirm = (soData: any) => {
    const enrichedData = enrichSOData({ ...soData, id: selectedSOData.id });
    setSelectedSOData(enrichedData);
    setIsEditModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmBack = () => {
    setIsConfirmModalOpen(false);
    if (selectedSOData?.id) {
      setIsEditModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Create Sales Order</h1>
          <p className="text-muted-foreground">
            Create and manage sales orders for customers
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Sales Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incomplete Sales Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : incompleteSOs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No incomplete sales orders found
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Requested Delivery</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incompleteSOs.map((so) => (
                    <TableRow key={so.id}>
                      <TableCell className="font-mono">{so.orderNumber}</TableCell>
                      <TableCell>{so.customerName || 'N/A'}</TableCell>
                      <TableCell>
                        {so.orderDate ? new Date(so.orderDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {so.requestedDeliveryDate
                          ? new Date(so.requestedDeliveryDate).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${so.totalAmount ? parseFloat(so.totalAmount).toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {so.status || 'created'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewSODetails(so.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSO(so.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(so)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      <CreateSOModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onProceedToConfirm={handleProceedToConfirm}
      />

      <CreateSOModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onProceedToConfirm={handleEditProceedToConfirm}
        initialData={selectedSOData}
        editMode={true}
      />

      <SOConfirmationModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        soData={selectedSOData || {}}
        onConfirm={selectedSOData?.id ? handleUpdateSO : handleConfirmSO}
        onBack={handleConfirmBack}
      />

      <SOPrintView
        open={isPrintViewOpen}
        onOpenChange={(open) => {
          if (!open) handlePrintViewClose();
        }}
        soData={createdSO || {}}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete sales order{' '}
              <span className="font-semibold">{soToDelete?.orderNumber}</span>. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default withModuleAuthorization(SalesOrderCreate, { 
  moduleId: 'sales-order',
  moduleName: 'Sales Order'
});
