import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Separator } from '@client/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface POConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poData: any;
  onConfirm: (poData: any) => void;
  onBack: () => void;
}

export const POConfirmationModal: React.FC<POConfirmationModalProps> = ({
  open,
  onOpenChange,
  poData,
  onConfirm,
  onBack,
}) => {
  const [previewHTML, setPreviewHTML] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  useEffect(() => {
    if (open && poData) {
      fetchPreview();
    }
  }, [open, poData]);

  const fetchPreview = async () => {
    try {
      setFetchingPreview(true);
      const response = await axios.post('/api/modules/purchase-order/preview', poData);

      if (response.data.success) {
        setPreviewHTML(response.data.html);
      } else {
        toast.error('Failed to generate PO preview');
      }
    } catch (error : any) {
      console.error('Error generating PO preview:', error);
      toast.error(error.response?.data?.message || 'Failed to generate PO preview');
    } finally {
      setFetchingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await onConfirm(poData);
    } catch (error) {
      console.error('Error confirming PO:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!poData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm Purchase Order - Preview</DialogTitle>
        </DialogHeader>

        {fetchingPreview ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <div className="text-lg font-medium">Generating preview...</div>
              <div className="text-sm text-muted-foreground mt-2">Please wait</div>
            </div>
          </div>
        ) : previewHTML ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This is how your Purchase Order will look when saved. Review carefully before confirming.
            </div>
            <iframe
              srcDoc={previewHTML}
              className="w-full h-[600px] border rounded-lg"
              title="PO Preview"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              <div>Failed to load preview</div>
              <div className="text-sm mt-2">Please try again</div>
            </div>
          </div>
        )}

        <Separator />

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading || fetchingPreview}>
              {loading ? 'Creating...' : 'Confirm & Create PO'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
