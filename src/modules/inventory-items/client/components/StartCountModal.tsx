import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Label } from '@client/components/ui/label';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { Badge } from '@client/components/ui/badge';

interface InventoryType {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  name: string;
  warehouseId: string;
  warehouseName: string;
}

interface Bin {
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
}

interface CountType {
  value: string;
  label: string;
}

interface FilterOptions {
  inventoryTypes: InventoryType[];
  zones: Zone[];
  bins: Bin[];
  countTypes: CountType[];
}

interface StartCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (cycleCountId: string, countNumber: string) => void;
}

export function StartCountModal({ open, onOpenChange, onSuccess }: StartCountModalProps) {
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [inventoryTypeId, setInventoryTypeId] = useState<string>('');
  const [zoneId, setZoneId] = useState<string>('');
  const [countType, setCountType] = useState<string>('partial');
  const [selectedBinIds, setSelectedBinIds] = useState<string[]>([]);
  const [showBinPicker, setShowBinPicker] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFilterOptions();
    } else {
      // Reset form when modal closes
      setInventoryTypeId('');
      setZoneId('');
      setCountType('partial');
      setSelectedBinIds([]);
      setShowBinPicker(false);
    }
  }, [open]);

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

      const response = await axios.post('/api/modules/inventory-items/cycle-counts/start', {
        inventoryTypeId: inventoryTypeId || null,
        zoneId: zoneId || null,
        countType,
        binIds: selectedBinIds.length > 0 ? selectedBinIds : null,
      });

      if (response.data.success) {
        toast.success(`Cycle count ${response.data.data.countNumber} started successfully`);
        onSuccess(response.data.data.id, response.data.data.countNumber);
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error starting cycle count:', error);
      toast.error(error.response?.data?.message || 'Failed to start cycle count');
    } finally {
      setStarting(false);
    }
  };

  const addBin = (binId: string) => {
    if (!selectedBinIds.includes(binId)) {
      setSelectedBinIds([...selectedBinIds, binId]);
    }
    setShowBinPicker(false);
  };

  const removeBin = (binId: string) => {
    setSelectedBinIds(selectedBinIds.filter(id => id !== binId));
  };

  const getSelectedBins = () => {
    if (!filterOptions) return [];
    return selectedBinIds.map(id => {
      const bin = filterOptions.bins.find(b => b.id === id);
      return bin;
    }).filter(Boolean) as Bin[];
  };

  const getBinLabel = (bin: Bin) => {
    return `${bin.warehouseName} > ${bin.zoneName} > ${bin.aisleName} > ${bin.shelfName} > ${bin.name}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start New Cycle Count</DialogTitle>
          <DialogDescription>
            Select filters to determine which inventory items to count
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading options...
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Inventory Type</Label>
                <Select value={inventoryTypeId} onValueChange={setInventoryTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {filterOptions?.inventoryTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Zone Filter</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All zones</SelectItem>
                    {filterOptions?.zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.warehouseName} - {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Count Type</Label>
                <Select value={countType} onValueChange={setCountType}>
                  <SelectTrigger>
                    <SelectValue />
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
            </div>

            <div className="space-y-2">
              <Label>Manual Bin Selection (Optional)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBinPicker(!showBinPicker)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bin
                </Button>
              </div>

              {selectedBinIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {getSelectedBins().map((bin) => (
                    <Badge key={bin.id} variant="secondary" className="pl-2 pr-1">
                      {bin.zoneName}.{bin.aisleName}.{bin.shelfName}.{bin.name}
                      <button
                        onClick={() => removeBin(bin.id)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {showBinPicker && filterOptions && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {filterOptions.bins.map((bin) => (
                    <button
                      key={bin.id}
                      onClick={() => addBin(bin.id)}
                      disabled={selectedBinIds.includes(bin.id)}
                      className="w-full text-left px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {getBinLabel(bin)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={starting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartCount}
            disabled={loading || starting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {starting ? 'Starting...' : 'Start Count'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
