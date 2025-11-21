import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search } from 'lucide-react';

interface ApproveCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countId: string;
  onSuccess: () => void;
}

export const ApproveCountModal: React.FC<ApproveCountModalProps> = ({
  open,
  onOpenChange,
  countId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (open && countId) {
      fetchCountDetails();
    }
  }, [open, countId]);

  const fetchCountDetails = async () => {
    try {
      setLoading(true);
      const [countResponse, itemsResponse] = await Promise.all([
        axios.get(`/api/modules/inventory-items/cycle-counts/${countId}`),
        axios.get(`/api/modules/inventory-items/cycle-counts/${countId}/items`, {
          params: { page: 1, limit: 1000 }, // Request all items for approval modal
        }),
      ]);
      
      if (countResponse.data.success) {
        const countData = countResponse.data.data;
        
        if (countData.status !== 'created') {
          toast.error('Only cycle counts with status "created" can be approved or rejected');
          onOpenChange(false);
          return;
        }
        
        setCount(countData);
      }
      if (itemsResponse.data.success) {
        setItems(itemsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching count details:', error);
      toast.error('Failed to load count details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const response = await axios.put(
        `/api/modules/inventory-items/cycle-counts/${countId}/approve`
      );
      
      if (response.data.success) {
        toast.success('Cycle count approved successfully');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error approving count:', error);
      toast.error(error.response?.data?.message || 'Failed to approve cycle count');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      const response = await axios.put(
        `/api/modules/inventory-items/cycle-counts/${countId}/reject`
      );
      
      if (response.data.success) {
        toast.success('Cycle count rejected successfully');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error rejecting count:', error);
      toast.error(error.response?.data?.message || 'Failed to reject cycle count');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return items;
    const searchLower = searchFilter.toLowerCase();
    return items.filter(
      (item) =>
        item.productSku?.toLowerCase().includes(searchLower) ||
        item.productName?.toLowerCase().includes(searchLower)
    );
  }, [items, searchFilter]);

  if (!count && !loading) {
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
          <DialogTitle>Approve Cycle Count</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : count ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Count Number</Label>
                <div className="font-medium">{count.countNumber}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <div>{getStatusBadge(count.status)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Count Type</Label>
                <div className="capitalize">{count.countType || 'Partial'}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Scheduled Date</Label>
                <div>
                  {count.scheduledDate
                    ? format(new Date(count.scheduledDate), 'MMM dd, yyyy')
                    : '-'}
                </div>
              </div>
              {count.completedDate && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Completed Date</Label>
                  <div>{format(new Date(count.completedDate), 'MMM dd, yyyy')}</div>
                </div>
              )}
              {count.notes && (
                <div className="space-y-2 col-span-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <div>{count.notes}</div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Count Items</h3>
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
                  No items found for this count
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
                        <TableHead className="text-right">Counted Qty</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const variance = item.varianceQuantity || 0;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.productSku}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.binLocation}
                            </TableCell>
                            <TableCell className="text-right">{item.systemQuantity}</TableCell>
                            <TableCell className="text-right">
                              {item.countedQuantity !== null ? item.countedQuantity : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.countedQuantity !== null && (
                                <span
                                  className={
                                    variance === 0
                                      ? 'text-muted-foreground'
                                      : variance > 0
                                      ? 'text-green-600 font-medium'
                                      : 'text-red-600 font-medium'
                                  }
                                >
                                  {variance > 0 ? '+' : ''}
                                  {variance}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                {submitting ? 'Processing...' : 'Reject'}
              </Button>
              <Button onClick={handleApprove} disabled={submitting}>
                {submitting ? 'Processing...' : 'Approve'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
