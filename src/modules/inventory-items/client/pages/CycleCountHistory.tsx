import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Eye, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Button } from '@client/components/ui/button';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { ViewCountModal } from '../components/ViewCountModal';
import { Badge } from '@client/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';

const CycleCountHistory: React.FC = () => {
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocumentPath, setSelectedDocumentPath] = useState<string>('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<string>('');

  useEffect(() => {
    fetchCycleCounts();
  }, []);

  const fetchCycleCounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts', {
        params: {
          page: 1,
          limit: 1000,
        },
      });
      
      const filteredCounts = (response.data.data || []).filter(
        (count: any) => count.status !== 'created'
      );
      setCycleCounts(filteredCounts);
    } catch (error: any) {
      console.error('Error fetching cycle counts:', error);
      toast.error('Failed to fetch cycle counts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCount = (id: string) => {
    setSelectedCountId(id);
    setIsViewModalOpen(true);
  };

  const handleViewDocument = async (cycleCountId: string, countNumber: string) => {
    try {
      const response = await axios.get(`/api/modules/inventory-items/cycle-counts/${cycleCountId}/document`);

      if (response.data.success && response.data.data?.documentPath) {
        setSelectedDocumentPath(response.data.data.documentPath);
        setSelectedDocumentNumber(countNumber);
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
    const variants: Record<string, any> = {
      created: 'default',
      approved: 'default',
      rejected: 'destructive',
      completed: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cycle Count History</h1>
          <p className="text-muted-foreground">View completed and processed cycle counts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycle Count Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : cycleCounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cycle count history found
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Count Number</TableHead>
                    <TableHead>Count Type</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycleCounts.map((count) => (
                    <TableRow key={count.id}>
                      <TableCell className="font-medium">{count.countNumber}</TableCell>
                      <TableCell className="capitalize">{count.countType || 'Partial'}</TableCell>
                      <TableCell>
                        {count.scheduledDate
                          ? format(new Date(count.scheduledDate), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {count.completedDate
                          ? format(new Date(count.completedDate), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(count.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCount(count.id)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(count.status === 'approved' || count.status === 'completed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(count.id, count.countNumber)}
                              title="View Document"
                            >
                              <FileText className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {selectedCountId && (
        <ViewCountModal
          open={isViewModalOpen}
          onOpenChange={setIsViewModalOpen}
          countId={selectedCountId}
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

export default withModuleAuthorization(CycleCountHistory, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
