import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
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

interface ViewRelocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relocationId: string;
}

export const ViewRelocationModal: React.FC<ViewRelocationModalProps> = ({
  open,
  onOpenChange,
  relocationId,
}) => {
  const [loading, setLoading] = useState(false);
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
        axios.get(`/api/modules/inventory-items/relocations/${relocationId}/items`),
      ]);

      if (relocationResponse.data.success) {
        setRelocation(relocationResponse.data.data);
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

  if (!relocation && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80rem] sm:max-w-[80rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>View Relocation</DialogTitle>
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
              {relocation.approvedAt && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Approved Date</Label>
                  <div>{format(new Date(relocation.approvedAt), 'MMM dd, yyyy HH:mm')}</div>
                </div>
              )}
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
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
