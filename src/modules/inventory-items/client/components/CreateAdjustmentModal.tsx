import React, { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { Plus, X, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Textarea } from '@client/components/ui/textarea';

interface AdjustmentItem {
  inventoryItemId: string;
  productSku: string;
  productName: string;
  binName: string;
  location: string;
  systemQuantity: number;
  newQuantity: number | null;
  reasonCode: string;
  notes: string;
}

interface CreateAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const REASON_CODES = {
  positive: [
    { value: 'found', label: 'Found' },
    { value: 'count_error', label: 'Count Error' },
    { value: 'other', label: 'Other' },
  ],
  negative: [
    { value: 'damaged', label: 'Damaged' },
    { value: 'missing', label: 'Missing' },
    { value: 'count_error', label: 'Count Error' },
    { value: 'other', label: 'Other' },
  ],
};

export const CreateAdjustmentModal: React.FC<CreateAdjustmentModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [skuInput, setSkuInput] = useState('');
  const [skuSearching, setSkuSearching] = useState(false);
  const [skuSearchResults, setSkuSearchResults] = useState<{
    product: { id: string; sku: string; name: string };
    bins: Array<{
      inventoryItemId: string;
      binId: string;
      binName: string;
      shelfName: string;
      aisleName: string;
      zoneName: string;
      warehouseName: string;
      availableQuantity: number;
    }>;
  } | null>(null);
  const [selectedSkuBins, setSelectedSkuBins] = useState<string[]>([]);
  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([]);
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setSkuInput('');
    setSkuSearchResults(null);
    setSelectedSkuBins([]);
    setAdjustmentItems([]);
    setNotes('');
  };

  const handleSkuSearch = async () => {
    if (!skuInput.trim()) {
      toast.error('Please enter a SKU to search');
      return;
    }

    try {
      setSkuSearching(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts/search-sku', {
        params: { sku: skuInput.trim() },
      });

      if (response.data.success) {
        setSkuSearchResults(response.data.data);
        setSelectedSkuBins([]);
        toast.success(`Found ${response.data.data.bins.length} bins with stock for SKU ${skuInput.trim()}`);
      }
    } catch (error: any) {
      console.error('Error searching SKU:', error);
      if (error.response?.status === 404) {
        toast.error('No inventory items found for this SKU');
      } else {
        toast.error(error.response?.data?.message || 'Failed to search SKU');
      }
      setSkuSearchResults(null);
    } finally {
      setSkuSearching(false);
    }
  };

  const handleAddSelectedBins = () => {
    if (!skuSearchResults || selectedSkuBins.length === 0) {
      toast.error('Please select at least one bin');
      return;
    }

    const selectedBinData = skuSearchResults.bins.filter((bin) =>
      selectedSkuBins.includes(bin.binId)
    );

    const newItems: AdjustmentItem[] = selectedBinData.map((bin) => ({
      inventoryItemId: bin.inventoryItemId,
      productSku: skuSearchResults.product.sku,
      productName: skuSearchResults.product.name,
      binName: bin.binName,
      location: `${bin.warehouseName} → ${bin.zoneName} → ${bin.aisleName} → ${bin.shelfName}`,
      systemQuantity: bin.availableQuantity,
      newQuantity: null,
      reasonCode: '',
      notes: '',
    }));

    // Deduplicate by inventory item ID
    const existingIds = new Set(adjustmentItems.map((item) => item.inventoryItemId));
    const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.inventoryItemId));

    if (uniqueNewItems.length === 0) {
      toast.warning('All selected items are already in the adjustment list');
    } else {
      setAdjustmentItems([...adjustmentItems, ...uniqueNewItems]);
      toast.success(`Added ${uniqueNewItems.length} item(s) to adjustment list`);
    }

    // Reset search
    setSkuInput('');
    setSkuSearchResults(null);
    setSelectedSkuBins([]);
  };

  const handleNewQuantityChange = (inventoryItemId: string, value: string) => {
    const quantity = value === '' ? null : parseInt(value);
    setAdjustmentItems((prev) =>
      prev.map((item) =>
        item.inventoryItemId === inventoryItemId
          ? { ...item, newQuantity: quantity }
          : item
      )
    );
  };

  const handleReasonChange = (inventoryItemId: string, value: string) => {
    setAdjustmentItems((prev) =>
      prev.map((item) =>
        item.inventoryItemId === inventoryItemId
          ? { ...item, reasonCode: value }
          : item
      )
    );
  };

  const handleItemNotesChange = (inventoryItemId: string, value: string) => {
    setAdjustmentItems((prev) =>
      prev.map((item) =>
        item.inventoryItemId === inventoryItemId
          ? { ...item, notes: value }
          : item
      )
    );
  };

  const handleRemoveItem = (inventoryItemId: string) => {
    setAdjustmentItems((prev) =>
      prev.filter((item) => item.inventoryItemId !== inventoryItemId)
    );
  };

  const getReasonOptions = (systemQuantity: number, newQuantity: number | null) => {
    if (newQuantity === null) return [];
    const diff = newQuantity - systemQuantity;
    if (diff > 0) return REASON_CODES.positive;
    if (diff < 0) return REASON_CODES.negative;
    return [];
  };

  const handleSubmit = async () => {
    // Validate items
    if (adjustmentItems.length === 0) {
      toast.error('Please add at least one item to adjust');
      return;
    }

    for (const item of adjustmentItems) {
      if (item.newQuantity === null) {
        toast.error(`Please enter adjusted quantity for ${item.productSku}`);
        return;
      }
      if (item.newQuantity < 0) {
        toast.error(`Adjusted quantity cannot be negative for ${item.productSku}`);
        return;
      }
      if (item.newQuantity === item.systemQuantity) {
        toast.warning(`${item.productSku} has no change in quantity`);
      }
      if (!item.reasonCode && item.newQuantity !== item.systemQuantity) {
        toast.error(`Please select a reason for ${item.productSku}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        notes,
        items: adjustmentItems.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          newQuantity: item.newQuantity,
          reasonCode: item.reasonCode,
          notes: item.notes,
        })),
      };

      await axios.post('/api/modules/inventory-items/adjustments', payload);
      toast.success('Inventory adjustment created and applied successfully');
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      toast.error(error.response?.data?.message || 'Failed to create adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        >
        <DialogHeader>
          <DialogTitle>Create Inventory Adjustment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* SKU Search Section */}
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-semibold">Search SKU</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter SKU..."
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSkuSearch()}
              />
              <Button
                type="button"
                onClick={handleSkuSearch}
                disabled={skuSearching}
                variant="outline"
              >
                <Search className="w-4 h-4 mr-2" />
                {skuSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Search Results */}
            {skuSearchResults && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{skuSearchResults.product.name}</div>
                    <div className="text-sm text-muted-foreground">SKU: {skuSearchResults.product.sku}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSelectedBins}
                    disabled={selectedSkuBins.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Selected ({selectedSkuBins.length})
                  </Button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {skuSearchResults.bins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bins with stock found</p>
                  ) : (
                    skuSearchResults.bins.map((bin) => (
                      <div
                        key={bin.binId}
                        className={`p-2 rounded border cursor-pointer ${
                          selectedSkuBins.includes(bin.binId)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent border-transparent'
                        }`}
                        onClick={() => {
                          if (selectedSkuBins.includes(bin.binId)) {
                            setSelectedSkuBins(selectedSkuBins.filter((id) => id !== bin.binId));
                          } else {
                            setSelectedSkuBins([...selectedSkuBins, bin.binId]);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium">{bin.binName}</div>
                            <div className="text-xs text-muted-foreground">
                              {bin.warehouseName} → {bin.zoneName} → {bin.aisleName} → {bin.shelfName}
                            </div>
                          </div>
                          <div className="text-sm font-medium">Qty: {bin.availableQuantity}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Adjustment Items Table */}
          {adjustmentItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Adjustment Items ({adjustmentItems.length})</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">System Qty</TableHead>
                      <TableHead className="text-right">Adjust Qty</TableHead>
                      <TableHead className="text-right">Diff</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentItems.map((item) => {
                      const diff =
                        item.newQuantity !== null ? item.newQuantity - item.systemQuantity : 0;
                      const reasonOptions = getReasonOptions(item.systemQuantity, item.newQuantity);

                      return (
                        <TableRow key={item.inventoryItemId}>
                          <TableCell className="font-mono text-sm">{item.productSku}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.productName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.binName}</TableCell>
                          <TableCell className="text-right">{item.systemQuantity}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              value={item.newQuantity ?? ''}
                              onChange={(e) =>
                                handleNewQuantityChange(item.inventoryItemId, e.target.value)
                              }
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {item.newQuantity !== null && (
                              <Badge variant={diff > 0 ? 'default' : diff < 0 ? 'destructive' : 'secondary'}>
                                {diff > 0 ? '+' : ''}
                                {diff}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.reasonCode}
                              onValueChange={(value) => handleReasonChange(item.inventoryItemId, value)}
                              disabled={reasonOptions.length === 0}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {reasonOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.notes}
                              onChange={(e) =>
                                handleItemNotesChange(item.inventoryItemId, e.target.value)
                              }
                              placeholder="Optional"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.inventoryItemId)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* General Notes */}
          <div className="space-y-2">
            <Label>General Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this adjustment..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || adjustmentItems.length === 0}
            >
              {submitting ? 'Creating...' : 'Create Adjustment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
