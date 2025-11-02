import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Printer, X } from 'lucide-react';

interface SOPrintViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soData: any;
}

export const SOPrintView: React.FC<SOPrintViewProps> = ({
  open,
  onOpenChange,
  soData,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const calculateTotal = () => {
    return (soData.items || []).reduce((sum: number, item: any) => {
      return sum + (item.orderedQuantity * item.unitPrice);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sales Order Created Successfully</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:p-8">
          <div className="text-center print:text-left">
            <h2 className="text-2xl font-bold">Sales Order</h2>
            <div className="text-xl font-semibold text-primary mt-2">
              {soData.orderNumber}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 print:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{soData.customerName || 'N/A'}</span>
                </div>
                {soData.shippingLocationName && (
                  <div>
                    <span className="text-muted-foreground">Shipping Location:</span>{' '}
                    <span className="font-medium">{soData.shippingLocationName}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Order Details</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Order Date:</span>{' '}
                  <span className="font-medium">
                    {soData.orderDate ? new Date(soData.orderDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {soData.requestedDeliveryDate && (
                  <div>
                    <span className="text-muted-foreground">Requested Delivery:</span>{' '}
                    <span className="font-medium">
                      {new Date(soData.requestedDeliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {soData.shippingMethodName && (
                  <div>
                    <span className="text-muted-foreground">Shipping Method:</span>{' '}
                    <span className="font-medium">{soData.shippingMethodName}</span>
                  </div>
                )}
                {soData.trackingNumber && (
                  <div>
                    <span className="text-muted-foreground">Tracking #:</span>{' '}
                    <span className="font-medium">{soData.trackingNumber}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="font-medium capitalize">{soData.status || 'created'}</span>
                </div>
              </div>
            </div>
          </div>

          {soData.deliveryInstructions && (
            <div>
              <h3 className="font-semibold mb-2">Delivery Instructions</h3>
              <p className="text-sm">{soData.deliveryInstructions}</p>
            </div>
          )}

          {soData.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm">{soData.notes}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Order Items</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(soData.items || []).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.productName || item.name}</TableCell>
                      <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.totalPrice ? parseFloat(item.totalPrice).toFixed(2) : (item.orderedQuantity * item.unitPrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-2 border-t-2 border-primary">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-bold text-lg">
                  ${soData.totalAmount ? parseFloat(soData.totalAmount).toFixed(2) : calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t print:hidden">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
