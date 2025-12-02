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

interface ViewCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countId: string;
}

export const ViewCountModal: React.FC<ViewCountModalProps> = ({
  open,
  onOpenChange,
  countId,
}) => {
  const [loading, setLoading] = useState(false);
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
        axios.get(`/api/modules/inventory-items/cycle-counts/${countId}/items`),
      ]);
      
      if (countResponse.data.success) {
        setCount(countResponse.data.data);
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
          <DialogTitle>View Cycle Count</DialogTitle>
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
                <Label className="text-muted-foreground">Count Type</Label>
                <div className="capitalize">{count.countType || 'Partial'}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Created Date</Label>
                <div>
                  {format(new Date(count.createdAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Created By</Label>
                <div>{count.createdBy}</div>
              </div>
              {count.completedDate && (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Completed Date</Label>
                    <div>{format(new Date(count.completedDate), 'MMM dd, yyyy')}</div>
                  </div>
                  {count.approvedBy && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Approval By</Label>
                      <div>{count.approvedBy}</div>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <div>{getStatusBadge(count.status)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Scheduled Date</Label>
                <div>
                  {count.scheduledDate
                    ? format(new Date(count.scheduledDate), 'MMM dd, yyyy')
                    : '-'}
                </div>
              </div>
              {count.notes && (
                <div className="space-y-2">
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
                        <TableHead>Reason</TableHead>
                        <TableHead>Notes</TableHead>
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
                              <div className="font-medium">{item.binName}</div>
                              <div className="text-xs">{item.binLocation}</div>
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
                            <TableCell className="capitalize">
                              {item.reasonCode?.replace(/_/g, ' ') || '-'}
                            </TableCell>
                            <TableCell className="capitalize">
                              {item.reasonDescription?.replace(/_/g, ' ') || '-'}
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
  );
};
