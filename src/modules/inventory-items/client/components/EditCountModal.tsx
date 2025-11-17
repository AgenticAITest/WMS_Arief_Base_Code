import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
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

interface EditCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countId: string;
  onSuccess: () => void;
}

export const EditCountModal: React.FC<EditCountModalProps> = ({
  open,
  onOpenChange,
  countId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
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
        const countData = countResponse.data.data;
        
        if (countData.status !== 'created') {
          toast.error('Only cycle counts with status "created" can be edited');
          onOpenChange(false);
          return;
        }
        
        setCount(countData);
        setScheduledDate(countData.scheduledDate || '');
        setNotes(countData.notes || '');
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

  const handleCountedQuantityChange = (itemId: string, value: string) => {
    const quantity = value === '' ? null : parseInt(value);
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              countedQuantity: quantity,
              varianceQuantity:
                quantity !== null ? quantity - item.systemQuantity : null,
            }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        scheduledDate: scheduledDate || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          itemId: item.id,
          countedQuantity: item.countedQuantity,
        })),
      };

      const response = await axios.put(
        `/api/modules/inventory-items/cycle-counts/${countId}`,
        payload
      );
      
      if (response.data.success) {
        toast.success('Cycle count updated successfully');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating count:', error);
      toast.error(error.response?.data?.message || 'Failed to update cycle count');
    } finally {
      setSubmitting(false);
    }
  };

  if (!count && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80rem] sm:max-w-[80rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Cycle Count</DialogTitle>
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
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes"
                />
              </div>
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
                              {item.locationPath}
                            </TableCell>
                            <TableCell className="text-right">{item.systemQuantity}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                value={item.countedQuantity === null ? '' : item.countedQuantity}
                                onChange={(e) =>
                                  handleCountedQuantityChange(item.id, e.target.value)
                                }
                                className="w-24 text-right"
                                placeholder="0"
                              />
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Count'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
