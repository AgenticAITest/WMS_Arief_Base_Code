import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Printer, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

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
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && soData?.documentPath) {
      fetchDocument();
    } else {
      setLoading(false);
    }
    
    return () => {
      // Cleanup blob URL to free memory
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, soData?.documentPath]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      // Fetch document via authenticated axios request
      const response = await axios.get(`/api/audit-logs/document`, {
        params: { path: soData.documentPath },
        responseType: 'text', // Get HTML as text
      });
      
      // Create a blob from the HTML content
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error('Error fetching SO document:', error);
      toast.error('Failed to load SO document');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('so-document-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  if (!soData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sales Order Created Successfully - {soData.orderNumber}</DialogTitle>
        </DialogHeader>

        {/* BLOB URL APPROACH - Fetches via authenticated axios, creates blob URL for iframe */}
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <div className="text-lg font-medium">Loading document...</div>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </div>
          </div>
        ) : blobUrl ? (
          <iframe
            id="so-document-iframe"
            src={blobUrl}
            className="w-full h-[600px] border-0"
            title="Sales Order Document"
          />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              No document available
            </div>
          </div>
        )}

        {/* COMMENTED OUT OLD RENDERING LOGIC - Preserved for rollback */}
        {/* {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <div className="text-lg font-medium">Loading document...</div>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </div>
          </div>
        ) : htmlContent ? (
          <iframe
            id="so-document-iframe"
            srcDoc={htmlContent}
            className="w-full h-[600px] border-0"
            title="Sales Order Document"
          />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              No document available
            </div>
          </div>
        )} */}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handlePrint} disabled={!blobUrl || loading}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
