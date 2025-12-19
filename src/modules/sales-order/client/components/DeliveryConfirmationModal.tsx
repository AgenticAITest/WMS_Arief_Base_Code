import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/components/ui/dialog';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@client/components/ui/accordion';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Package, AlertCircle } from 'lucide-react';

interface PackageItem {
  id: string;
  productId: string;
  salesOrderItemId: string;
  quantity: string;
  productName: string;
  sku: string;
}

interface Package {
  id: string;
  packageId: string;
  packageNumber: string;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  barcode: string | null;
  items: PackageItem[];
}

interface ItemQuantities {
  salesOrderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  shippedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  rejectionNotes: string;
}

interface DeliveryConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  salesOrderId: string;
  onSuccess: (data: { deliveryNumber: string; documentPath: string }) => void;
}

const DeliveryConfirmationModal: React.FC<DeliveryConfirmationModalProps> = ({
  open,
  onClose,
  salesOrderId,
  onSuccess,
}) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [itemQuantities, setItemQuantities] = useState<{ [key: string]: ItemQuantities }>({});

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, salesOrderId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `/api/modules/sales-order/delivers/${salesOrderId}/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setPackages(response.data.data.packages);
        
        // Initialize item quantities from packages
        const quantities: { [key: string]: ItemQuantities } = {};
        response.data.data.packages.forEach((pkg: Package) => {
          pkg.items.forEach((item) => {
            const key = `${item.salesOrderItemId}-${item.productId}`;
            if (!quantities[key]) {
              quantities[key] = {
                salesOrderItemId: item.salesOrderItemId,
                productId: item.productId,
                productName: item.productName,
                sku: item.sku,
                shippedQuantity: item.quantity,
                acceptedQuantity: item.quantity, // Default to all accepted
                rejectedQuantity: '0',
                rejectionNotes: '',
              };
            } else {
              // Accumulate quantities if same item appears in multiple packages
              const shipped = parseFloat(quantities[key].shippedQuantity) + parseFloat(item.quantity);
              quantities[key].shippedQuantity = shipped.toString();
              quantities[key].acceptedQuantity = shipped.toString();
            }
          });
        });
        setItemQuantities(quantities);
      }
    } catch (error: any) {
      console.error('Error fetching delivery details:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch delivery details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptedQuantityChange = (key: string, value: string) => {
    const newQuantities = { ...itemQuantities };
    const shipped = parseFloat(newQuantities[key].shippedQuantity);
    const accepted = parseFloat(value) || 0;
    
    // Validate accepted quantity cannot exceed shipped quantity
    if (accepted > shipped) {
      toast.error('Accepted quantity cannot exceed shipped quantity');
      return;
    }
    
    newQuantities[key].acceptedQuantity = value;
    newQuantities[key].rejectedQuantity = (shipped - accepted).toFixed(3);
    
    setItemQuantities(newQuantities);
  };

  const handleRejectionNotesChange = (key: string, value: string) => {
    const newQuantities = { ...itemQuantities };
    newQuantities[key].rejectionNotes = value;
    setItemQuantities(newQuantities);
  };

  const hasRejections = () => {
    return Object.values(itemQuantities).some(
      (item) => parseFloat(item.rejectedQuantity) > 0
    );
  };

  const validateSubmission = (isPartial: boolean): boolean => {
    // Validate recipient name
    if (!recipientName.trim()) {
      toast.error('Please enter recipient name');
      return false;
    }

    // If partial delivery, validate rejection notes for rejected items
    if (isPartial) {
      const hasRejectedItemsWithoutNotes = Object.values(itemQuantities).some(
        (item) =>
          parseFloat(item.rejectedQuantity) > 0 && !item.rejectionNotes.trim()
      );

      if (hasRejectedItemsWithoutNotes) {
        toast.error('Please provide rejection notes for all rejected items');
        return false;
      }
    }

    return true;
  };

  const handleCompleteDelivery = async () => {
    if (!validateSubmission(false)) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `/api/modules/sales-order/delivers/${salesOrderId}/complete`,
        {
          recipientName,
          notes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        onSuccess({
          deliveryNumber: response.data.data.deliveryNumber,
          documentPath: response.data.data.documentPath,
        });
      }
    } catch (error: any) {
      console.error('Error confirming complete delivery:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartialDelivery = async () => {
    if (!validateSubmission(true)) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `/api/modules/sales-order/delivers/${salesOrderId}/partial`,
        {
          recipientName,
          notes,
          items: Object.values(itemQuantities),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        if (response.data.data.returnPONumber) {
          toast.info(`Return PO created: ${response.data.data.returnPONumber}`);
        }
        onSuccess({
          deliveryNumber: response.data.data.deliveryNumber,
          documentPath: response.data.data.documentPath,
        });
      }
    } catch (error: any) {
      console.error('Error confirming partial delivery:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm partial delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItemsTable = () => {
    const items = Object.values(itemQuantities);
    if (items.length === 0) return null;

    return (
      <div className="border rounded-md overflow-hidden mt-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                SKU
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Product
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                Shipped
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                Accepted
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                Rejected
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Rejection Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item, index) => {
              const key = `${item.salesOrderItemId}-${item.productId}`;
              const hasRejection = parseFloat(item.rejectedQuantity) > 0;

              return (
                <tr key={index} className={hasRejection ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                  <td className="px-3 py-2 text-sm font-mono">{item.sku}</td>
                  <td className="px-3 py-2 text-sm">{item.productName}</td>
                  <td className="px-3 py-2 text-sm text-center font-medium">
                    {parseInt(item.shippedQuantity, 10)}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="1"
                      value={item.acceptedQuantity}
                      onChange={(e) => handleAcceptedQuantityChange(key, e.target.value)}
                      className="w-24 text-center"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-center">
                    <span
                      className={
                        hasRejection
                          ? 'font-bold text-red-600'
                          : 'text-gray-500'
                      }
                    >
                      {parseInt(item.rejectedQuantity, 10)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {hasRejection && (
                      <Input
                        type="text"
                        value={item.rejectionNotes}
                        onChange={(e) => handleRejectionNotesChange(key, e.target.value)}
                        placeholder="Reason for rejection..."
                        className="text-sm"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPackageAccordion = () => {
    return (
      <Accordion type="single" collapsible className="w-full">
        {packages.map((pkg) => (
          <AccordionItem key={pkg.id} value={pkg.id}>
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="font-medium">{pkg.packageNumber}</span>
                <span className="text-sm text-muted-foreground">
                  ({pkg.items.length} item{pkg.items.length !== 1 ? 's' : ''})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pl-6">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Package ID:</span>{' '}
                    <span className="font-mono">{pkg.packageId}</span>
                  </div>
                  {pkg.barcode && (
                    <div>
                      <span className="text-muted-foreground">Barcode:</span>{' '}
                      <span className="font-mono">{pkg.barcode}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Dimensions:</span>{' '}
                    {[pkg.length, pkg.width, pkg.height]
                      .filter((d) => d !== null)
                      .map((d) => `${d} cm`)
                      .join(' × ') || 'Not specified'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight:</span>{' '}
                    {pkg.weight ? `${pkg.weight} kg` : 'Not specified'}
                  </div>
                </div>
                <div className="mt-2">
                  <h5 className="text-sm font-semibold mb-1">Items in this package:</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {pkg.items.map((item, idx) => (
                      <li key={idx}>
                        {item.sku} - {item.productName} (Qty: {item.quantity})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirm Delivery
          </DialogTitle>
          <DialogDescription>
            Review packages and confirm delivery status. Mark items as accepted or rejected.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="text-sm text-muted-foreground">Loading delivery details...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Packages Section */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Packages ({packages.length})</h3>
              {renderPackageAccordion()}
            </div>

            {/* Items Section */}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Delivery Items - Accept or Reject
              </h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md mb-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium">Instructions:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Enter the accepted quantity for each item</li>
                      <li>Rejected quantity will be calculated automatically</li>
                      <li>Provide rejection notes for any rejected items</li>
                      <li>
                        If all items are accepted, use "Complete Delivery"
                      </li>
                      <li>
                        If any items are rejected, use "Partial Delivery" (creates return PO)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              {renderItemsTable()}
            </div>

            {/* Delivery Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipientName" className="flex items-center gap-1">
                  Recipient Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Name of person receiving the delivery"
                />
              </div>

              <div>
                <Label htmlFor="notes">Delivery Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about the delivery..."
                  rows={3}
                />
              </div>
            </div>

            {/* Warning if rejections exist */}
            {hasRejections() && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-medium">Rejected items detected</p>
                    <p className="mt-1">
                      A return purchase order will be created for the rejected items.
                      Ensure all rejection notes are filled in.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteDelivery}
            disabled={submitting || loading || hasRejections()}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {submitting ? 'Processing...' : 'Complete Delivery'}
          </Button>
          {hasRejections() && (
            <Button
              onClick={handlePartialDelivery}
              disabled={submitting || loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {submitting ? 'Processing...' : 'Partial Delivery'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryConfirmationModal;
