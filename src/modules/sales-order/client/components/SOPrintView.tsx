import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Printer, X } from 'lucide-react';
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
  // COMMENTED OUT OLD API APPROACH - Preserved for rollback
  // const [htmlContent, setHtmlContent] = useState<string>('');
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   if (open && soData?.id) {
  //     fetchGeneratedDocument();
  //   }
  // }, [open, soData?.id]);

  // const fetchGeneratedDocument = async () => {
  //   try {
  //     setLoading(true);
  //     const htmlResponse = await axios.get(
  //       `/api/modules/sales-order/sales-orders/${soData.id}/html`
  //     );
  //     
  //     if (htmlResponse.data.success && htmlResponse.data.html) {
  //       setHtmlContent(htmlResponse.data.html);
  //     } else {
  //       toast.error('No generated document found for this SO');
  //     }
  //   } catch (error: any) {
  //     console.error('Error fetching generated document:', error);
  //     const errorMsg = error.response?.data?.message || 'Failed to load SO document';
  //     toast.error(errorMsg);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // NEW STATIC FILE APPROACH
  const [documentPath, setDocumentPath] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && soData?.documentPath) {
      // Document path is already in soData from backend response
      setDocumentPath(soData.documentPath);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [open, soData?.documentPath]);

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

        {/* SECURE FILE SERVING - Uses authenticated endpoint to serve documents */}
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <div className="text-lg font-medium">Loading document...</div>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </div>
          </div>
        ) : documentPath ? (
          <iframe
            id="so-document-iframe"
            src={`/api/audit-logs/document?path=${encodeURIComponent(documentPath)}`}
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
          <Button variant="outline" onClick={handlePrint} disabled={!documentPath || loading}>
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
