import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { toast } from 'sonner';
import { AlertCircle, Check } from 'lucide-react';

interface Allocation {
  allocationId: string;
  allocatedQuantity: string;
  binName: string;
  batchNumber: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
}

interface SOItem {
  id: string;
  productName: string;
  sku: string;
  allocatedQuantity: string;
  allocations: Allocation[];
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: string;
  items: SOItem[];
}

interface PickConfirmationModalProps {
  isOpen: boolean;
  onClose: (success?: boolean, data?: { pickNumber: string; documentPath: string }) => void;
  salesOrder: SalesOrder;
}

const PickConfirmationModal: React.FC<PickConfirmationModalProps> = ({
  isOpen,
  onClose,
  salesOrder,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `/api/modules/sales-order/picks/${salesOrder.id}/confirm`
      );

      if (response.data.success) {
        toast.success('Pick confirmed successfully', {
          description: `Pick document ${response.data.data.pickNumber} generated`,
        });
        onClose(true, {
          pickNumber: response.data.data.pickNumber,
          documentPath: response.data.data.documentPath,
        });
      } else {
        toast.error('Failed to confirm pick', {
          description: response.data.message,
        });
      }
    } catch (error: any) {
      console.error('Error confirming pick:', error);
      toast.error('Failed to confirm pick', {
        description: error.response?.data?.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Pick - {salesOrder.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Review Pick Details
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Please verify all items and locations before confirming the pick.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-md">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-medium">{salesOrder.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{salesOrder.customerName}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Items to Pick</h3>
            {salesOrder.items.map((item, idx) => (
              <div key={item.id} className="border rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Qty</p>
                    <p className="text-lg font-semibold">{item.allocatedQuantity}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {item.allocations.map((allocation, allocationIdx) => (
                    <div
                      key={allocationIdx}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{allocation.binName}</span>
                        {(allocation.batchNumber || allocation.lotNumber) && (
                          <span className="text-muted-foreground">
                            {allocation.batchNumber || allocation.lotNumber}
                          </span>
                        )}
                        {allocation.expiryDate && (
                          <span className="text-muted-foreground">
                            | Exp: {new Date(allocation.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">Qty: {allocation.allocatedQuantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onClose()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Pick'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PickConfirmationModal;
