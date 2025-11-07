import React, { useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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

interface AllocationConfirmationModalProps {
  isOpen: boolean;
  onClose: (success: boolean, data?: { allocationNumber: string; documentPath: string }) => void;
  salesOrder: SalesOrder;
}

const AllocationConfirmationModal: React.FC<AllocationConfirmationModalProps> = ({
  isOpen,
  onClose,
  salesOrder,
}) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const response = await axios.post(
        `/api/modules/sales-order/allocations/${salesOrder.id}/confirm`
      );

      if (response.data.success) {
        toast.success(
          `Allocation confirmed! Document ${response.data.data.allocationNumber} generated.`
        );
        onClose(true, {
          allocationNumber: response.data.data.allocationNumber,
          documentPath: response.data.data.documentPath,
        });
      }
    } catch (error: any) {
      console.error('Error confirming allocation:', error);
      const message = error.response?.data?.message || 'Failed to confirm allocation';
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !confirming && onClose(false)}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Inventory Allocation</DialogTitle>
          <DialogDescription>
            Are you sure you want to allocate inventory for this sales order? This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Reserve inventory items from available stock</li>
              <li>Update inventory reserved quantities</li>
              <li>Generate an allocation document</li>
              <li>Move the order to the next workflow step</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-md">
            <div>
              <p className="text-sm text-muted-foreground">SO Number</p>
              <p className="font-semibold">{salesOrder.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-semibold">{salesOrder.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-semibold">
                {new Date(salesOrder.orderDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-semibold">${parseFloat(salesOrder.totalAmount).toFixed(2)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Items to Allocate:</p>
            <div className="border rounded-md">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">SKU</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Product</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {salesOrder.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-2 text-sm">{item.sku}</td>
                      <td className="px-4 py-2 text-sm">{item.productName}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {item.orderedQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {salesOrder.notes && (
            <div className="p-3 bg-muted/30 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Notes:</strong> {salesOrder.notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirming}>
            {confirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Allocation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllocationConfirmationModal;
