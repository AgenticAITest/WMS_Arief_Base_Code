import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Eye } from 'lucide-react';
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
import { ApproveRelocationModal } from '../components/ApproveRelocationModal';
import { Badge } from '@client/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

const RelocationApprove: React.FC = () => {
  const [relocations, setRelocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
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
          status: 'created',
          page: 1,
          perPage: 100,
        },
      });
      const relocationsList = response.data.data || [];
      setRelocations(relocationsList);

      const counts: Record<string, number> = {};
      await Promise.all(
        relocationsList.map(async (reloc: any) => {
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
    setIsApproveModalOpen(true);
  };

  const handleApproveSuccess = () => {
    setIsApproveModalOpen(false);
    setSelectedRelocationId(null);
    fetchRelocations();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      created: 'default',
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Approve Relocations</h1>
          <p className="text-muted-foreground">Review and approve inventory relocations</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approval</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : relocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No relocations pending approval
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Relocation Number</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
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
                      <TableCell>{getStatusBadge(relocation.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRelocation(relocation.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
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

      {selectedRelocationId && (
        <ApproveRelocationModal
          open={isApproveModalOpen}
          onOpenChange={setIsApproveModalOpen}
          relocationId={selectedRelocationId}
          onSuccess={handleApproveSuccess}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(RelocationApprove, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
