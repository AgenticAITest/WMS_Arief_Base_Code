import React, { useState } from 'react';
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
import { Loader2, MapPin } from 'lucide-react';

interface SOConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soData: any;
  onConfirm: (soData: any) => Promise<void>;
  onBack: () => void;
}

export const SOConfirmationModal: React.FC<SOConfirmationModalProps> = ({
  open,
  onOpenChange,
  soData,
  onConfirm,
  onBack,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onConfirm(soData);
    } catch (error) {
      console.error('Error confirming SO:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const calculateSubtotal = () => {
    return (soData.items || []).reduce((sum: number, item: any) => {
      return sum + (item.orderedQuantity * item.unitPrice);
    }, 0);
  };

  const subtotal = calculateSubtotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Sales Order Creation</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="font-medium">{soData.customerName || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Order Date</div>
                <div className="font-medium">{new Date(soData.orderDate).toLocaleDateString()}</div>
              </div>
              {soData.requestedDeliveryDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Requested Delivery Date</div>
                  <div className="font-medium">{new Date(soData.requestedDeliveryDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
            {soData.deliveryInstructions && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">Delivery Instructions</div>
                <div className="font-medium">{soData.deliveryInstructions}</div>
              </div>
            )}
            {soData.notes && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="font-medium">{soData.notes}</div>
              </div>
            )}
          </div>

          {soData.selectedLocations && soData.selectedLocations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Shipping Locations ({soData.selectedLocations.length})
              </h3>
              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {soData.selectedLocations.map((location: any, index: number) => (
                    <div 
                      key={index}
                      className="bg-background border rounded px-3 py-1.5 text-sm"
                    >
                      {location.address}
                    </div>
                  ))}
                </div>
              </div>
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
                  {(soData.items || []).map((item: any, index: number) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                        <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.orderedQuantity * item.unitPrice).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {item.locations && item.locations.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 py-2 px-4">
                            <div className="text-xs text-muted-foreground mb-1 font-medium">
                              Location Allocation:
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {item.locations.map((loc: any, locIndex: number) => {
                                const location = soData.selectedLocations?.find((sl: any) => sl.id === (loc.customerLocationId || loc.locationId));
                                return (
                                  <div 
                                    key={locIndex}
                                    className="bg-background border rounded px-2 py-1 text-xs flex items-center justify-between"
                                  >
                                    <span className="truncate mr-2">{location?.address || 'Unknown'}</span>
                                    <span className="font-medium whitespace-nowrap">× {loc.quantity}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-2 border-t-2 border-primary">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onBack} disabled={isConfirming}>
              Back to Edit
            </Button>
            <Button onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Confirm & Create Sales Order'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
