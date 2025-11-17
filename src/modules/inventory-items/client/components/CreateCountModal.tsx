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
  locationPath: string;
  systemQuantity: number;
  countedQuantity: number | null;
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

  const [inventoryTypeId, setInventoryTypeId] = useState<string>('__all__');
  const [zoneId, setZoneId] = useState<string>('__all__');
  const [countType, setCountType] = useState<string>('partial');
  const [selectedBinIds, setSelectedBinIds] = useState<string[]>([]);
  const [showBinPicker, setShowBinPicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  const [itemsVisible, setItemsVisible] = useState(false);
  const [countItems, setCountItems] = useState<CountItem[]>([]);

  const [filterSnapshot, setFilterSnapshot] = useState<{
    inventoryTypeId: string;
    zoneId: string;
    countType: string;
    selectedBinIds: string[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchFilterOptions();
    } else {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (!filterSnapshot) return;

    // Only reset items if non-bin filters changed (inventory type, zone, count type)
    // Bin selection changes shouldn't reset the items
    if (
      filterSnapshot.inventoryTypeId !== inventoryTypeId ||
      filterSnapshot.zoneId !== zoneId ||
      filterSnapshot.countType !== countType
    ) {
      setItemsVisible(false);
      setCountItems([]);
      setFilterSnapshot(null);
    }
  }, [inventoryTypeId, zoneId, countType, filterSnapshot]);

  const resetForm = () => {
    setInventoryTypeId('__all__');
    setZoneId('__all__');
    setCountType('partial');
    setSelectedBinIds([]);
    setShowBinPicker(false);
    setScheduledDate('');
    setNotes('');
    setItemsVisible(false);
    setCountItems([]);
    setFilterSnapshot(null);
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
    try {
      setStarting(true);
      const response = await axios.get('/api/modules/inventory-items/cycle-counts/items', {
        params: {
          inventoryTypeId: inventoryTypeId === '__all__' ? undefined : inventoryTypeId,
          zoneId: zoneId === '__all__' ? undefined : zoneId,
          countType,
          binIds: countType === 'partial' ? selectedBinIds.join(',') : undefined,
        },
      });

      const items = response.data.data || [];
      if (items.length === 0) {
        toast.error('No inventory items found matching the selected filters');
        return;
      }

      setCountItems(items.map((item: any) => ({
        ...item,
        countedQuantity: null,
      })));
      setItemsVisible(true);
      setFilterSnapshot({
        inventoryTypeId,
        zoneId,
        countType,
        selectedBinIds: [...selectedBinIds],
      });
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

  const handleSubmit = async () => {
    const itemsWithCounts = countItems.filter((item) => item.countedQuantity !== null);
    
    if (itemsWithCounts.length === 0) {
      toast.error('Please count at least one item before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        countType,
        inventoryTypeId: inventoryTypeId === '__all__' ? undefined : inventoryTypeId,
        zoneId: zoneId === '__all__' ? undefined : zoneId,
        binIds: countType === 'partial' ? selectedBinIds : undefined,
        scheduledDate: scheduledDate || undefined,
        notes: notes || undefined,
        items: itemsWithCounts.map((item) => ({
          productId: item.productId,
          binId: item.binId,
          systemQuantity: item.systemQuantity,
          countedQuantity: item.countedQuantity!,
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
    console.log('handleRemoveBin called with binId:', binId);
    console.log('Current selectedBinIds:', selectedBinIds);
    const newBinIds = selectedBinIds.filter((id) => id !== binId);
    console.log('New selectedBinIds:', newBinIds);
    setSelectedBinIds(newBinIds);
  };

  const filteredBins = filterOptions?.bins.filter((bin) => {
    if (zoneId && zoneId !== '__all__' && bin.zoneId !== zoneId) return false;
    return true;
  }) || [];

  const availableBins = filteredBins.filter(
    (bin) => !selectedBinIds.includes(bin.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Cycle Count</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="countType">Count Type</Label>
              <Select value={countType} onValueChange={setCountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select count type" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions?.countTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventoryType">Inventory Type (Optional)</Label>
              <Select value={inventoryTypeId} onValueChange={setInventoryTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All inventory types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All inventory types</SelectItem>
                  {filterOptions?.inventoryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone">Zone (Optional)</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All zones</SelectItem>
                  {filterOptions?.zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.warehouseName} - {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {countType === 'partial' && (
              <div className="space-y-2 col-span-2">
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
                          {zoneId
                            ? 'No bins available in selected zone'
                            : 'No bins available'}
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
            )}

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
              <h3 className="text-lg font-semibold">Count Items</h3>
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
                    {countItems.map((item) => {
                      const variance =
                        item.countedQuantity !== null
                          ? item.countedQuantity - item.systemQuantity
                          : null;
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
                            {variance !== null && (
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
