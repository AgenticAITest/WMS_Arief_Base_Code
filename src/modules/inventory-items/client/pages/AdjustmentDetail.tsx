import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { ArrowLeft, Edit, CheckCircle, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { EditAdjustmentModal } from '../components/EditAdjustmentModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/alert-dialog';

interface AdjustmentItem {
  id: string;
  productSku: string;
  productName: string;
  binName: string;
  location: string;
  systemQuantity: number;
  adjustedQuantity: number;
  quantityDifference: number;
  reasonCode: string;
  notes: string | null;
}

interface Adjustment {
  id: string;
  adjustmentNumber: string;
  status: string;
  type: string;
  notes: string | null;
  createdAt: string;
  createdBy: string;
  appliedAt: string | null;
  appliedBy: string | null;
}

const AdjustmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAdjustmentDetails();
    }
  }, [id]);

  const fetchAdjustmentDetails = async () => {
    try {
      setLoading(true);
      const [adjResponse, itemsResponse] = await Promise.all([
        axios.get(`/api/modules/inventory-items/adjustments/${id}`),
        axios.get(`/api/modules/inventory-items/adjustments/${id}/items`, {
          params: { page: 1, limit: 1000 },
        }),
      ]);

      setAdjustment(adjResponse.data.data);
      setItems(itemsResponse.data.data || []);
    } catch (error: any) {
      console.error('Error fetching adjustment details:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch adjustment details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!id) return;

    try {
      setApplying(true);
      await axios.post(`/api/modules/inventory-items/adjustments/${id}/apply`);
      toast.success('Adjustment applied successfully');
      fetchAdjustmentDetails();
    } catch (error: any) {
      console.error('Error applying adjustment:', error);
      toast.error(error.response?.data?.message || 'Failed to apply adjustment');
    } finally {
      setApplying(false);
      setApplyDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      created: 'secondary',
      applied: 'default',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!adjustment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Adjustment not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{adjustment.adjustmentNumber}</h2>
          <p className="text-muted-foreground">Inventory Adjustment Details</p>
        </div>
        <div className="flex gap-2">
          {adjustment.status === 'created' && (
            <>
              <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button onClick={() => setApplyDialogOpen(true)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Adjustment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Adjustment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="mt-1">{getStatusBadge(adjustment.status)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="mt-1 capitalize">{adjustment.type}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created Date</div>
              <div className="mt-1">
                {format(new Date(adjustment.createdAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created By</div>
              <div className="mt-1">{adjustment.createdBy}</div>
            </div>
            {adjustment.appliedAt && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">Applied Date</div>
                  <div className="mt-1">
                    {format(new Date(adjustment.appliedAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Applied By</div>
                  <div className="mt-1">{adjustment.appliedBy || '-'}</div>
                </div>
              </>
            )}
            {adjustment.notes && (
              <div className="col-span-2 md:col-span-3">
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="mt-1">{adjustment.notes}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Items */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustment Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Adjusted Qty</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.productSku}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.productName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="font-medium">{item.binName}</div>
                      <div className="text-xs">{item.location}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.systemQuantity}</TableCell>
                    <TableCell className="text-right">{item.adjustedQuantity}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          item.quantityDifference > 0
                            ? 'default'
                            : item.quantityDifference < 0
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {item.quantityDifference > 0 ? '+' : ''}
                        {item.quantityDifference}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{item.reasonCode.replace('_', ' ')}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {adjustment.status === 'created' && (
        <EditAdjustmentModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          adjustmentId={id!}
          onSuccess={fetchAdjustmentDetails}
        />
      )}

      {/* Apply Confirmation Dialog */}
      <AlertDialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply adjustment{' '}
              <span className="font-mono font-semibold">{adjustment.adjustmentNumber}</span>?
              This will update the inventory quantities and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply} disabled={applying}>
              {applying ? 'Applying...' : 'Apply'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default withModuleAuthorization(AdjustmentDetail, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items',
});
