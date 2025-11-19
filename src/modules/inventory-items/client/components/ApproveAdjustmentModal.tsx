import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Label } from '@client/components/ui/label';
import { Input } from '@client/components/ui/input';
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
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, CheckCircle, XCircle } from 'lucide-react';

interface ApproveAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustmentId: string;
  onSuccess?: () => void;
}

export const ApproveAdjustmentModal: React.FC<ApproveAdjustmentModalProps> = ({
  open,
  onOpenChange,
  adjustmentId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [adjustment, setAdjustment] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open && adjustmentId) {
      fetchAdjustmentDetails();
    }
  }, [open, adjustmentId]);

  const fetchAdjustmentDetails = async () => {
    try {
      setLoading(true);
      const [adjResponse, itemsResponse] = await Promise.all([
        axios.get(`/api/modules/inventory-items/adjustments/${adjustmentId}`),
        axios.get(`/api/modules/inventory-items/adjustments/${adjustmentId}/items`, {
          params: { page: 1, limit: 1000 },
        }),
      ]);

      if (adjResponse.data.success) {
        setAdjustment(adjResponse.data.data);
      }
      if (itemsResponse.data.success) {
        setItems(itemsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching adjustment details:', error);
      toast.error('Failed to load adjustment details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      await axios.post(`/api/modules/inventory-items/adjustments/${adjustmentId}/approve`);
      toast.success('Adjustment approved successfully');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error approving adjustment:', error);
      toast.error(error.response?.data?.message || 'Failed to approve adjustment');
    } finally {
      setProcessing(false);
      setApproveDialogOpen(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);
      await axios.post(`/api/modules/inventory-items/adjustments/${adjustmentId}/reject`);
      toast.success('Adjustment rejected');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error rejecting adjustment:', error);
      toast.error(error.response?.data?.message || 'Failed to reject adjustment');
    } finally {
      setProcessing(false);
      setRejectDialogOpen(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return items;
    const searchLower = searchFilter.toLowerCase();
    return items.filter(
      (item) =>
        item.productSku?.toLowerCase().includes(searchLower) ||
        item.productName?.toLowerCase().includes(searchLower)
    );
  }, [items, searchFilter]);

  if (!adjustment && !loading) {
    return null;
  }

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[80rem] sm:max-w-[80rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Adjustment</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : adjustment ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Adjustment Number</Label>
                  <div className="font-medium">{adjustment.adjustmentNumber}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(adjustment.status)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Type</Label>
                  <div className="capitalize">{adjustment.type.replace('_', ' ')}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Created Date</Label>
                  <div>
                    {format(new Date(adjustment.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Created By</Label>
                  <div>{adjustment.createdBy}</div>
                </div>
                {adjustment.notes && (
                  <div className="space-y-2 col-span-2">
                    <Label className="text-muted-foreground">Notes</Label>
                    <div>{adjustment.notes}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Adjustment Items</h3>
                  {items.length > 0 && (
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by SKU or Product Name"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  )}
                </div>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items found for this adjustment
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items match your search
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">System Qty</TableHead>
                          <TableHead className="text-right">Adjusted Qty</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => {
                          const diff = item.quantityDifference || 0;
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.productSku}</TableCell>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                <div className="font-medium">{item.binName}</div>
                                <div className="text-xs">{item.location}</div>
                              </TableCell>
                              <TableCell className="text-right">{item.systemQuantity}</TableCell>
                              <TableCell className="text-right">{item.adjustedQuantity}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    diff === 0
                                      ? 'text-muted-foreground'
                                      : diff > 0
                                      ? 'text-green-600 font-medium'
                                      : 'text-red-600 font-medium'
                                  }
                                >
                                  {diff > 0 ? '+' : ''}
                                  {diff}
                                </span>
                              </TableCell>
                              <TableCell className="capitalize">
                                {item.reasonCode?.replace(/_/g, ' ') || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={adjustment.status !== 'created'}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => setApproveDialogOpen(true)}
                  disabled={adjustment.status !== 'created'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve adjustment{' '}
              <span className="font-mono font-semibold">{adjustment?.adjustmentNumber}</span>?
              This will update the inventory quantities and generate a document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={processing}>
              {processing ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject adjustment{' '}
              <span className="font-mono font-semibold">{adjustment?.adjustmentNumber}</span>?
              This will end the adjustment process and no inventory changes will be made.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
