import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Textarea } from '@client/components/ui/textarea';
import { Checkbox } from '@client/components/ui/checkbox';
import { Badge } from '@client/components/ui/badge';
import { Calendar } from '@client/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@client/components/ui/popover';
import { RefreshCw, Package, AlertTriangle, CalendarIcon, CheckCircle } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@client/lib/utils';

interface PO {
  id: string;
  orderNumber: string;
  orderDate: string;
  supplierName: string;
  warehouseName: string;
  status: string;
  totalAmount: string;
  items: POItem[];
}

interface POItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    hasExpiry: boolean;
  };
  orderedQuantity: number;
  receivedQuantity: number;
  expectedExpiryDate?: string | null;
  discrepancyNote?: string | null;
}

interface ReceivedItem {
  itemId: string;
  receivedQuantity: number;
  expiryDate?: string;
  discrepancyNote?: string;
  confirmed: boolean;
}

const PurchaseOrderReceive: React.FC = () => {
  const [approvedPOs, setApprovedPOs] = useState<PO[]>([]);
  const [incompletePOs, setIncompletePOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track received items for each PO
  const [receivedItems, setReceivedItems] = useState<Record<string, Record<string, ReceivedItem>>>({});
  
  // Track which POs are being submitted
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchReceivableOrders();
  }, []);

  const fetchReceivableOrders = async () => {
    try {
      setLoading(true);
      const [approvedResponse, incompleteResponse] = await Promise.all([
        axios.get('/api/modules/purchase-order/receive/approved'),
        axios.get('/api/modules/purchase-order/receive/incomplete'),
      ]);
      
      setApprovedPOs(approvedResponse.data.data || []);
      setIncompletePOs(incompleteResponse.data.data || []);
      
      // Initialize received items for approved POs (prepopulate with ordered quantities)
      const initialReceived: Record<string, Record<string, ReceivedItem>> = {};
      approvedResponse.data.data?.forEach((po: PO) => {
        initialReceived[po.id] = {};
        po.items.forEach(item => {
          initialReceived[po.id][item.id] = {
            itemId: item.id,
            receivedQuantity: item.orderedQuantity,
            confirmed: false,
          };
        });
      });
      
      // Initialize for incomplete POs (start with 0 additional quantity)
      incompleteResponse.data.data?.forEach((po: PO) => {
        initialReceived[po.id] = {};
        po.items.forEach(item => {
          initialReceived[po.id][item.id] = {
            itemId: item.id,
            receivedQuantity: 0,
            confirmed: false,
          };
        });
      });
      
      setReceivedItems(initialReceived);
    } catch (error: any) {
      console.error('Error fetching receivable orders:', error);
      toast.error('Failed to fetch receivable orders');
    } finally {
      setLoading(false);
    }
  };

  const updateReceivedItem = (poId: string, itemId: string, field: keyof ReceivedItem, value: any) => {
    setReceivedItems(prev => ({
      ...prev,
      [poId]: {
        ...prev[poId],
        [itemId]: {
          ...prev[poId][itemId],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmitReceipt = async (po: PO, isIncomplete: boolean = false) => {
    const poItems = receivedItems[po.id];
    if (!poItems) {
      toast.error('No items to receive');
      return;
    }

    // Validate all items are confirmed
    const itemsList = Object.values(poItems);
    const unconfirmed = itemsList.filter(item => !item.confirmed);
    if (unconfirmed.length > 0) {
      toast.error('Please confirm all items before submitting');
      return;
    }

    // Validate quantities
    const itemsToReceive = []; // Filter out items with zero additional qty
    for (const item of itemsList) {
      const poItem = po.items.find(i => i.id === item.itemId);
      if (!poItem) continue;

      const totalReceived = isIncomplete 
        ? poItem.receivedQuantity + item.receivedQuantity
        : item.receivedQuantity;

      if (totalReceived > poItem.orderedQuantity) {
        toast.error(`Received quantity for ${poItem.product.name} exceeds ordered quantity`);
        return;
      }

      // Allow zero quantity for items already fully received (incomplete POs)
      if (item.receivedQuantity < 1) {
        if (isIncomplete && poItem.receivedQuantity >= poItem.orderedQuantity) {
          continue; // Item already fully received, skip it
        }
        toast.error(`Please enter a valid received quantity for ${poItem.product.name}`);
        return;
      }

      itemsToReceive.push(item);
    }

    if (itemsToReceive.length === 0) {
      toast.error('No items to receive');
      return;
    }

    try {
      setSubmitting(prev => ({ ...prev, [po.id]: true }));
      
      const response = await axios.post(`/api/modules/purchase-order/receive/${po.id}/submit`, {
        items: itemsToReceive.map(item => ({
          itemId: item.itemId,
          receivedQuantity: item.receivedQuantity,
          expiryDate: item.expiryDate || null,
          discrepancyNote: item.discrepancyNote || null,
        })),
        notes: null,
      });

      if (response.data.success) {
        toast.success(`Receipt submitted successfully. GRN ${response.data.data.grnNumber} generated.`);
        fetchReceivableOrders();
      }
    } catch (error: any) {
      console.error('Error submitting receipt:', error);
      toast.error(error.response?.data?.message || 'Failed to submit receipt');
    } finally {
      setSubmitting(prev => ({ ...prev, [po.id]: false }));
    }
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderPOTable = (pos: PO[], isIncomplete: boolean = false) => {
    if (pos.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-lg">
            {isIncomplete 
              ? 'No incomplete purchase orders to receive.' 
              : 'No approved purchase orders awaiting receipt.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {pos.map(po => {
          const poItems = receivedItems[po.id] || {};
          const allConfirmed = po.items.every(item => poItems[item.id]?.confirmed);
          const isSubmittingThis = submitting[po.id];

          return (
            <Card key={po.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {po.orderNumber}
                      <Badge variant={isIncomplete ? 'secondary' : 'default'}>
                        {isIncomplete ? 'Incomplete' : 'Ready to Receive'}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <p><strong>Supplier:</strong> {po.supplierName}</p>
                      <p><strong>Warehouse:</strong> {po.warehouseName}</p>
                      <p><strong>Order Date:</strong> {format(new Date(po.orderDate), 'PPP')}</p>
                      <p><strong>Total Amount:</strong> {formatCurrency(po.totalAmount)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSubmitReceipt(po, isIncomplete)}
                    disabled={!allConfirmed || isSubmittingThis}
                    className="min-w-[180px]"
                  >
                    {isSubmittingThis ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Submit Receipt for {po.orderNumber}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {po.items.map(item => {
                    const received = poItems[item.id];
                    const totalReceived = isIncomplete 
                      ? item.receivedQuantity + (received?.receivedQuantity || 0)
                      : (received?.receivedQuantity || 0);
                    const remaining = item.orderedQuantity - (isIncomplete ? item.receivedQuantity : 0);
                    const hasDiscrepancy = received && received.receivedQuantity < remaining;

                    return (
                      <div key={item.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{item.product.name}</h4>
                            <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                          </div>
                          {received?.confirmed && (
                            <Badge variant="default">Confirmed</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <label className="text-sm font-medium">Ordered Qty</label>
                            <Input 
                              value={item.orderedQuantity} 
                              disabled 
                              className="bg-muted" 
                            />
                          </div>

                          {isIncomplete && (
                            <div>
                              <label className="text-sm font-medium">Received Qty</label>
                              <Input 
                                value={item.receivedQuantity} 
                                disabled 
                                className="bg-muted" 
                              />
                            </div>
                          )}

                          <div>
                            <label className="text-sm font-medium">
                              {isIncomplete ? 'Additional Qty' : 'Received Qty'}
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max={remaining}
                              value={received?.receivedQuantity || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateReceivedItem(po.id, item.id, 'receivedQuantity', Math.min(val, remaining));
                              }}
                              className={totalReceived > item.orderedQuantity ? 'border-destructive' : ''}
                            />
                          </div>

                          {item.product.hasExpiry && (
                            <div>
                              <label className="text-sm font-medium">Expiry Date</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full justify-start text-left font-normal',
                                      !received?.expiryDate && 'text-muted-foreground'
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {received?.expiryDate 
                                      ? format(new Date(received.expiryDate), 'PP')
                                      : 'Select date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={received?.expiryDate ? new Date(received.expiryDate) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        updateReceivedItem(po.id, item.id, 'expiryDate', format(date, 'yyyy-MM-dd'));
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}

                          {!item.product.hasExpiry && (
                            <div>
                              <label className="text-sm font-medium">Expiry Date</label>
                              <Input value="N/A" disabled className="bg-muted" />
                            </div>
                          )}
                        </div>

                        {hasDiscrepancy && (
                          <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              Discrepancy Note (Required)
                            </label>
                            <Textarea
                              placeholder="Enter reason for quantity discrepancy..."
                              value={received?.discrepancyNote || ''}
                              onChange={(e) => updateReceivedItem(po.id, item.id, 'discrepancyNote', e.target.value)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`confirm-${item.id}`}
                            checked={received?.confirmed || false}
                            onCheckedChange={(checked) => {
                              updateReceivedItem(po.id, item.id, 'confirmed', checked as boolean);
                            }}
                          />
                          <label
                            htmlFor={`confirm-${item.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Confirm received quantity for this item
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receive Items</h1>
          <p className="text-muted-foreground mt-1">Process incoming deliveries and manage receipt discrepancies</p>
        </div>
        <Button onClick={fetchReceivableOrders} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Approved Purchase Orders ({approvedPOs.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Items from approved purchase orders. Mark items as received and note any discrepancies.
              </p>
            </CardHeader>
            <CardContent>
              {renderPOTable(approvedPOs, false)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Incomplete Purchase Orders ({incompletePOs.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Purchase orders with unresolved discrepancies. Take action to receive items or close the PO.
              </p>
            </CardHeader>
            <CardContent>
              {renderPOTable(incompletePOs, true)}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default withModuleAuthorization(PurchaseOrderReceive, { 
  moduleId: 'purchase-order', 
  moduleName: 'Purchase Order' 
});
