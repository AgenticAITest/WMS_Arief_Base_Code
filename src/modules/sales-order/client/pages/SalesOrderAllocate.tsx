import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { toast } from 'sonner';
import { Package, RefreshCw } from 'lucide-react';
import AllocationConfirmationModal from '../components/AllocationConfirmationModal';

interface SOItem {
  id: string;
  lineNumber: number;
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: string;
  allocatedQuantity: string;
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
  status: string;
  workflowState: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  items: SOItem[];
}

const SalesOrderAllocate: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllocatableOrders();
  }, []);

  const fetchAllocatableOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/sales-order/allocations');
      setSalesOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching allocatable orders:', error);
      toast.error('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = (orderId: string) => {
    setConfirmOrderId(orderId);
  };

  const handleConfirmClose = (success: boolean) => {
    setConfirmOrderId(null);
    if (success) {
      fetchAllocatableOrders();
    }
  };

  const confirmOrder = salesOrders.find(so => so.id === confirmOrderId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sales Orders Ready for Allocation</h1>
            <p className="text-muted-foreground">
              Allocate inventory to sales orders
            </p>
          </div>
          <Button onClick={fetchAllocatableOrders} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {salesOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No sales orders ready for allocation</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {salesOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        SO: {order.orderNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customer: {order.customerName} | Order Date: {new Date(order.orderDate).toLocaleDateString()} | Total: ${parseFloat(order.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <Button onClick={() => handleAllocate(order.id)}>
                      Allocate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">SKU</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Product</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Ordered Qty</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Unit Price</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-2 text-sm">{item.sku}</td>
                            <td className="px-4 py-2 text-sm font-medium">{item.productName}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.orderedQuantity}</td>
                            <td className="px-4 py-2 text-sm text-right">${parseFloat(item.unitPrice).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium">${parseFloat(item.totalPrice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {order.notes && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {order.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {confirmOrder && (
        <AllocationConfirmationModal
          isOpen={confirmOrderId !== null}
          onClose={handleConfirmClose}
          salesOrder={confirmOrder}
        />
      )}
    </>
  );
};

export default SalesOrderAllocate;
