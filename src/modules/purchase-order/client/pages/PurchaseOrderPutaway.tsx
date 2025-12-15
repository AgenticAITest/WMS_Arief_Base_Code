import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { RefreshCw, Package, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { PutawayConfirmationModal } from '../components/PutawayConfirmationModal';
import axios from 'axios';
import { toast } from 'sonner';

interface GRN {
  receiptId: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  supplierName: string;
  warehouseName: string;
  warehouseId: string;
  receiptDate: string;
  items: ReceiptItem[];
}

interface ReceiptItem {
  receiptItemId: string;
  productId: string;
  productName: string;
  productSku: string;
  receivedQuantity: number;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  name: string;
  description?: string;
  warehouseId: string;
}

interface Aisle {
  id: string;
  name: string;
  description?: string;
  zoneId: string;
}

interface Shelf {
  id: string;
  name: string;
  description?: string;
  aisleId: string;
}

interface Bin {
  id: string;
  name: string;
  shelfId: string;
}

interface PutawayLocation {
  receiptItemId: string;
  warehouseId?: string;
  zoneId?: string;
  aisleId?: string;
  shelfId?: string;
  binId?: string;
}

interface POGroup {
  poId: string;
  poNumber: string;
  supplierName: string;
  warehouseName: string;
  grns: GRN[];
}

const PurchaseOrderPutaway: React.FC = () => {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [poGroups, setPoGroups] = useState<POGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());
  
  // Location data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  
  // Track putaway locations for each item
  const [putawayLocations, setPutawayLocations] = useState<Record<string, PutawayLocation>>({});
  
  // Track which item is currently being allocated
  const [allocatingItemId, setAllocatingItemId] = useState<string | null>(null);
  
  // Confirmation modal state
  const [confirmReceiptId, setConfirmReceiptId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  
  // Putaway document modal state
  const [isPutawayModalOpen, setIsPutawayModalOpen] = useState(false);
  const [currentPutaway, setCurrentPutaway] = useState<{ number: string; documentId: string } | null>(null);

  useEffect(() => {
    fetchPutawayData();
  }, []);

  const fetchPutawayData = async () => {
    try {
      setLoading(true);
      const [grnsResponse, warehousesResponse, zonesResponse, aislesResponse, shelvesResponse, binsResponse] = await Promise.all([
        axios.get('/api/modules/purchase-order/putaway'),
        axios.get('/api/modules/warehouse-setup/warehouses?limit=1000'),
        axios.get('/api/modules/warehouse-setup/zones?limit=1000'),
        axios.get('/api/modules/warehouse-setup/aisles?limit=1000'),
        axios.get('/api/modules/warehouse-setup/shelves?limit=1000'),
        axios.get('/api/modules/warehouse-setup/bins?limit=1000'),
      ]);
      
      const grnData = grnsResponse.data.data || [];
      setGrns(grnData);
      setWarehouses(warehousesResponse.data.data || []);
      setZones(zonesResponse.data.data || []);
      setAisles(aislesResponse.data.data || []);
      setShelves(shelvesResponse.data.data || []);
      setBins(binsResponse.data.data || []);
      
      // Group GRNs by PO
      const grouped = grnData.reduce((acc: Record<string, POGroup>, grn: GRN) => {
        if (!acc[grn.poId]) {
          acc[grn.poId] = {
            poId: grn.poId,
            poNumber: grn.poNumber,
            supplierName: grn.supplierName,
            warehouseName: grn.warehouseName,
            grns: [],
          };
        }
        acc[grn.poId].grns.push(grn);
        return acc;
      }, {});
      
      const poGroupArray = Object.values(grouped) as POGroup[];
      setPoGroups(poGroupArray);
      
      // Auto-expand all POs and GRNs
      const allPOIds = new Set<string>(poGroupArray.map(po => po.poId));
      const allGRNIds = new Set<string>(grnData.map((grn: GRN) => grn.receiptId));
      setExpandedPOs(allPOIds);
      setExpandedGRNs(allGRNIds);
      
      // Initialize putaway locations with warehouse for each item
      const initialLocations: Record<string, PutawayLocation> = {};
      grnData.forEach((grn: GRN) => {
        grn.items.forEach(item => {
          initialLocations[item.receiptItemId] = {
            receiptItemId: item.receiptItemId,
            warehouseId: grn.warehouseId,
          };
        });
      });
      setPutawayLocations(initialLocations);
    } catch (error: any) {
      console.error('Error fetching putaway data:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch putaway data');
    } finally {
      setLoading(false);
    }
  };

  const togglePO = (poId: string) => {
    setExpandedPOs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(poId)) {
        newSet.delete(poId);
      } else {
        newSet.add(poId);
      }
      return newSet;
    });
  };

  const toggleGRN = (receiptId: string) => {
    setExpandedGRNs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(receiptId)) {
        newSet.delete(receiptId);
      } else {
        newSet.add(receiptId);
      }
      return newSet;
    });
  };

  const updatePutawayLocation = (
    receiptItemId: string,
    field: keyof PutawayLocation,
    value: string | undefined
  ) => {
    setPutawayLocations(prev => ({
      ...prev,
      [receiptItemId]: {
        ...prev[receiptItemId],
        receiptItemId: receiptItemId,
        [field]: value,
        // Reset dependent fields when parent changes
        ...(field === 'warehouseId' && { zoneId: undefined, aisleId: undefined, shelfId: undefined, binId: undefined }),
        ...(field === 'zoneId' && { aisleId: undefined, shelfId: undefined, binId: undefined }),
        ...(field === 'aisleId' && { shelfId: undefined, binId: undefined }),
        ...(field === 'shelfId' && { binId: undefined }),
      },
    }));
  };

  const getFilteredZones = (warehouseId?: string) => {
    if (!warehouseId) return [];
    return zones.filter(z => z.warehouseId === warehouseId);
  };

  const getFilteredAisles = (zoneId?: string) => {
    if (!zoneId) return [];
    return aisles.filter(a => a.zoneId === zoneId);
  };

  const getFilteredShelves = (aisleId?: string) => {
    if (!aisleId) return [];
    return shelves.filter(s => s.aisleId === aisleId);
  };

  const getFilteredBins = (shelfId?: string) => {
    if (!shelfId) return [];
    return bins.filter(b => b.shelfId === shelfId);
  };

  /**
   * SMART ALLOCATION HANDLER
   * 
   * Calls the backend Smart Allocation API to get the optimal bin suggestion
   * for a specific item based on:
   * - Available Capacity (45%): Bins with more free space
   * - Item Match (35%): Bins already containing the same SKU  
   * - Temperature Match (20%): Bins matching product temperature requirements
   * 
   * The suggested bin is automatically populated into all cascading dropdowns.
   * User can still manually override any selection.
   */
  const handleSmartAllocation = async (item: ReceiptItem, warehouseId: string) => {
    try {
      setAllocatingItemId(item.receiptItemId);
      
      const response = await axios.post('/api/modules/purchase-order/putaway/smart-allocate', {
        productId: item.productId,
        warehouseId: warehouseId,
        quantity: item.receivedQuantity,
      });

      if (response.data.success) {
        const { binId, zoneId, aisleId, shelfId } = response.data.data;
        
        // Auto-populate all location dropdowns with the suggested bin
        setPutawayLocations(prev => ({
          ...prev,
          [item.receiptItemId]: {
            receiptItemId: item.receiptItemId,
            warehouseId: warehouseId,
            zoneId: zoneId,
            aisleId: aisleId,
            shelfId: shelfId,
            binId: binId,
          },
        }));

        toast.success('Smart allocation complete - you can adjust if needed');
      }
    } catch (error: any) {
      console.error('Smart allocation error:', error);
      const message = error.response?.data?.message || 'Failed to get bin suggestion';
      toast.error(message);
    } finally {
      setAllocatingItemId(null);
    }
  };

  const handleConfirmPutaway = (grn: GRN) => {
    // Validate all items have bin locations assigned
    const missingLocations = grn.items.filter(item => {
      const location = putawayLocations[item.receiptItemId];
      return !location || !location.binId;
    });

    if (missingLocations.length > 0) {
      toast.error('Please assign bin locations to all items before confirming putaway');
      return;
    }

    // Show confirmation modal
    setConfirmReceiptId(grn.receiptId);
  };

  const confirmPutawaySubmit = async () => {
    if (!confirmReceiptId) return;

    const grn = grns.find(g => g.receiptId === confirmReceiptId);
    if (!grn) return;

    // Prepare items payload
    const items = grn.items.map(item => ({
      receiptItemId: item.receiptItemId,
      binId: putawayLocations[item.receiptItemId]?.binId,
    }));

    try {
      setConfirming(true);
      const response = await axios.post(
        `/api/modules/purchase-order/putaway/${confirmReceiptId}/confirm`,
        { items }
      );

      if (response.data.success) {
        toast.success(`Putaway confirmed! Document ${response.data.data.putawayNumber} generated.`);
        // Close confirmation modal
        setConfirmReceiptId(null);
        // Show putaway document modal
        setCurrentPutaway({
          number: response.data.data.putawayNumber,
          documentId: response.data.data.documentId,
        });
        setIsPutawayModalOpen(true);
        // Refresh data to remove completed GRN from list
        await fetchPutawayData();
      }
    } catch (error: any) {
      console.error('Error confirming putaway:', error);
      const message = error.response?.data?.message || 'Failed to confirm putaway';
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  };

  const confirmGRN = grns.find(g => g.receiptId === confirmReceiptId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Purchase Orders Ready for Putaway</h1>
            <p className="text-muted-foreground">
              Allocate received items to warehouse locations
            </p>
          </div>
          <Button onClick={fetchPutawayData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {grns.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No GRNs ready for putaway</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {poGroups.map((poGroup) => (
              <Card key={poGroup.poId}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => togglePO(poGroup.poId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {expandedPOs.has(poGroup.poId) ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          PO: {poGroup.poNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {poGroup.supplierName} • Warehouse: {poGroup.warehouseName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {poGroup.grns.length} {poGroup.grns.length === 1 ? 'GRN' : 'GRNs'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {expandedPOs.has(poGroup.poId) && (
                  <CardContent className="space-y-4 pt-0">
                    {poGroup.grns.map((grn) => (
                      <div key={grn.receiptId} className="border rounded-lg">
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleGRN(grn.receiptId)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedGRNs.has(grn.receiptId) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="font-medium">GRN: {grn.grnNumber}</div>
                              <div className="text-sm text-muted-foreground">
                                Receipt Date: {new Date(grn.receiptDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {grn.items.length} {grn.items.length === 1 ? 'item' : 'items'}
                          </Badge>
                        </div>

                        {expandedGRNs.has(grn.receiptId) && (
                          <div className="p-4">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-medium">Item</th>
                                    <th className="text-center py-2 px-2 font-medium w-24">Quantity</th>
                                    <th className="text-center py-2 px-2 font-medium w-40">Smart Allocation</th>
                                    <th className="text-center py-2 px-2 font-medium w-32">Zone</th>
                                    <th className="text-center py-2 px-2 font-medium w-32">Aisle</th>
                                    <th className="text-center py-2 px-2 font-medium w-32">Shelf</th>
                                    <th className="text-center py-2 px-2 font-medium w-48">Bin</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grn.items.map((item) => {
                                    const location = putawayLocations[item.receiptItemId] || {};
                                    const availableZones = getFilteredZones(location.warehouseId);
                                    const availableAisles = getFilteredAisles(location.zoneId);
                                    const availableShelves = getFilteredShelves(location.aisleId);
                                    const availableBins = getFilteredBins(location.shelfId);

                                    return (
                                      <tr key={item.receiptItemId} className="border-b hover:bg-muted/30">
                                        <td className="py-3 px-2">
                                          <div>
                                            <div className="font-medium">{item.productName}</div>
                                            <div className="text-sm text-muted-foreground">
                                              SKU: {item.productSku}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                          <Badge variant="outline">{item.receivedQuantity}</Badge>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleSmartAllocation(item, grn.warehouseId)}
                                            disabled={allocatingItemId === item.receiptItemId}
                                            className="w-full"
                                          >
                                            {allocatingItemId === item.receiptItemId ? (
                                              <>
                                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                                Allocating...
                                              </>
                                            ) : (
                                              <>
                                                <Zap className="w-4 h-4 mr-1" />
                                                Smart Allocate
                                              </>
                                            )}
                                          </Button>
                                        </td>
                                        <td className="py-3 px-2">
                                          <Select
                                            value={location.zoneId || ''}
                                            onValueChange={(value) => updatePutawayLocation(item.receiptItemId, 'zoneId', value)}
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select Zone">
                                                {location.zoneId && (() => {
                                                  const selectedZone = availableZones.find(z => z.id === location.zoneId);
                                                  return selectedZone ? (
                                                    <div>
                                                      <div className="font-medium">{selectedZone.name}</div>
                                                      {selectedZone.description && (
                                                        <div className="text-xs text-muted-foreground">{selectedZone.description}</div>
                                                      )}
                                                    </div>
                                                  ) : null;
                                                })()}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableZones.map((zone) => (
                                                <SelectItem key={zone.id} value={zone.id}>
                                                  <div>
                                                    <div className="font-medium">{zone.name}</div>
                                                    {zone.description && (
                                                      <div className="text-xs text-muted-foreground">{zone.description}</div>
                                                    )}
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        <td className="py-3 px-2">
                                          <Select
                                            value={location.aisleId || ''}
                                            onValueChange={(value) => updatePutawayLocation(item.receiptItemId, 'aisleId', value)}
                                            disabled={!location.zoneId}
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select Aisle">
                                                {location.aisleId && (() => {
                                                  const selectedAisle = availableAisles.find(a => a.id === location.aisleId);
                                                  return selectedAisle ? (
                                                    <div>
                                                      <div className="font-medium">{selectedAisle.name}</div>
                                                      {selectedAisle.description && (
                                                        <div className="text-xs text-muted-foreground">{selectedAisle.description}</div>
                                                      )}
                                                    </div>
                                                  ) : null;
                                                })()}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableAisles.map((aisle) => (
                                                <SelectItem key={aisle.id} value={aisle.id}>
                                                  <div>
                                                    <div className="font-medium">{aisle.name}</div>
                                                    {aisle.description && (
                                                      <div className="text-xs text-muted-foreground">{aisle.description}</div>
                                                    )}
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        <td className="py-3 px-2">
                                          <Select
                                            value={location.shelfId || ''}
                                            onValueChange={(value) => updatePutawayLocation(item.receiptItemId, 'shelfId', value)}
                                            disabled={!location.aisleId}
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select Shelf">
                                                {location.shelfId && (() => {
                                                  const selectedShelf = availableShelves.find(s => s.id === location.shelfId);
                                                  return selectedShelf ? (
                                                    <div>
                                                      <div className="font-medium">{selectedShelf.name}</div>
                                                      {selectedShelf.description && (
                                                        <div className="text-xs text-muted-foreground">{selectedShelf.description}</div>
                                                      )}
                                                    </div>
                                                  ) : null;
                                                })()}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableShelves.map((shelf) => (
                                                <SelectItem key={shelf.id} value={shelf.id}>
                                                  <div>
                                                    <div className="font-medium">{shelf.name}</div>
                                                    {shelf.description && (
                                                      <div className="text-xs text-muted-foreground">{shelf.description}</div>
                                                    )}
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        <td className="py-3 px-2">
                                          <Select
                                            value={location.binId || ''}
                                            onValueChange={(value) => updatePutawayLocation(item.receiptItemId, 'binId', value)}
                                            disabled={!location.shelfId}
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Select Bin">
                                                {location.binId && (() => {
                                                  const selectedBin = availableBins.find(b => b.id === location.binId);
                                                  return selectedBin ? (
                                                    <div className="font-medium">{selectedBin.name}</div>
                                                  ) : null;
                                                })()}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableBins.map((bin) => (
                                                <SelectItem key={bin.id} value={bin.id}>
                                                  <div className="font-medium">{bin.name}</div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                              <Button onClick={() => handleConfirmPutaway(grn)}>
                                Confirm Putaway
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={confirmReceiptId !== null} onOpenChange={(open) => !open && setConfirmReceiptId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Putaway</DialogTitle>
            <DialogDescription>
              Are you sure you want to confirm putaway for GRN {confirmGRN?.grnNumber}? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create inventory items at assigned bin locations</li>
                <li>Generate a putaway document</li>
                <li>Mark this receipt as putaway complete</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          
          {confirmGRN && (
            <div className="py-4">
              <div className="text-sm font-medium mb-2">Items to be put away:</div>
              <div className="space-y-2">
                {confirmGRN.items.map(item => {
                  const location = putawayLocations[item.receiptItemId];
                  const zone = zones.find(z => z.id === location?.zoneId);
                  const aisle = aisles.find(a => a.id === location?.aisleId);
                  const shelf = shelves.find(s => s.id === location?.shelfId);
                  const bin = bins.find(b => b.id === location?.binId);
                  
                  const locationPath = [zone?.name, aisle?.name, shelf?.name, bin?.name]
                    .filter(Boolean)
                    .join(' > ');

                  return (
                    <div key={item.receiptItemId} className="flex justify-between text-sm border-b pb-2">
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.productSku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">Qty: {item.receivedQuantity}</div>
                        <div className="text-xs text-green-600">{locationPath}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmReceiptId(null)}
              disabled={confirming}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmPutawaySubmit}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Putaway'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Putaway Document Modal */}
      {currentPutaway && (
        <PutawayConfirmationModal
          isOpen={isPutawayModalOpen}
          onClose={() => {
            setIsPutawayModalOpen(false);
            setCurrentPutaway(null);
          }}
          putawayNumber={currentPutaway.number}
          putawayDocumentId={currentPutaway.documentId}
        />
      )}
    </>
  );
};

export default withModuleAuthorization(PurchaseOrderPutaway, {
  moduleId: "purchase-order",
  moduleName: "Purchase Order",
});
