import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Eye, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import { ViewRelocationModal } from '../components/ViewRelocationModal';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

interface Relocation {
  id: string;
  relocationNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdBy: string;
  approvedBy: string | null;
}

const RelocationHistory: React.FC = () => {
  const [relocations, setRelocations] = useState<Relocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocumentPath, setSelectedDocumentPath] = useState<string>('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<string>('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRelocationId, setSelectedRelocationId] = useState<string | null>(null);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchRelocations();
  }, []);

  const fetchRelocations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/relocations', {
        params: {
          page: 1,
          limit: 1000,
        },
      });

      const filteredRelocations = (response.data.data || []).filter(
        (reloc: Relocation) => reloc.status !== 'created'
      );
      setRelocations(filteredRelocations);

      const counts: Record<string, number> = {};
      await Promise.all(
        filteredRelocations.map(async (reloc: Relocation) => {
          try {
            const itemsResponse = await axios.get(
              `/api/modules/inventory-items/relocations/${reloc.id}/items`,
              {
                params: { page: 1, limit: 1 },
              }
            );
            counts[reloc.id] = itemsResponse.data.pagination?.total || 0;
          } catch (error) {
            counts[reloc.id] = 0;
          }
        })
      );
      setItemCounts(counts);
    } catch (error: any) {
      console.error('Error fetching relocations:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch relocations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRelocation = (id: string) => {
    setSelectedRelocationId(id);
    setViewModalOpen(true);
  };

  const handleViewDocument = async (relocationId: string, relocationNumber: string) => {
    try {
      const response = await axios.get(`/api/modules/inventory-items/relocations/${relocationId}/document`);

      if (response.data.success && response.data.data?.documentPath) {
        setSelectedDocumentPath(response.data.data.documentPath);
        setSelectedDocumentNumber(relocationNumber);
        setDocumentViewerOpen(true);
      } else {
        toast.error('Document not found');
      }
    } catch (error: any) {
      console.error('Error fetching document:', error);
      toast.error(error.response?.data?.message || 'Failed to load document');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      created: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relocation History</h1>
          <p className="text-muted-foreground">
            View all approved and rejected inventory relocations
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : relocations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No relocation history found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Relocation Number</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Processed Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relocations.map((relocation) => (
                <TableRow key={relocation.id}>
                  <TableCell className="font-medium">{relocation.relocationNumber}</TableCell>
                  <TableCell>{itemCounts[relocation.id] || 0}</TableCell>
                  <TableCell>
                    {relocation.createdAt
                      ? format(new Date(relocation.createdAt), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {relocation.approvedAt
                      ? format(new Date(relocation.approvedAt), 'MMM dd, yyyy HH:mm')
                      : relocation.rejectedAt
                      ? format(new Date(relocation.rejectedAt), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(relocation.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewRelocation(relocation.id)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {relocation.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(relocation.id, relocation.relocationNumber)}
                          title="View Document"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedRelocationId && (
        <ViewRelocationModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          relocationId={selectedRelocationId}
        />
      )}

      <DocumentViewerModal
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        documentPath={selectedDocumentPath}
        documentNumber={selectedDocumentNumber}
      />
    </div>
  );
};

export default withModuleAuthorization(RelocationHistory, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items',
});
