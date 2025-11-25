import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Label } from '@client/components/ui/label';
import { Badge } from '@client/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ViewMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementId: string;
}

export const ViewMovementModal: React.FC<ViewMovementModalProps> = ({
  open,
  onOpenChange,
  movementId,
}) => {
  const [loading, setLoading] = useState(false);
  const [movement, setMovement] = useState<any>(null);

  useEffect(() => {
    if (open && movementId) {
      fetchMovementDetails();
    }
  }, [open, movementId]);

  const fetchMovementDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/modules/inventory-items/movement-history/${movementId}`);

      if (response.data.success) {
        setMovement(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching movement details:', error);
      toast.error('Failed to load movement details');
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      putaway: { variant: 'default', label: 'Putaway' },
      pick: { variant: 'secondary', label: 'Pick' },
      adjustment: { variant: 'outline', label: 'Adjustment' },
      relocation: { variant: 'default', label: 'Relocation' },
    };

    const config = variants[type] || { variant: 'secondary', label: type };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (!movement && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Movement Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : movement ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Movement Type</Label>
                <div>{getMovementTypeBadge(movement.movementType)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Quantity Changed</Label>
                <div className="text-lg font-semibold">
                  <span className={movement.quantityChanged >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {movement.quantityChanged >= 0 ? '+' : ''}{movement.quantityChanged}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Product SKU</Label>
                <div className="font-medium">{movement.productSku}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Product Name</Label>
                <div>{movement.productName}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Bin Location</Label>
                <div>{movement.binName}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Reference Type</Label>
                <div className="uppercase text-sm">{movement.referenceType}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Reference Number</Label>
                <div className="font-medium">{movement.referenceNumber}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Date & Time</Label>
                <div>
                  {movement.createdAt
                    ? format(new Date(movement.createdAt), 'MMM dd, yyyy HH:mm:ss')
                    : '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">User</Label>
                <div>{movement.userName}</div>
              </div>
              {movement.notes && (
                <div className="space-y-2 col-span-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <div className="p-3 bg-muted rounded-md">{movement.notes}</div>
                </div>
              )}
            </div>

            {movement.inventoryItemDetails && (
              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-semibold">Inventory Item Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {movement.inventoryItemDetails.batchNumber && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Batch Number</Label>
                      <div>{movement.inventoryItemDetails.batchNumber}</div>
                    </div>
                  )}
                  {movement.inventoryItemDetails.lotNumber && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Lot Number</Label>
                      <div>{movement.inventoryItemDetails.lotNumber}</div>
                    </div>
                  )}
                  {movement.inventoryItemDetails.expiryDate && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Expiry Date</Label>
                      <div>{format(new Date(movement.inventoryItemDetails.expiryDate), 'MMM dd, yyyy')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
