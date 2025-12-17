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
import { CreatePOModal } from '../components/CreatePOModal';
import { POConfirmationModal } from '../components/POConfirmationModal';
import { POPrintView } from '../components/POPrintView';
import axios from 'axios';
import { toast } from 'sonner';
import Authorized from '@client/components/auth/Authorized';

const PurchaseOrderCreate: React.FC = () => {
  const [unapprovedPOs, setUnapprovedPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [selectedPOData, setSelectedPOData] = useState<any>(null);
  const [createdPO, setCreatedPO] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPOToDelete] = useState<any>(null);

  useEffect(() => {
    fetchUnapprovedPOs();
  }, []);

  const fetchUnapprovedPOs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/purchase-order/orders', {
        params: {
          status: 'pending',
          page: 1,
          limit: 100,
        },
      });
      setUnapprovedPOs(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching unapproved POs:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToConfirm = (poData: any) => {
    setSelectedPOData(poData);
    setIsCreateModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPO = async (poData: any) => {
    try {
      const response = await axios.post('/api/modules/purchase-order/orders', poData);
      
      if (response.data.success) {
        toast.success('Purchase Order created successfully');
        setCreatedPO(response.data.data);
        setIsConfirmModalOpen(false);
        setIsPrintViewOpen(true);
        fetchUnapprovedPOs();
      } else {
        toast.error(response.data.message || 'Failed to create purchase order');
        throw new Error(response.data.message || 'Failed to create purchase order');
      }
    } catch (error: any) {
      console.error('Error creating PO:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create purchase order';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handlePrintViewClose = () => {
    setIsPrintViewOpen(false);
    setCreatedPO(null);
    setSelectedPOData(null);
  };

  const viewPODetails = async (poId: string) => {
    try {
      const response = await axios.get(`/api/modules/purchase-order/orders/${poId}`);
      if (response.data.success) {
        setCreatedPO(response.data.data);
        setIsPrintViewOpen(true);
      }
    } catch (error) {
      toast.error('Failed to fetch PO details');
    }
  };

  const handleEditPO = async (poId: string) => {
    try {
      const response = await axios.get(`/api/modules/purchase-order/orders/${poId}`);
      if (response.data.success) {
        const poData = response.data.data;
        // Transform PO data to match CreatePOModal format
        setSelectedPOData({
          supplierId: poData.supplierId,
          supplierLocationId: poData.supplierLocationId,
          deliveryMethod: poData.deliveryMethod,
          warehouseId: poData.warehouseId,
          expectedDeliveryDate: poData.expectedDeliveryDate,
          notes: poData.notes,
          items: poData.items.map((item: any) => ({
            productId: item.productId,
            sku: item.productSku, // Include SKU for display
            name: item.productName, // Include name for display
            orderedQuantity: item.orderedQuantity,
            unitCost: parseFloat(item.unitCost || 0), // Parse to number
            expectedExpiryDate: item.expectedExpiryDate,
            notes: item.notes,
          })),
          editMode: true,
          editId: poId,
        });
        setIsEditModalOpen(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch PO details';
      toast.error(errorMessage);
    }
  };

  const handleUpdatePO = async (poData: any) => {
    try {
      const response = await axios.put(
        `/api/modules/purchase-order/orders/${poData.editId}`,
        {
          supplierId: poData.supplierId,
          supplierLocationId: poData.supplierLocationId,
          deliveryMethod: poData.deliveryMethod,
          warehouseId: poData.warehouseId,
          expectedDeliveryDate: poData.expectedDeliveryDate,
          notes: poData.notes,
          items: poData.items, // Include items for editing
        }
      );

      if (response.data.success) {
        toast.success('Purchase Order updated successfully');
        setIsEditModalOpen(false);
        setSelectedPOData(null);
        fetchUnapprovedPOs();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update purchase order';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleDeleteClick = (po: any) => {
    setPOToDelete(po);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!poToDelete) return;

    try {
      await axios.delete(`/api/modules/purchase-order/orders/${poToDelete.id}`);
      toast.success(`Purchase Order ${poToDelete.orderNumber} deleted successfully`);
      setDeleteDialogOpen(false);
      setPOToDelete(null);
      fetchUnapprovedPOs();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete purchase order';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Create Purchase Order</h1>
          <p className="text-muted-foreground">
            Manage and create new purchase orders
          </p>
        </div>
        <Authorized roles="ADMIN" permissions="purchase-order.create">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New PO
          </Button>
        </Authorized>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unapproved Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unapprovedPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No unapproved purchase orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  unapprovedPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.orderNumber}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>${parseFloat(po.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                          Pending Approval
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewPODetails(po.id)}
                            title="View PO"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Authorized roles="ADMIN" permissions="purchase-order.edit">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPO(po.id)}
                              title="Edit PO"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Authorized>
                          <Authorized roles="ADMIN" permissions="purchase-order.delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(po)}
                              title="Delete PO"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Authorized>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreatePOModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onProceedToConfirm={handleProceedToConfirm}
      />

      <CreatePOModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onProceedToConfirm={handleUpdatePO}
        initialData={selectedPOData}
        editMode={true}
      />

      <POConfirmationModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        poData={selectedPOData}
        onConfirm={handleConfirmPO}
        onBack={() => {
          setIsConfirmModalOpen(false);
          setIsCreateModalOpen(true);
        }}
      />

      <POPrintView
        open={isPrintViewOpen}
        onOpenChange={setIsPrintViewOpen}
        poData={createdPO}
        onClose={handlePrintViewClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete purchase order{' '}
              <span className="font-semibold">{poToDelete?.orderNumber}</span>?
              This action cannot be undone. All items and generated documents will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPOToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default withModuleAuthorization(PurchaseOrderCreate, {
  moduleId: 'purchase-order',
  moduleName: 'Purchase Order'
});
