import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Check } from 'lucide-react';

interface POApproveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  poNumber: string;
}

export const POApproveConfirmDialog: React.FC<POApproveConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  poNumber,
}) => {
  const handleClose = () => {
    // Clean up pointer-events on body and html
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Purchase Order Approval</DialogTitle>
          <DialogDescription>
            This action will approve the purchase order and move it to the next workflow stage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            You are about to approve Purchase Order <strong className="text-foreground">{poNumber}</strong>.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Once approved, the purchase order will proceed to the receiving stage and cannot be edited.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={() => {
            onConfirm();
            handleClose();
          }}>
            <Check className="mr-2 h-4 w-4" />
            Confirm Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
