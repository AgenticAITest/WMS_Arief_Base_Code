import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Label } from '@client/components/ui/label';
import { Input } from '@client/components/ui/input';
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

interface ViewAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustmentId: string;
  onSuccess?: () => void;
}

export const ViewAdjustmentModal: React.FC<ViewAdjustmentModalProps> = ({
  open,
  onOpenChange,
  adjustmentId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [adjustment, setAdjustment] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

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
      applied: 'default',
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
            <DialogTitle>View Adjustment</DialogTitle>
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
                  <div className="capitalize">{adjustment.type}</div>
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
                {adjustment.appliedAt && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Applied Date</Label>
                      <div>
                        {format(new Date(adjustment.appliedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    {adjustment.appliedBy && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Applied By</Label>
                        <div>{adjustment.appliedBy}</div>
                      </div>
                    )}
                  </>
                )}
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

            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
