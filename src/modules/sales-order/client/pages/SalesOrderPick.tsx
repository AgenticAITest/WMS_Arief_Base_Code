import React, { useState, useEffect, useReducer } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { toast } from 'sonner';
import { Package, RefreshCw, FileText, MapPin, Check } from 'lucide-react';
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

interface PickQuantities {
  [itemId: string]: {
    [allocationId: string]: number;
  };
}

type PickAction = 
  | { type: 'SET_QUANTITY'; itemId: string; allocationId: string; quantity: number }
  | { type: 'RESET' };

function pickReducer(state: PickQuantities, action: PickAction): PickQuantities {
  switch (action.type) {
    case 'SET_QUANTITY':
      return {
        ...state,
        [action.itemId]: {
          ...state[action.itemId],
          [action.allocationId]: action.quantity,
        },
      };
    case 'RESET':
      return {};
    default:
      return state;
  }
}

const SalesOrderPick: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDocumentPath, setViewDocumentPath] = useState<string | null>(null);
  const [viewDocumentNumber, setViewDocumentNumber] = useState<string | null>(null);
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);
  const [pickQuantities, dispatch] = useReducer(pickReducer, {});

  useEffect(() => {
    fetchPickableOrders();
  }, []);

  const fetchPickableOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/sales-order/picks');
      setSalesOrders(response.data.data || []);
      dispatch({ type: 'RESET' });
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

  const handleQuantityChange = (itemId: string, allocationId: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      dispatch({ type: 'SET_QUANTITY', itemId, allocationId, quantity: numValue });
    }
  };

  const getPickedTotal = (itemId: string): number => {
    const itemPicks = pickQuantities[itemId] || {};
    return Object.values(itemPicks).reduce((sum, qty) => sum + qty, 0);
  };

  const getLocationPath = (allocation: Allocation): string => {
    return `${allocation.warehouseName} > ${allocation.zoneName} > ${allocation.aisleName} > ${allocation.shelfName} > ${allocation.binName}`;
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
                    {order.items.map((item) => {
                      const pickedTotal = getPickedTotal(item.id);
                      const orderedQty = parseFloat(item.orderedQuantity);
                      const isComplete = pickedTotal === orderedQty;
                      const isPartial = pickedTotal > 0 && pickedTotal < orderedQty;
                      const isOver = pickedTotal > orderedQty;

                      return (
                        <div key={item.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-semibold text-lg">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                              </div>
                              <div className={`flex items-center gap-2 px-3 py-1 rounded-md font-semibold ${
                                isComplete ? 'bg-green-100 text-green-700' :
                                isOver ? 'bg-red-100 text-red-700' :
                                isPartial ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {isComplete && <Check className="w-4 h-4" />}
                                <span>{pickedTotal}/{orderedQty}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span>{item.hasExpiryDate ? 'FEFO Order' : 'FIFO Order'}</span>
                            </div>
                          </div>

                          <div className="border-t">
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 border-b">
                              <div className="col-span-5 text-xs font-semibold text-muted-foreground uppercase">
                                Location
                              </div>
                              <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-center">
                                Available Qty
                              </div>
                              <div className="col-span-3 text-xs font-semibold text-muted-foreground uppercase">
                                Pick Qty
                              </div>
                              <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">
                                Action
                              </div>
                            </div>

                            {item.allocations.map((allocation, idx) => {
                              const currentPick = pickQuantities[item.id]?.[allocation.allocationId] || 0;
                              const availableQty = parseFloat(allocation.allocatedQuantity);

                              return (
                                <div key={idx} className="px-4 py-3 hover:bg-muted/20 transition-colors border-b last:border-b-0">
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-5">
                                      <p className="font-semibold text-base mb-1">
                                        {allocation.binName}
                                      </p>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {allocation.warehouseName} &gt; {allocation.zoneName} &gt; {allocation.aisleName} &gt; {allocation.shelfName}
                                      </p>
                                      {(allocation.batchNumber || allocation.lotNumber || allocation.expiryDate) && (
                                        <div className="flex gap-3 mt-2">
                                          {(allocation.batchNumber || allocation.lotNumber) && (
                                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                                              {allocation.batchNumber ? `Batch: ${allocation.batchNumber}` : `Lot: ${allocation.lotNumber}`}
                                            </span>
                                          )}
                                          {allocation.expiryDate && (
                                            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                                              Exp: {new Date(allocation.expiryDate).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="col-span-2 text-center">
                                      <p className="text-base font-semibold">{availableQty}</p>
                                    </div>

                                    <div className="col-span-3">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={availableQty}
                                        step="0.01"
                                        value={currentPick || ''}
                                        onChange={(e) => handleQuantityChange(item.id, allocation.allocationId, e.target.value)}
                                        placeholder="0"
                                        className="h-9"
                                      />
                                    </div>

                                    <div className="col-span-2 flex justify-end">
                                      <Button
                                        size="sm"
                                        variant={currentPick > 0 ? "default" : "outline"}
                                        disabled={currentPick <= 0 || currentPick > availableQty}
                                        onClick={() => {
                                          toast.success(`Picked ${currentPick} units from ${allocation.binName}`);
                                        }}
                                      >
                                        Pick
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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
