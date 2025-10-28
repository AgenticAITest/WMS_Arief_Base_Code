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
import { GRNConfirmationModal } from '../components/GRNConfirmationModal';

interface PO {
  id: string;
  orderNumber: string;
  orderDate: string;
  supplierName: string;
  warehouseName: string;
  status: string;
  totalAmount: string;
  items: POItem[];
  grnNumber?: string | null;
  grnDocumentId?: string | null;
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
  const [receivedPOs, setReceivedPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track received items for each PO
  const [receivedItems, setReceivedItems] = useState<Record<string, Record<string, ReceivedItem>>>({});
  
  // Track which POs are being submitted
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  
  // GRN modal state
  const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);
  const [currentGRN, setCurrentGRN] = useState<{ number: string; documentId: string } | null>(null);

  useEffect(() => {
    fetchReceivableOrders();
  }, []);

  const fetchReceivableOrders = async () => {
    try {
      setLoading(true);
      const [approvedResponse, incompleteResponse, receivedResponse] = await Promise.all([
        axios.get('/api/modules/purchase-order/receive/approved'),
        axios.get('/api/modules/purchase-order/receive/incomplete'),
        axios.get('/api/modules/purchase-order/receive/received'),
      ]);
      
      setApprovedPOs(approvedResponse.data.data || []);
      setIncompletePOs(incompleteResponse.data.data || []);
      setReceivedPOs(receivedResponse.data.data || []);
      
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
        // Show GRN modal
        setCurrentGRN({
          number: response.data.data.grnNumber,
          documentId: response.data.data.grnDocumentId,
        });
        setIsGRNModalOpen(true);
        fetchReceivableOrders();
      }
    } catch (error: any) {
      console.error('Error submitting receipt:', error);
      toast.error(error.response?.data?.message || 'Failed to submit receipt');
    } finally {
      setSubmitting(prev => ({ ...prev, [po.id]: false }));
    }
  };

  const handleViewGRN = (po: PO) => {
    if (po.grnNumber && po.grnDocumentId) {
      setCurrentGRN({
        number: po.grnNumber,
        documentId: po.grnDocumentId,
      });
      setIsGRNModalOpen(true);
    }
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderPOTable = (pos: PO[], displayType: 'approved' | 'incomplete' | 'received' = 'approved') => {
    if (pos.length === 0) {
      const emptyMessages = {
        approved: 'No approved purchase orders awaiting receipt.',
        incomplete: 'No incomplete purchase orders to receive.',
        received: 'No received purchase orders awaiting putaway.',
      };
      
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-lg">{emptyMessages[displayType]}</p>
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
            <Card key={`${po.id}-${po.grnDocumentId || po.id}`} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {po.orderNumber}
                      <Badge variant={displayType === 'incomplete' ? 'secondary' : displayType === 'received' ? 'outline' : 'default'}>
                        {displayType === 'incomplete' ? 'Incomplete' : displayType === 'received' ? 'Received' : 'Ready to Receive'}
                      </Badge>
                      {displayType === 'received' && po.grnNumber && (
                        <Badge variant="default" className="ml-1">
                          GRN: {po.grnNumber}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <p><strong>Supplier:</strong> {po.supplierName}</p>
                      <p><strong>Warehouse:</strong> {po.warehouseName}</p>
                      <p><strong>Order Date:</strong> {format(new Date(po.orderDate), 'PPP')}</p>
                      <p><strong>Total Amount:</strong> {formatCurrency(po.totalAmount)}</p>
                    </div>
                  </div>
                  {displayType === 'received' ? (
                    <Button
                      onClick={() => handleViewGRN(po)}
                      variant="outline"
                      className="min-w-[120px]"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      View GRN
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubmitReceipt(po, displayType === 'incomplete')}
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
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {displayType === 'received' ? (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2"><strong>Items Received:</strong> {po.items.length}</p>
                    <p><strong>Total Items Quantity:</strong> {po.items.reduce((sum, item) => sum + item.receivedQuantity, 0)}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {po.items.map(item => {
                    const received = poItems[item.id];
                    const totalReceived = displayType === 'incomplete'
                      ? item.receivedQuantity + (received?.receivedQuantity || 0)
                      : (received?.receivedQuantity || 0);
                    const remaining = item.orderedQuantity - (displayType === 'incomplete' ? item.receivedQuantity : 0);
                    const hasDiscrepancy = received && received.receivedQuantity < remaining;

                    return (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          {/* Product Info */}
                          <div className="flex-1 min-w-[200px]">
                            <h4 className="font-semibold text-sm">{item.product.name}</h4>
                            <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                          </div>

                          {/* Ordered Qty */}
                          <div className="w-20">
                            <label className="text-xs font-medium block mb-1">Ordered</label>
                            <Input 
                              value={item.orderedQuantity} 
                              disabled 
                              className="bg-muted h-8 text-sm" 
                            />
                          </div>

                          {/* Already Received Qty (for incomplete POs) */}
                          {displayType === 'incomplete' && (
                            <div className="w-20">
                              <label className="text-xs font-medium block mb-1">Received</label>
                              <Input 
                                value={item.receivedQuantity} 
                                disabled 
                                className="bg-muted h-8 text-sm" 
                              />
                            </div>
                          )}

                          {/* Receiving Now Qty */}
                          <div className="w-20">
                            <label className="text-xs font-medium block mb-1">
                              {displayType === 'incomplete' ? 'Add' : 'Receive'}
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
                              className={cn("h-8 text-sm", totalReceived > item.orderedQuantity && 'border-destructive')}
                            />
                          </div>

                          {/* Expiry Date */}
                          <div className="w-32">
                            <label className="text-xs font-medium block mb-1">Expiry</label>
                            {item.product.hasExpiry ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full h-8 justify-start text-left font-normal text-xs px-2',
                                      !received?.expiryDate && 'text-muted-foreground'
                                    )}
                                  >
                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                    {received?.expiryDate 
                                      ? format(new Date(received.expiryDate), 'MM/dd/yy')
                                      : 'Select'}
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
                            ) : (
                              <Input value="N/A" disabled className="bg-muted h-8 text-xs" />
                            )}
                          </div>

                          {/* Confirm Checkbox */}
                          <div className="flex flex-col items-center w-16">
                            <label className="text-xs font-medium block mb-1">Confirm</label>
                            <Checkbox
                              id={`confirm-${item.id}`}
                              checked={received?.confirmed || false}
                              onCheckedChange={(checked) => {
                                updateReceivedItem(po.id, item.id, 'confirmed', checked as boolean);
                              }}
                            />
                          </div>

                          {/* Discrepancy Note - Always visible, enabled/disabled based on quantity variance */}
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-medium flex items-center gap-1 mb-1">
                              {hasDiscrepancy && <AlertTriangle className="h-3 w-3 text-yellow-600" />}
                              Discrepancy Note
                            </label>
                            <Input
                              placeholder={hasDiscrepancy ? "Reason for discrepancy..." : "No discrepancy"}
                              value={received?.discrepancyNote || ''}
                              onChange={(e) => updateReceivedItem(po.id, item.id, 'discrepancyNote', e.target.value)}
                              disabled={!hasDiscrepancy}
                              className={cn(
                                "h-8 text-sm",
                                !hasDiscrepancy && "bg-muted cursor-not-allowed"
                              )}
                            />
                          </div>

                          {/* Status Badge */}
                          {received?.confirmed && (
                            <Badge variant="default" className="ml-2">✓</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
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
              {renderPOTable(approvedPOs, 'approved')}
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
              {renderPOTable(incompletePOs, 'incomplete')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Purchase Orders with GRNs ({receivedPOs.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                All receipts with generated GRN documents (partial and complete). View GRNs for reprinting or proceed to putaway.
              </p>
            </CardHeader>
            <CardContent>
              {renderPOTable(receivedPOs, 'received')}
            </CardContent>
          </Card>
        </>
      )}

      {currentGRN && (
        <GRNConfirmationModal
          isOpen={isGRNModalOpen}
          onClose={() => {
            setIsGRNModalOpen(false);
            setCurrentGRN(null);
          }}
          grnNumber={currentGRN.number}
          grnDocumentId={currentGRN.documentId}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(PurchaseOrderReceive, { 
  moduleId: 'purchase-order', 
  moduleName: 'Purchase Order' 
});
