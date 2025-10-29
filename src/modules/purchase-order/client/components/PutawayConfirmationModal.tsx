import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface PutawayConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  putawayNumber: string;
  putawayDocumentId: string;
}

export const PutawayConfirmationModal: React.FC<PutawayConfirmationModalProps> = ({
  isOpen,
  onClose,
  putawayNumber,
  putawayDocumentId,
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && putawayDocumentId) {
      fetchPutawayHTML();
    }
  }, [isOpen, putawayDocumentId]);

  const fetchPutawayHTML = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/modules/purchase-order/putaway/${putawayDocumentId}/html`);
      if (response.data.success && response.data.html) {
        setHtmlContent(response.data.html);
      }
    } catch (error) {
      console.error('Error fetching Putaway HTML:', error);
      toast.error('Failed to load Putaway document');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!htmlContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleCleanup = () => {
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCleanup}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Putaway Document - {putawayNumber}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md p-4 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading Putaway document...</span>
            </div>
          ) : htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Putaway document is not available.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:justify-start">
          <Button variant="outline" onClick={handleCleanup} className="min-w-[120px]">
            Close
          </Button>
          <Button variant="default" onClick={handlePrint} disabled={!htmlContent} className="min-w-[120px]">
            <Printer className="mr-2 h-4 w-4" />
            Print Putaway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
