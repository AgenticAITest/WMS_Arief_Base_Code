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
// import axios from 'axios'; // COMMENTED OUT - No longer needed for static file approach
// import { toast } from 'sonner'; // COMMENTED OUT - No longer needed for static file approach

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentPath: string; // NEW: Direct file path instead of documentType/documentId
  documentNumber?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  documentPath,
  documentNumber,
}) => {
  // COMMENTED OUT OLD API APPROACH - Preserved for rollback if needed
  // const [htmlContent, setHtmlContent] = useState<string>('');
  // const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   if (isOpen && documentId) {
  //     fetchDocumentHTML();
  //   }
  // }, [isOpen, documentId]);

  // const getEndpoint = () => {
  //   switch (documentType) {
  //     case 'PO':
  //       return `/api/modules/purchase-order/orders/${documentId}/html`;
  //     case 'GRN':
  //       return `/api/modules/purchase-order/grn/${documentId}/html`;
  //     case 'PUTAWAY':
  //       return `/api/modules/purchase-order/putaway/${documentId}/html`;
  //     case 'SALES_ORDER':
  //       return `/api/modules/sales-order/sales-orders/${documentId}/html`;
  //     default:
  //       return '';
  //   }
  // };

  // const getTitle = () => {
  //   const prefix = documentType === 'PO' ? 'Purchase Order' : 
  //                  documentType === 'GRN' ? 'GRN' : 
  //                  documentType === 'PUTAWAY' ? 'Putaway' :
  //                  documentType === 'SALES_ORDER' ? 'Sales Order' : 'Document';
  //   return documentNumber ? `${prefix} - ${documentNumber}` : `${prefix} Document`;
  // };

  // const fetchDocumentHTML = async () => {
  //   try {
  //     setLoading(true);
  //     const endpoint = getEndpoint();
  //     const response = await axios.get(endpoint);
  //     if (response.data.success && response.data.html) {
  //       setHtmlContent(response.data.html);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching document HTML:', error);
  //     toast.error('Failed to load document');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // NEW STATIC FILE APPROACH
  const getTitle = () => {
    return documentNumber ? `Document - ${documentNumber}` : 'Document';
  };

  // COMMENTED OUT OLD PRINT LOGIC - Preserved for rollback
  // const handlePrint = () => {
  //   if (!htmlContent) return;
  //   const printWindow = window.open('', '_blank');
  //   if (printWindow) {
  //     printWindow.document.write(htmlContent);
  //     printWindow.document.close();
  //     printWindow.focus();
  //     setTimeout(() => {
  //       printWindow.print();
  //     }, 250);
  //   }
  // };

  // NEW PRINT LOGIC - Works with iframe
  const handlePrint = () => {
    const iframe = document.getElementById('document-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
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
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {/* SECURE FILE SERVING - Uses authenticated endpoint to serve documents */}
        <div className="flex-1 overflow-auto border rounded-md bg-white">
          {documentPath ? (
            <iframe
              id="document-iframe"
              src={`/api/audit-logs/document?path=${encodeURIComponent(documentPath)}`}
              className="w-full h-full min-h-[600px] border-0"
              title="Document Viewer"
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>No document available</p>
            </div>
          )}
        </div>

        {/* COMMENTED OUT OLD RENDERING LOGIC - Preserved for rollback */}
        {/* <div className="flex-1 overflow-auto border rounded-md p-4 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading document...</span>
            </div>
          ) : htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Document is not available.</p>
            </div>
          )}
        </div> */}

        <DialogFooter className="gap-3 sm:justify-start">
          <Button variant="outline" onClick={handleCleanup} className="min-w-[120px]">
            Close
          </Button>
          <Button variant="default" onClick={handlePrint} disabled={!documentPath} className="min-w-[120px]">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
