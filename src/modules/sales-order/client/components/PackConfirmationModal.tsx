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
import { AlertCircle, Package as PackageIcon, Box } from 'lucide-react';

interface PackageItem {
  productId: string;
  salesOrderItemId: string;
  quantity: number;
  productName: string;
  sku: string;
}

interface Package {
  id?: string;
  packageId: string;
  packageNumber: string;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  items: PackageItem[];
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: string;
}

interface PackConfirmationModalProps {
  isOpen: boolean;
  onClose: (success?: boolean, data?: { packNumber: string; documentPath: string }) => void;
  salesOrder: SalesOrder;
  packages: Package[];
}

const PackConfirmationModal: React.FC<PackConfirmationModalProps> = ({
  isOpen,
  onClose,
  salesOrder,
  packages,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ensure packages is always an array (defensive programming)
  const packagesList = Array.isArray(packages) ? packages : [];

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/modules/sales-order/packs/${salesOrder.id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Pack confirmed successfully', {
          description: `Pack document ${response.data.data.packNumber} generated`,
        });
        onClose(true, {
          packNumber: response.data.data.packNumber,
          documentPath: response.data.data.documentPath,
        });
      } else {
        toast.error('Failed to confirm pack', {
          description: response.data.message,
        });
      }
    } catch (error: any) {
      console.error('Error confirming pack:', error);
      toast.error('Failed to confirm pack', {
        description: error.response?.data?.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDimensions = (pkg: Package) => {
    if (pkg.length && pkg.width && pkg.height) {
      return `${pkg.length} × ${pkg.width} × ${pkg.height} cm`;
    }
    return 'N/A';
  };

  const getTotalItemsInPackage = (pkg: Package) => {
    return pkg.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const totalItems = packagesList.reduce((sum, pkg) => {
    return sum + pkg.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Pack - {salesOrder.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Review Pack Details
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Please verify all packages and items before confirming the pack.
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
            <div>
              <p className="text-sm text-muted-foreground">Total Packages</p>
              <p className="font-medium">{packagesList.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="font-medium">{totalItems}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Packages to Ship</h3>
            {packagesList.map((pkg, idx) => (
              <div key={pkg.id || idx} className="border rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PackageIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{pkg.packageNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Dimensions: {formatDimensions(pkg)}
                        {pkg.weight && ` | Weight: ${pkg.weight} kg`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Qty</p>
                    <p className="text-lg font-semibold">{getTotalItemsInPackage(pkg)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {pkg.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground">
                          SKU: {item.sku}
                        </span>
                      </div>
                      <span className="font-medium">Qty: {item.quantity}</span>
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
            {isSubmitting ? 'Confirming...' : 'Confirm Pack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PackConfirmationModal;
