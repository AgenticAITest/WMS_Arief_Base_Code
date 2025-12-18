import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Label } from '@client/components/ui/label';
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
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Authorized from '@client/components/auth/Authorized';

interface ApproveRelocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relocationId: string;
  onSuccess: () => void;
}

export const ApproveRelocationModal: React.FC<ApproveRelocationModalProps> = ({
  open,
  onOpenChange,
  relocationId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [relocation, setRelocation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (open && relocationId) {
      fetchRelocationDetails();
    }
  }, [open, relocationId]);

  const fetchRelocationDetails = async () => {
    try {
      setLoading(true);
      const [relocationResponse, itemsResponse] = await Promise.all([
        axios.get(`/api/modules/inventory-items/relocations/${relocationId}`),
        axios.get(`/api/modules/inventory-items/relocations/${relocationId}/items`, {
          params: { page: 1, limit: 1000 },
        }),
      ]);

      if (relocationResponse.data.success) {
        const relocationData = relocationResponse.data.data;

        if (relocationData.status !== 'created') {
          toast.error('Only relocations with status "created" can be approved or rejected');
          onOpenChange(false);
          return;
        }

        setRelocation(relocationData);
      }
      if (itemsResponse.data.success) {
        setItems(itemsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching relocation details:', error);
      toast.error('Failed to load relocation details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post(
        `/api/modules/inventory-items/relocations/${relocationId}/approve`
      );

      if (response.data.success) {
        toast.success('Relocation approved successfully');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error approving relocation:', error);
      toast.error(error.response?.data?.message || 'Failed to approve relocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post(
        `/api/modules/inventory-items/relocations/${relocationId}/reject`
      );

      if (response.data.success) {
        toast.success('Relocation rejected successfully');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error rejecting relocation:', error);
      toast.error(error.response?.data?.message || 'Failed to reject relocation');
    } finally {
      setSubmitting(false);
    }
  };

  if (!relocation && !loading) {
    return null;
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80rem] sm:max-w-[80rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve Relocation</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : relocation ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Relocation Number</Label>
                <div className="font-medium">{relocation.relocationNumber}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <div>{getStatusBadge(relocation.status)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Created Date</Label>
                <div>
                  {relocation.createdAt
                    ? format(new Date(relocation.createdAt), 'MMM dd, yyyy HH:mm')
                    : '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Item Count</Label>
                <div>{items.length}</div>
              </div>
              {relocation.notes && (
                <div className="space-y-2 col-span-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <div>{relocation.notes}</div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Relocation Items</h3>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items found for this relocation
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>From Location</TableHead>
                        <TableHead>To Location</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productSku}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.fromLocation}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.toLocation}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Authorized roles="ADMIN" permissions="inventory-items.relocation.approval">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={submitting}
              >
                {submitting ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button onClick={handleApprove} disabled={submitting}>
                {submitting ? 'Approving...' : 'Approve'}
              </Button>
              </Authorized>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
