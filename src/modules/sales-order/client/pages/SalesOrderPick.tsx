import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { toast } from 'sonner';
import { Package, RefreshCw, FileText, MapPin } from 'lucide-react';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import PickConfirmationModal from '../components/PickConfirmationModal';

interface Allocation {
  allocationId: string;
  inventoryItemId: string;
  allocatedQuantity: string;
  batchNumber: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  receivedDate: string;
  binId: string;
  binName: string;
  shelfId: string;
  shelfName: string;
  aisleId: string;
  aisleName: string;
  zoneId: string;
  zoneName: string;
  warehouseId: string;
  warehouseName: string;
}

interface SOItem {
  id: string;
  lineNumber: number;
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: string;
  allocatedQuantity: string;
  pickedQuantity: string;
  hasExpiryDate: boolean;
  unitPrice: string;
  totalPrice: string;
  allocations: Allocation[];
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
  documentPath: string | null;
  items: SOItem[];
}

const SalesOrderPick: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDocumentPath, setViewDocumentPath] = useState<string | null>(null);
  const [viewDocumentNumber, setViewDocumentNumber] = useState<string | null>(null);
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchPickableOrders();
  }, []);

  const fetchPickableOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/sales-order/picks');
      setSalesOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pickable orders:', error);
      toast.error('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (path: string, orderNumber: string) => {
    setViewDocumentPath(path);
    setViewDocumentNumber(orderNumber);
  };

  const handleCloseDocumentViewer = () => {
    setViewDocumentPath(null);
    setViewDocumentNumber(null);
  };

  const handlePick = (orderId: string) => {
    setConfirmOrderId(orderId);
  };

  const handleConfirmClose = () => {
    setConfirmOrderId(null);
    fetchPickableOrders();
  };

  const confirmOrder = confirmOrderId
    ? salesOrders.find(order => order.id === confirmOrderId) || null
    : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Order - Pick Items</h1>
            <p className="text-muted-foreground mt-1">
              Pick items from allocated sales orders
            </p>
          </div>
          <Button onClick={fetchPickableOrders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : salesOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No sales orders ready for picking</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sales orders will appear here once they are allocated
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {salesOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          SO: {order.orderNumber}
                        </CardTitle>
                        {order.documentPath && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(order.documentPath!, order.orderNumber)}
                            title="View Sales Order Document"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customer: {order.customerName} | Order Date: {new Date(order.orderDate).toLocaleDateString()} | Total: ${parseFloat(order.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <Button onClick={() => handlePick(order.id)}>
                      Confirm Pick
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {order.items.map((item) => (
                      <div key={item.id} className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Allocated Qty</p>
                            <p className="text-lg font-semibold">{item.allocatedQuantity}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>Pick Locations ({item.hasExpiryDate ? 'FEFO' : 'FIFO'} Order)</span>
                          </div>
                          <div className="border rounded-md">
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Warehouse</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Zone</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Aisle</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Shelf</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Bin</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Batch/Lot</th>
                                  {item.hasExpiryDate && (
                                    <th className="px-3 py-2 text-left text-xs font-medium">Expiry Date</th>
                                  )}
                                  <th className="px-3 py-2 text-right text-xs font-medium">Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.allocations.map((allocation, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="px-3 py-2 text-sm">{allocation.warehouseName}</td>
                                    <td className="px-3 py-2 text-sm">{allocation.zoneName}</td>
                                    <td className="px-3 py-2 text-sm">{allocation.aisleName}</td>
                                    <td className="px-3 py-2 text-sm">{allocation.shelfName}</td>
                                    <td className="px-3 py-2 text-sm font-medium">{allocation.binName}</td>
                                    <td className="px-3 py-2 text-sm">
                                      {allocation.batchNumber || allocation.lotNumber || '-'}
                                    </td>
                                    {item.hasExpiryDate && (
                                      <td className="px-3 py-2 text-sm">
                                        {allocation.expiryDate 
                                          ? new Date(allocation.expiryDate).toLocaleDateString()
                                          : '-'
                                        }
                                      </td>
                                    )}
                                    <td className="px-3 py-2 text-sm text-right font-medium">
                                      {allocation.allocatedQuantity}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
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
        <PickConfirmationModal
          isOpen={confirmOrderId !== null}
          onClose={handleConfirmClose}
          salesOrder={confirmOrder}
        />
      )}

      {viewDocumentPath && (
        <DocumentViewerModal
          isOpen={viewDocumentPath !== null}
          onClose={handleCloseDocumentViewer}
          documentPath={viewDocumentPath}
          documentNumber={viewDocumentNumber || undefined}
        />
      )}
    </>
  );
};

export default SalesOrderPick;
