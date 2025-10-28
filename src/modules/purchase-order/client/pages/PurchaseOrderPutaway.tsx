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
import { RefreshCw, Package, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import axios from 'axios';
import { toast } from 'sonner';

interface PO {
  id: string;
  orderNumber: string;
  orderDate: string;
  supplierName: string;
  warehouseName: string;
  warehouseId: string;
  status: string;
  totalAmount: string;
  items: POItem[];
}

interface POItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  orderedQuantity: number;
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
  poItemId: string;
  warehouseId?: string;
  zoneId?: string;
  aisleId?: string;
  shelfId?: string;
  binId?: string;
}

const PurchaseOrderPutaway: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());
  
  // Location data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  
  // Track putaway locations for each item
  const [putawayLocations, setPutawayLocations] = useState<Record<string, PutawayLocation>>({});

  useEffect(() => {
    fetchPutawayData();
  }, []);

  const fetchPutawayData = async () => {
    try {
      setLoading(true);
      const [posResponse, warehousesResponse, zonesResponse, aislesResponse, shelvesResponse, binsResponse] = await Promise.all([
        axios.get('/api/modules/purchase-order/putaway'),
        axios.get('/api/modules/warehouse-setup/warehouses?limit=1000'),
        axios.get('/api/modules/warehouse-setup/zones?limit=1000'),
        axios.get('/api/modules/warehouse-setup/aisles?limit=1000'),
        axios.get('/api/modules/warehouse-setup/shelves?limit=1000'),
        axios.get('/api/modules/warehouse-setup/bins?limit=1000'),
      ]);
      
      const poData = posResponse.data.data || [];
      setPurchaseOrders(poData);
      setWarehouses(warehousesResponse.data.data || []);
      setZones(zonesResponse.data.data || []);
      setAisles(aislesResponse.data.data || []);
      setShelves(shelvesResponse.data.data || []);
      setBins(binsResponse.data.data || []);
      
      // Auto-expand all POs
      const allPOIds = new Set<string>(poData.map((po: PO) => po.id));
      setExpandedPOs(allPOIds);
      
      // Initialize putaway locations with PO warehouse for each item
      const initialLocations: Record<string, PutawayLocation> = {};
      poData.forEach((po: PO) => {
        po.items.forEach(item => {
          initialLocations[item.id] = {
            poItemId: item.id,
            warehouseId: po.warehouseId,
          };
        });
      });
      setPutawayLocations(initialLocations);
    } catch (error: any) {
      console.error('Error fetching putaway data:', error);
      toast.error('Failed to fetch putaway data');
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

  const updatePutawayLocation = (
    itemId: string,
    field: keyof PutawayLocation,
    value: string | undefined
  ) => {
    setPutawayLocations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        poItemId: itemId,
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
  const handleSmartAllocation = async (item: POItem, warehouseId: string) => {
    try {
      const response = await axios.post('/api/modules/purchase-order/putaway/smart-allocate', {
        productId: item.product.id,
        warehouseId: warehouseId,
        quantity: item.receivedQuantity,
      });

      if (response.data.success) {
        const { binId, zoneId, aisleId, shelfId } = response.data.data;
        
        // Auto-populate all location dropdowns with the suggested bin
        setPutawayLocations(prev => ({
          ...prev,
          [item.id]: {
            poItemId: item.id,
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
    }
  };

  const handleConfirmPutaway = async (po: PO) => {
    toast.info('Putaway confirmation feature coming soon');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
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

      {purchaseOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchase orders ready for putaway</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchaseOrders.map((po) => (
            <Card key={po.id}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => togglePO(po.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {expandedPOs.has(po.id) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {po.orderNumber} - {po.supplierName}
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({po.status === 'incomplete' ? 'Partial' : 'Full'})
                        </span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Warehouse: {po.warehouseName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {po.items.length} {po.items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {expandedPOs.has(po.id) && (
                <CardContent>
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
                        {po.items.map((item) => {
                          const location = putawayLocations[item.id] || {};
                          const availableZones = getFilteredZones(location.warehouseId);
                          const availableAisles = getFilteredAisles(location.zoneId);
                          const availableShelves = getFilteredShelves(location.aisleId);
                          const availableBins = getFilteredBins(location.shelfId);

                          return (
                            <tr key={item.id} className="border-b hover:bg-muted/30">
                              <td className="py-3 px-2">
                                <div>
                                  <div className="font-medium">{item.product.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    SKU: {item.product.sku}
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
                                  onClick={() => handleSmartAllocation(item, po.warehouseId)}
                                  className="w-full"
                                >
                                  <Zap className="w-4 h-4 mr-1" />
                                  Smart Active
                                </Button>
                              </td>
                              <td className="py-3 px-2">
                                <Select
                                  value={location.zoneId || ''}
                                  onValueChange={(value) => updatePutawayLocation(item.id, 'zoneId', value)}
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
                                  onValueChange={(value) => updatePutawayLocation(item.id, 'aisleId', value)}
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
                                  onValueChange={(value) => updatePutawayLocation(item.id, 'shelfId', value)}
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
                                  onValueChange={(value) => updatePutawayLocation(item.id, 'binId', value)}
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
                    <Button onClick={() => handleConfirmPutaway(po)}>
                      Confirm Putaway
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default withModuleAuthorization(PurchaseOrderPutaway, { moduleId: 'purchase-order', moduleName: 'Purchase Order' });
