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
import { ApproveCountModal } from '../components/ApproveCountModal';
import { Badge } from '@client/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CycleCountApprove: React.FC = () => {
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);

  useEffect(() => {
    fetchCycleCounts();
  }, []);

  const fetchCycleCounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts', {
        params: {
          status: 'created',
          page: 1,
          limit: 100,
        },
      });
      setCycleCounts(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching cycle counts:', error);
      toast.error('Failed to fetch cycle counts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCount = (id: string) => {
    setSelectedCountId(id);
    setIsApproveModalOpen(true);
  };

  const handleApproveSuccess = () => {
    setIsApproveModalOpen(false);
    setSelectedCountId(null);
    fetchCycleCounts();
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Approve Cycle Counts</h1>
          <p className="text-muted-foreground">Review and approve inventory cycle counts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approval</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : cycleCounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cycle counts pending approval
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Count Number</TableHead>
                    <TableHead>Count Type</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Created Date</TableHead>
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
                        {count.createdAt
                          ? format(new Date(count.createdAt), 'MMM dd, yyyy HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(count.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCount(count.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
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

      {selectedCountId && (
        <ApproveCountModal
          open={isApproveModalOpen}
          onOpenChange={setIsApproveModalOpen}
          countId={selectedCountId}
          onSuccess={handleApproveSuccess}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(CycleCountApprove, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
