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
import { Plus, X, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Textarea } from '@client/components/ui/textarea';

interface RelocationItem {
  productId: string;
  productSku: string;
  productName: string;
  fromBinId: string;
  fromBinName: string;
  fromLocation: string;
  availableQuantity: number;
  toBinId: string;
  toBinName: string;
  toLocation: string;
  quantity: number;
}

interface CreateRelocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateRelocationModal: React.FC<CreateRelocationModalProps> = ({
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
  const [selectedFromBins, setSelectedFromBins] = useState<string[]>([]);
  const [relocationItems, setRelocationItems] = useState<RelocationItem[]>([]);
  const [notes, setNotes] = useState('');
  const [allBins, setAllBins] = useState<any[]>([]);
  const [loadingBins, setLoadingBins] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAllBins();
    }
  }, [open]);

  const fetchAllBins = async () => {
    try {
      setLoadingBins(true);
      const response = await axios.get('/api/modules/warehouse-setup/bins', {
        params: { page: 1, limit: 1000 },
      });
      if (response.data.success) {
        setAllBins(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching bins:', error);
      toast.error('Failed to load bins list');
    } finally {
      setLoadingBins(false);
    }
  };

  const resetForm = () => {
    setSkuInput('');
    setSkuSearchResults(null);
    setSelectedFromBins([]);
    setRelocationItems([]);
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
        setSelectedFromBins([]);
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
    if (!skuSearchResults || selectedFromBins.length === 0) {
      toast.error('Please select at least one from bin');
      return;
    }

    const selectedBinData = skuSearchResults.bins.filter((bin) =>
      selectedFromBins.includes(bin.binId)
    );

    const newItems: RelocationItem[] = selectedBinData.map((bin) => ({
      productId: skuSearchResults.product.id,
      productSku: skuSearchResults.product.sku,
      productName: skuSearchResults.product.name,
      fromBinId: bin.binId,
      fromBinName: bin.binName,
      fromLocation: `${bin.zoneName}.${bin.aisleName}.${bin.shelfName}.${bin.binName}`,
      availableQuantity: bin.availableQuantity,
      toBinId: '',
      toBinName: '',
      toLocation: '',
      quantity: 0,
    }));

    const existingKeys = new Set(
      relocationItems.map((item) => `${item.productId}-${item.fromBinId}`)
    );
    const uniqueNewItems = newItems.filter(
      (item) => !existingKeys.has(`${item.productId}-${item.fromBinId}`)
    );

    if (uniqueNewItems.length === 0) {
      toast.warning('All selected items are already in the relocation list');
    } else {
      setRelocationItems([...relocationItems, ...uniqueNewItems]);
      toast.success(`Added ${uniqueNewItems.length} item(s) to relocation list`);
    }

    setSkuInput('');
    setSkuSearchResults(null);
    setSelectedFromBins([]);
  };

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = value === '' ? 0 : parseInt(value);
    const newItems = [...relocationItems];
    newItems[index].quantity = quantity;
    setRelocationItems(newItems);
  };

  const handleToBinChange = (index: number, binId: string) => {
    const selectedBin = allBins.find((bin) => bin.id === binId);
    const newItems = [...relocationItems];
    newItems[index].toBinId = binId;
    newItems[index].toBinName = selectedBin?.name || '';
    newItems[index].toLocation = selectedBin?.name || '';
    setRelocationItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setRelocationItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (relocationItems.length === 0) {
      toast.error('Please add at least one relocation item');
      return;
    }

    const invalidItems = relocationItems.filter(
      (item) => !item.toBinId || item.quantity <= 0 || item.quantity > item.availableQuantity
    );

    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have a valid to bin and quantity within available stock');
      return;
    }

    const sameBinItems = relocationItems.filter(
      (item) => item.fromBinId === item.toBinId
    );

    if (sameBinItems.length > 0) {
      toast.error('From bin and to bin cannot be the same');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        notes: notes || undefined,
        items: relocationItems.map((item) => ({
          productId: item.productId,
          fromBinId: item.fromBinId,
          toBinId: item.toBinId,
          quantity: item.quantity,
        })),
      };

      const response = await axios.post('/api/modules/inventory-items/relocations', payload);

      if (response.data.success) {
        toast.success('Relocation created successfully');
        resetForm();
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error creating relocation:', error);
      toast.error(error.response?.data?.message || 'Failed to create relocation');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFromBinSelection = (binId: string) => {
    setSelectedFromBins((prev) =>
      prev.includes(binId) ? prev.filter((id) => id !== binId) : [...prev, binId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Inventory Relocation</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold">Search and Add Items</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="sku">Product SKU</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    placeholder="Enter SKU to search"
                    onKeyDown={(e) => e.key === 'Enter' && handleSkuSearch()}
                  />
                  <Button onClick={handleSkuSearch} disabled={skuSearching}>
                    <Search className="w-4 h-4 mr-2" />
                    {skuSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
            </div>

            {skuSearchResults && (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Product: {skuSearchResults.product.sku} - {skuSearchResults.product.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Select bins to relocate from:
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Bin</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Available Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skuSearchResults.bins.map((bin) => (
                        <TableRow key={bin.binId}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedFromBins.includes(bin.binId)}
                              onChange={() => toggleFromBinSelection(bin.binId)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{bin.binName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {bin.warehouseName} → {bin.zoneName} → {bin.aisleName} → {bin.shelfName}
                          </TableCell>
                          <TableCell className="text-right">{bin.availableQuantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={handleAddSelectedBins} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Selected Bins
                </Button>
              </div>
            )}
          </div>

          {relocationItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Relocation Items</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>From Location</TableHead>
                      <TableHead>To Bin</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relocationItems.map((item, index) => (
                      <TableRow key={`${item.productId}-${item.fromBinId}`}>
                        <TableCell className="font-medium">{item.productSku}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.fromLocation}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.toBinId}
                            onValueChange={(value) => handleToBinChange(index, value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select to bin" />
                            </SelectTrigger>
                            <SelectContent>
                              {loadingBins ? (
                                <SelectItem value="loading" disabled>
                                  Loading bins...
                                </SelectItem>
                              ) : (
                                allBins
                                  .filter((bin) => bin.id !== item.fromBinId)
                                  .map((bin) => (
                                    <SelectItem key={bin.id} value={bin.id}>
                                      {bin.name}
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">{item.availableQuantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            max={item.availableQuantity}
                            value={item.quantity || ''}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="w-24 text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || relocationItems.length === 0}>
              {submitting ? 'Creating...' : 'Create Relocation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
