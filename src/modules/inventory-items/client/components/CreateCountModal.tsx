import React, { useState, useEffect } from 'react';
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
import { Plus, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface FilterOptions {
  inventoryTypes: Array<{ id: string; name: string }>;
  zones: Array<{ id: string; name: string; warehouseId: string; warehouseName: string }>;
  bins: Array<{
    id: string;
    name: string;
    shelfId: string;
    shelfName: string;
    aisleId: string;
    aisleName: string;
    zoneId: string;
    zoneName: string;
    warehouseId: string;
    warehouseName: string;
  }>;
  countTypes: Array<{ value: string; label: string }>;
}

interface CountItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  binId: string;
  binName: string;
  shelfName: string;
  aisleName: string;
  zoneName: string;
  warehouseName: string;
  systemQuantity: number;
  countedQuantity: number | null;
  reason: string;
  notes: string;
}

interface CreateCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateCountModal: React.FC<CreateCountModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [selectedBinIds, setSelectedBinIds] = useState<string[]>([]);
  const [showBinPicker, setShowBinPicker] = useState(false);
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  const [itemsVisible, setItemsVisible] = useState(false);
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Manual SKU addition state
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

  useEffect(() => {
    if (open) {
      fetchFilterOptions();
    } else {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedBinIds([]);
    setShowBinPicker(false);
    setInventoryTypeFilter('');
    setScheduledDate('');
    setNotes('');
    setItemsVisible(false);
    setCountItems([]);
    setSearchFilter('');
    setSkuInput('');
    setSkuSearchResults(null);
    setSelectedSkuBins([]);
  };

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts/filter-options');
      setFilterOptions(response.data.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      toast.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCount = async () => {
    // Validate that at least one bin is selected
    if (selectedBinIds.length === 0) {
      toast.error('Please select at least one bin to count');
      return;
    }

    try {
      setStarting(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts/items', {
        params: {
          countType: 'partial',
          binIds: selectedBinIds.join(','),
          inventoryTypeId: inventoryTypeFilter || undefined,
        },
      });

      const items = response.data.data || [];
      if (items.length === 0) {
        toast.error('No inventory items found in the selected bins');
        return;
      }

      setCountItems(items.map((item: any) => ({
        ...item,
        countedQuantity: null,
        reason: '',
        notes: '',
      })));
      setItemsVisible(true);
      toast.success(`${items.length} items loaded for counting`);
    } catch (error: any) {
      console.error('Error starting count:', error);
      toast.error(error.response?.data?.message || 'Failed to load count items');
    } finally {
      setStarting(false);
    }
  };

  const handleCountedQuantityChange = (itemId: string, value: string) => {
    const quantity = value === '' ? null : parseInt(value);
    setCountItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, countedQuantity: quantity } : item
      )
    );
  };

  const handleReasonChange = (itemId: string, value: string) => {
    setCountItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, reason: value } : item
      )
    );
  };

  const handleNotesChange = (itemId: string, value: string) => {
    setCountItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, notes: value } : item
      )
    );
  };

  // Filter items based on search text
  const filteredCountItems = countItems.filter((item) => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return (
      item.productSku.toLowerCase().includes(searchLower) ||
      item.productName.toLowerCase().includes(searchLower)
    );
  });

  const handleSubmit = async () => {
    const itemsWithCounts = countItems.filter((item) => item.countedQuantity !== null);
    
    if (itemsWithCounts.length === 0) {
      toast.error('Please count at least one item before submitting');
      return;
    }

    // Validate that items with diff have a reason
    const itemsWithDiff = itemsWithCounts.filter(
      (item) => item.countedQuantity !== item.systemQuantity
    );
    const missingReason = itemsWithDiff.find((item) => !item.reason);
    if (missingReason) {
      toast.error('Please provide a reason for all items with differences');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        countType: 'partial',
        scheduledDate: scheduledDate || undefined,
        notes: notes || undefined,
        items: itemsWithCounts.map((item) => ({
          productId: item.productId,
          binId: item.binId,
          systemQuantity: item.systemQuantity,
          countedQuantity: item.countedQuantity!,
          reason: item.reason || undefined,
          notes: item.notes || undefined,
        })),
      };

      const response = await axios.post('/api/modules/inventory-items/cycle-counts', payload);
      
      if (response.data.success) {
        toast.success(`Cycle count ${response.data.data.countNumber} created successfully`);
        onSuccess();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error submitting count:', error);
      toast.error(error.response?.data?.message || 'Failed to create cycle count');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBin = (binId: string) => {
    if (!selectedBinIds.includes(binId)) {
      setSelectedBinIds([...selectedBinIds, binId]);
    }
    setShowBinPicker(false);
  };

  const handleRemoveBin = (binId: string) => {
    setSelectedBinIds(selectedBinIds.filter((id) => id !== binId));
    // Remove items from this bin from the count items list
    setCountItems(countItems.filter((item) => item.binId !== binId));
    // If no items left, hide the items section
    if (countItems.filter((item) => item.binId !== binId).length === 0) {
      setItemsVisible(false);
    }
  };

  const handleSearchSku = async () => {
    if (!skuInput.trim()) {
      toast.error('Please enter a SKU');
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
        toast.error('SKU not found');
      } else {
        toast.error(error.response?.data?.message || 'Failed to search SKU');
      }
      setSkuSearchResults(null);
    } finally {
      setSkuSearching(false);
    }
  };

  const handleAddSkuBins = async () => {
    if (selectedSkuBins.length === 0) {
      toast.error('Please select at least one bin to add');
      return;
    }

    if (!skuSearchResults) return;

    try {
      // Get the selected bin details from search results
      const selectedBinDetails = skuSearchResults.bins.filter((bin) =>
        selectedSkuBins.includes(bin.binId)
      );

      // Create count items from selected bins
      const newCountItems: CountItem[] = selectedBinDetails.map((bin) => ({
        id: bin.inventoryItemId,
        productId: skuSearchResults.product.id,
        productSku: skuSearchResults.product.sku,
        productName: skuSearchResults.product.name,
        binId: bin.binId,
        binName: bin.binName,
        shelfName: bin.shelfName,
        aisleName: bin.aisleName,
        zoneName: bin.zoneName,
        warehouseName: bin.warehouseName,
        systemQuantity: bin.availableQuantity,
        countedQuantity: null,
        reason: '',
        notes: '',
      }));

      // Filter out duplicates (items already in the count list)
      const existingItemIds = new Set(countItems.map((item) => item.id));
      const uniqueNewItems = newCountItems.filter((item) => !existingItemIds.has(item.id));

      if (uniqueNewItems.length === 0) {
        toast.warning('All selected items are already in the count list');
      } else {
        setCountItems([...countItems, ...uniqueNewItems]);
        setItemsVisible(true);
        toast.success(`Added ${uniqueNewItems.length} item(s) to count list`);
      }

      // Clear SKU search
      setSkuInput('');
      setSkuSearchResults(null);
      setSelectedSkuBins([]);
    } catch (error: any) {
      console.error('Error adding SKU items:', error);
      toast.error('Failed to add items to count list');
    }
  };

  const handleToggleSkuBin = (binId: string) => {
    if (selectedSkuBins.includes(binId)) {
      setSelectedSkuBins(selectedSkuBins.filter((id) => id !== binId));
    } else {
      setSelectedSkuBins([...selectedSkuBins, binId]);
    }
  };

  const availableBins = (filterOptions?.bins || []).filter(
    (bin) => !selectedBinIds.includes(bin.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Create Cycle Count</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Inventory Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="inventoryType">Inventory Type Filter (Optional)</Label>
              <Select value={inventoryTypeFilter} onValueChange={setInventoryTypeFilter}>
                <SelectTrigger id="inventoryType">
                  <SelectValue placeholder="All Inventory Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Inventory Types</SelectItem>
                  {filterOptions?.inventoryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When selected, only items of this type from chosen bins will be loaded
              </p>
            </div>

            <div className="space-y-2">
                <Label>Bins to Count (Optional)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedBinIds.map((binId) => {
                    const bin = filterOptions?.bins.find((b) => b.id === binId);
                    return (
                      <div key={binId} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {bin?.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveBin(binId);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {!showBinPicker ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBinPicker(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bin
                  </Button>
                ) : (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Select Bin</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBinPicker(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {availableBins.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No bins available
                        </p>
                      ) : (
                        availableBins.map((bin) => (
                          <div
                            key={bin.id}
                            className="p-2 hover:bg-accent rounded cursor-pointer"
                            onClick={() => handleAddBin(bin.id)}
                          >
                            <div className="text-sm font-medium">{bin.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {bin.warehouseName} → {bin.zoneName} → {bin.aisleName} →{' '}
                              {bin.shelfName}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

            {/* Manual SKU Addition Section */}
            <div className="space-y-2">
              <Label>Add by SKU</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter SKU to search"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSku();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleSearchSku}
                  disabled={skuSearching || !skuInput.trim()}
                >
                  {skuSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>

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
                      onClick={handleAddSkuBins}
                      disabled={selectedSkuBins.length === 0}
                    >
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
                          onClick={() => handleToggleSkuBin(bin.binId)}
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

            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes"
              />
            </div>
          </div>

          <div>
            <Button
              onClick={handleStartCount}
              disabled={starting || loading}
              className="w-full"
            >
              {starting ? 'Loading Items...' : 'Start Count'}
            </Button>
          </div>

          {itemsVisible && countItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Count Items ({filteredCountItems.length})</h3>
                <div className="w-72">
                  <Input
                    placeholder="Search by SKU or Product Name..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">System Qty</TableHead>
                      <TableHead className="text-right">Counted Qty</TableHead>
                      <TableHead className="text-right">Diff</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCountItems.map((item) => {
                      const diff =
                        item.countedQuantity !== null
                          ? item.countedQuantity - item.systemQuantity
                          : null;
                      const hasDiff = diff !== null && diff !== 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productSku}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.warehouseName} → {item.zoneName} → {item.aisleName} → {item.shelfName} → {item.binName}
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
                            {diff !== null && (
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
                            )}
                          </TableCell>
                          <TableCell>
                            {hasDiff && (
                              <Select 
                                value={item.reason} 
                                onValueChange={(value) => handleReasonChange(item.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                  <SelectItem value="missing">Missing</SelectItem>
                                  <SelectItem value="found">Found</SelectItem>
                                  <SelectItem value="count_error">Count Error</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasDiff && (
                              <Input
                                value={item.notes}
                                onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                className="w-48"
                                placeholder="Add notes..."
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Count'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
