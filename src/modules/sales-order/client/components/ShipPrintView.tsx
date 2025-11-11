import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Printer, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface ShipPrintViewProps {
  isOpen: boolean;
  onClose: () => void;
  shipNumber: string;
  documentPath: string;
}

export const ShipPrintView: React.FC<ShipPrintViewProps> = ({
  isOpen,
  onClose,
  shipNumber,
  documentPath,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && documentPath) {
      fetchDocument();
    } else {
      setLoading(false);
    }
    
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, documentPath]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/audit-logs/document`, {
        params: { path: documentPath },
        responseType: 'text',
      });
      
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error('Error fetching shipment document:', error);
      toast.error('Failed to load shipment document');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('ship-document-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Shipment Completed Successfully - {shipNumber}</span>
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                disabled={loading}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Shipping Instructions
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <div className="text-lg font-medium">Loading shipment document...</div>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </div>
          </div>
        ) : blobUrl ? (
          <iframe
            id="ship-document-iframe"
            src={blobUrl}
            className="w-full h-[70vh] border-0 rounded-lg"
            title={`Shipment Document - ${shipNumber}`}
          />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <X className="h-12 w-12 text-destructive mx-auto mb-2" />
              <div className="text-lg font-medium">Failed to load document</div>
              <div className="text-sm text-muted-foreground">
                Please try closing and reopening this dialog
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
