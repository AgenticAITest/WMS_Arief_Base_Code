import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { toast } from 'sonner';
import { Ship, RefreshCw, FileText } from 'lucide-react';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import ShipConfirmationModal from '../components/ShipConfirmationModal';
import { ShipPrintView } from '../components/ShipPrintView';

interface SOItem {
  id: string;
  lineNumber: number;
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: string;
  allocatedQuantity: string;
  pickedQuantity: string;
  unitPrice: string;
  totalPrice: string;
}

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
  shippingLocationId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  items: SOItem[];
}

const SalesOrderShip: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDocumentPath, setViewDocumentPath] = useState<string | null>(null);
  const [viewDocumentNumber, setViewDocumentNumber] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [shipData, setShipData] = useState<{ shipNumber: string; documentPath: string } | null>(null);

  useEffect(() => {
    fetchShippableSalesOrders();
  }, []);

  const fetchShippableSalesOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/modules/sales-order/ships', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSalesOrders(response.data.data);
      } else {
        toast.error('Failed to fetch shippable sales orders');
      }
    } catch (error: any) {
      console.error('Error fetching shippable sales orders:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch shippable sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleShipOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsShipModalOpen(true);
  };

  const handleShipSuccess = (data: { shipNumber: string; documentPath: string }) => {
    setIsShipModalOpen(false);
    setShipData(data);
    setIsPrintViewOpen(true);
    fetchShippableSalesOrders(); // Refresh the list
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
          <div className="text-lg font-medium">Loading shippable sales orders...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ship Sales Orders</h1>
          <p className="text-muted-foreground">
            Process packed orders for shipment
          </p>
        </div>
        <Button onClick={fetchShippableSalesOrders} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {salesOrders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Ship className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sales Orders Ready for Shipping</h3>
              <p className="text-muted-foreground">
                Sales orders will appear here once they are packed and ready to ship.
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
                      <Ship className="h-5 w-5 text-red-600" />
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Order Date</div>
                    <div className="text-sm">
                      {new Date(so.orderDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Requested Delivery
                    </div>
                    <div className="text-sm">
                      {so.requestedDeliveryDate
                        ? new Date(so.requestedDeliveryDate).toLocaleDateString()
                        : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <div className="text-sm">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        {so.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Workflow State
                    </div>
                    <div className="text-sm">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {so.workflowState}
                      </span>
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

                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">Order Items</h4>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            Line
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            Product
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            Ordered
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            Picked
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {so.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-sm">{item.lineNumber}</td>
                            <td className="px-3 py-2 text-sm font-mono">{item.sku}</td>
                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                            <td className="px-3 py-2 text-sm text-right">
                              {item.orderedQuantity}
                            </td>
                            <td className="px-3 py-2 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                              {item.pickedQuantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleShipOrder(so.id)}>
                    <Ship className="mr-2 h-4 w-4" />
                    Ship Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOrderId && (
        <ShipConfirmationModal
          isOpen={isShipModalOpen}
          onClose={() => setIsShipModalOpen(false)}
          salesOrderId={selectedOrderId}
          onSuccess={handleShipSuccess}
        />
      )}

      {shipData && (
        <ShipPrintView
          isOpen={isPrintViewOpen}
          onClose={() => {
            setIsPrintViewOpen(false);
            setShipData(null);
          }}
          shipNumber={shipData.shipNumber}
          documentPath={shipData.documentPath}
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
        />
      )}
    </div>
  );
};

export default SalesOrderShip;
