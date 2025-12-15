import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, RefreshCw, Package, FileText } from 'lucide-react';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import DeliveryConfirmationModal from '../components/DeliveryConfirmationModal';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

interface SalesOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  requestedDeliveryDate: string | null;
  totalAmount: string;
  notes: string | null;
  deliveryInstructions: string | null;
  status: string;
  workflowState: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shipmentId: string;
  shipmentNumber: string;
  trackingNumber: string;
  shippingDate: string;
  packageCount: number;
  totalItems: string;
}

const SalesOrderDeliver: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDocumentPath, setViewDocumentPath] = useState<string | null>(null);
  const [viewDocumentNumber, setViewDocumentNumber] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  useEffect(() => {
    fetchDeliverableSalesOrders();
  }, []);

  const fetchDeliverableSalesOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/modules/sales-order/delivers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSalesOrders(response.data.data);
      } else {
        toast.error('Failed to fetch deliverable sales orders');
      }
    } catch (error: any) {
      console.error('Error fetching deliverable sales orders:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch deliverable sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDeliveryModalOpen(true);
  };

  const handleDeliverySuccess = (data: { deliveryNumber: string; documentPath: string }) => {
    setIsDeliveryModalOpen(false);
    toast.success(`Delivery ${data.deliveryNumber} confirmed successfully`);
    
    // View the generated document
    setViewDocumentPath(data.documentPath);
    setViewDocumentNumber(data.deliveryNumber);
    
    fetchDeliverableSalesOrders(); // Refresh the list
  };

  const handleViewDocument = (path: string, orderNumber: string) => {
    setViewDocumentPath(path);
    setViewDocumentNumber(orderNumber);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <div className="text-lg font-medium">Loading deliverable sales orders...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckCircle className="h-8 w-8" />
            Deliver Sales Orders
          </h1>
          <p className="text-muted-foreground">
            Confirm delivery and handle returns
          </p>
        </div>
        <Button onClick={fetchDeliverableSalesOrders} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {salesOrders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sales Orders Ready for Delivery</h3>
              <p className="text-muted-foreground">
                Sales orders will appear here once they are shipped and ready for delivery confirmation.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {salesOrders.map((so) => (
            <Card key={so.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      {so.orderNumber}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      Customer: {so.customerName}
                    </div>
                    {so.customerEmail && (
                      <div className="text-sm text-muted-foreground">
                        Email: {so.customerEmail}
                      </div>
                    )}
                    {so.customerPhone && (
                      <div className="text-sm text-muted-foreground">
                        Phone: {so.customerPhone}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="text-2xl font-bold">
                      ${parseFloat(so.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Order Date</div>
                    <div className="text-sm">
                      {new Date(so.orderDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Shipment Number</div>
                    <div className="text-sm font-mono">
                      {so.shipmentNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Tracking Number</div>
                    <div className="text-sm font-mono">
                      {so.trackingNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Shipping Date</div>
                    <div className="text-sm">
                      {new Date(so.shippingDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Total Packages</div>
                    <div className="text-sm flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {so.packageCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Total Items</div>
                    <div className="text-sm">
                      {parseFloat(so.totalItems).toFixed(0)} units
                    </div>
                  </div>
                </div>

                {so.deliveryInstructions && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Delivery Instructions
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">{so.deliveryInstructions}</div>
                  </div>
                )}

                {so.notes && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Notes</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{so.notes}</div>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button
                    onClick={() => handleConfirmDelivery(so.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Delivery
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOrderId && (
        <DeliveryConfirmationModal
          open={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          salesOrderId={selectedOrderId}
          onSuccess={handleDeliverySuccess}
        />
      )}

      {viewDocumentPath && (
        <DocumentViewerModal
          isOpen={!!viewDocumentPath}
          onClose={() => {
            setViewDocumentPath(null);
            setViewDocumentNumber(null);
          }}
          documentPath={viewDocumentPath}
          documentNumber={viewDocumentNumber || ''}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(SalesOrderDeliver, {
  moduleId: 'sales-order',
  moduleName: 'Sales Order'
});
