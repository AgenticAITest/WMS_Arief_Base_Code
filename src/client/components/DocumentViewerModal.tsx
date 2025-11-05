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
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentPath) {
      fetchDocument();
    }
    return () => {
      // Cleanup blob URL to free memory
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, documentPath]);

  const getTitle = () => {
    return documentNumber ? `Document - ${documentNumber}` : 'Document';
  };

  const fetchDocument = async () => {
    try {
      setLoading(true);
      // Fetch document via authenticated axios request
      const response = await axios.get(`/api/audit-logs/document`, {
        params: { path: documentPath },
        responseType: 'text', // Get HTML as text
      });
      
      // Create a blob from the HTML content
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

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

        {/* BLOB URL APPROACH - Fetches via authenticated axios, creates blob URL for iframe */}
        <div className="flex-1 overflow-auto border rounded-md bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading document...</span>
            </div>
          ) : blobUrl ? (
            <iframe
              id="document-iframe"
              src={blobUrl}
              className="w-full h-full min-h-[600px] border-0"
              title="Document Viewer"
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>No document available</p>
            </div>
          )}
        </div>

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
