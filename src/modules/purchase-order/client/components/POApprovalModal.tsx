import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { POApproveConfirmDialog } from './POApproveConfirmDialog';
import axios from 'axios';
import { toast } from 'sonner';

interface POApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any;
  onApprove: (poId: string) => void;
  onReject: (poId: string, reason?: string) => void;
}

export const POApprovalModal: React.FC<POApprovalModalProps> = ({
  isOpen,
  onClose,
  po,
  onApprove,
  onReject,
}) => {
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (isOpen && po) {
      fetchHTMLPreview();
    }
  }, [isOpen, po]);

  const fetchHTMLPreview = async () => {
    try {
      setLoading(true);
      // Fetch the generated HTML document from the file system
      const response = await axios.get(`/api/modules/purchase-order/orders/${po.id}/html`);
      if (response.data.success && response.data.html) {
        setHtmlPreview(response.data.html);
      }
    } catch (error) {
      console.error('Error fetching HTML preview:', error);
      toast.error('Failed to load purchase order preview');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = () => {
    setShowApproveConfirm(true);
  };

  const handleRejectClick = () => {
    setShowRejectConfirm(true);
  };

  const handleConfirmApprove = () => {
    setShowApproveConfirm(false);
    onApprove(po.id);
  };

  const handleConfirmReject = () => {
    setShowRejectConfirm(false);
    onReject(po.id, rejectReason);
    setRejectReason('');
  };

  const handleCleanup = () => {
    // Clean up pointer-events on body and html
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCleanup}>
        <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Purchase Order Details - {po?.orderNumber}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-md p-4 bg-white">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading purchase order...</span>
              </div>
            ) : htmlPreview ? (
              <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Purchase order preview is not available. The document may not have been generated yet.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCleanup}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectClick}>
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button variant="default" onClick={handleApproveClick}>
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <POApproveConfirmDialog
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={handleConfirmApprove}
        poNumber={po?.orderNumber}
      />

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectConfirm} onOpenChange={(open) => {
        if (!open) {
          setShowRejectConfirm(false);
          setRejectReason('');
          // Cleanup pointer events
          document.body.style.pointerEvents = '';
          document.documentElement.style.pointerEvents = '';
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to reject Purchase Order <strong>{po?.orderNumber}</strong>?
              This will send it back to the creator for revision.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection (Optional)</label>
              <textarea
                className="w-full min-h-[100px] p-2 border rounded-md"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectConfirm(false);
                setRejectReason('');
                // Cleanup pointer events
                document.body.style.pointerEvents = '';
                document.documentElement.style.pointerEvents = '';
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
