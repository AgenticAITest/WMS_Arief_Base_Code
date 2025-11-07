import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface AllocationPrintViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocationData: {
    allocationNumber: string;
    documentPath: string;
  };
}

export const AllocationPrintView: React.FC<AllocationPrintViewProps> = ({
  open,
  onOpenChange,
  allocationData,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && allocationData?.documentPath) {
      fetchDocument();
    } else {
      setLoading(false);
    }
    
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, allocationData?.documentPath]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/audit-logs/document`, {
        params: { path: allocationData.documentPath },
        responseType: 'text',
      });
      
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error('Error fetching allocation document:', error);
      toast.error('Failed to load allocation document');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('allocation-document-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  if (!allocationData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Allocation Completed Successfully - {allocationData.allocationNumber}</DialogTitle>
        </DialogHeader>

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
            id="allocation-document-iframe"
            src={blobUrl}
            className="w-full h-[600px] border-0"
            title="Allocation Document"
          />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              No document available
            </div>
          </div>
        )}

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
