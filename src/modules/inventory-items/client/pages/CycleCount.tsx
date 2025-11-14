import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { Plus, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { StartCountModal } from '../components/StartCountModal';
import { format } from 'date-fns';
import { Badge } from '@client/components/ui/badge';

interface CycleCount {
  id: string;
  countNumber: string;
  status: string;
  countType: string;
  scheduledDate: string | null;
  completedDate: string | null;
  totalVarianceAmount: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const CycleCount = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [startModalOpen, setStartModalOpen] = useState(false);

  useEffect(() => {
    fetchCycleCounts();
  }, [pagination.page]);

  const fetchCycleCounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      if (response.data.success) {
        setCycleCounts(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching cycle counts:', error);
      toast.error('Failed to load cycle counts');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSuccess = (id: string, countNumber: string) => {
    toast.success(`Cycle count ${countNumber} started`);
    // Navigate to the detail page
    navigate(`/modules/inventory-items/cycle-count/${id}`);
  };

  const handleViewDetails = (id: string) => {
    navigate(`/modules/inventory-items/cycle-count/${id}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      created: 'default',
      approved: 'success',
      rejected: 'destructive',
      completed: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cycle Count / Audit</h1>
          <p className="text-muted-foreground">
            Perform physical inventory counts and audits
          </p>
        </div>
        <Button onClick={() => setStartModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Cycle Count
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycle Counts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading cycle counts...
            </div>
          ) : cycleCounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No cycle counts found</p>
              <p className="text-sm mt-2">
                Start your first cycle count to begin tracking inventory accuracy
              </p>
              <Button
                onClick={() => setStartModalOpen(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Cycle Count
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Count Number</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Scheduled Date</th>
                      <th className="text-left py-3 px-4 font-medium">Completed Date</th>
                      <th className="text-left py-3 px-4 font-medium">Total Variance</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleCounts.map((count) => (
                      <tr key={count.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{count.countNumber}</td>
                        <td className="py-3 px-4 capitalize">{count.countType}</td>
                        <td className="py-3 px-4">{getStatusBadge(count.status)}</td>
                        <td className="py-3 px-4">
                          {count.scheduledDate
                            ? format(new Date(count.scheduledDate), 'MMM dd, yyyy')
                            : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {count.completedDate
                            ? format(new Date(count.completedDate), 'MMM dd, yyyy')
                            : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {count.totalVarianceAmount
                            ? `$${parseFloat(count.totalVarianceAmount).toFixed(2)}`
                            : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(count.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} cycle counts
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <StartCountModal
        open={startModalOpen}
        onOpenChange={setStartModalOpen}
        onSuccess={handleStartSuccess}
      />
    </div>
  );
};

export default withModuleAuthorization(CycleCount, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
