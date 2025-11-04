import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import { Checkbox } from '@client/components/ui/checkbox';
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
import { Search, AlertTriangle, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { SOConfirmationModal } from '../components/SOConfirmationModal';
import { SOPrintView } from '../components/SOPrintView';
import axios from 'axios';
import { toast } from 'sonner';

const SalesOrderCreate: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [allCustomerLocations, setAllCustomerLocations] = useState<Map<string, any[]>>(new Map());
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [itemAllocations, setItemAllocations] = useState<Map<string, Map<string, number>>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, any>>(new Map());
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [selectedSOData, setSelectedSOData] = useState<any>(null);
  const [createdSO, setCreatedSO] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setSelectedLocationIds([]);
      setItemAllocations(new Map());
      fetchCustomerLocationsLazy(selectedCustomer);
    }
  }, [selectedCustomer]);

  const initializeData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchCustomersWithLocations(),
        fetchAllProducts(),
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomersWithLocations = async () => {
    try {
      const response = await axios.get('/api/modules/master-data/customers', {
        params: { 
          page: 1, 
          limit: 1000,
          includeLocations: true,
        },
      });
      const customersData = response.data.data || [];
      setCustomers(customersData);
      
      const locationsMap = new Map();
      customersData.forEach((customer: any) => {
        locationsMap.set(customer.id, customer.locations || []);
      });
      setAllCustomerLocations(locationsMap);
    } catch (error) {
      console.error('Error fetching customers with locations:', error);
      toast.error('Failed to fetch customers');
    }
  };

  const fetchCustomerLocationsLazy = async (customerId: string) => {
    if (allCustomerLocations.has(customerId)) {
      return;
    }

    try {
      const response = await axios.get(`/api/modules/master-data/customers/${customerId}`);
      if (response.data.success) {
        setAllCustomerLocations(prev => {
          const copy = new Map(prev);
          copy.set(customerId, response.data.data.locations || []);
          return copy;
        });
      }
    } catch (error) {
      console.error(`Error fetching locations for customer ${customerId}:`, error);
      setAllCustomerLocations(prev => {
        const copy = new Map(prev);
        copy.set(customerId, []);
        return copy;
      });
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await axios.get('/api/modules/sales-order/products-with-stock', {
        params: {
          page: 1,
          limit: 10000,
        },
      });
      setAllProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return allProducts;
    const lowerSearch = searchTerm.toLowerCase();
    return allProducts.filter(
      (product) =>
        product.sku?.toLowerCase().includes(lowerSearch) ||
        product.name?.toLowerCase().includes(lowerSearch)
    );
  }, [allProducts, searchTerm]);

  const customerLocations = useMemo(() => {
    return allCustomerLocations.get(selectedCustomer) || [];
  }, [allCustomerLocations, selectedCustomer]);

  const handleQuantityChange = (productId: string, quantity: string) => {
    const product = allProducts.find(p => p.productId === productId);
    if (!product) return;

    const qty = parseInt(quantity) || 0;
    const availableStock = product.availableStock || 0;

    if (qty > availableStock) {
      toast.error(`Quantity cannot exceed available stock (${availableStock})`);
      return;
    }

    if (qty > 0) {
      const currentItem = selectedItems.get(productId) || {};
      setSelectedItems(new Map(selectedItems.set(productId, {
        productId,
        sku: product.sku,
        name: product.name,
        orderedQuantity: qty,
        unitPrice: currentItem.unitPrice || 0,
        availableStock,
      })));
    } else {
      const newMap = new Map(selectedItems);
      newMap.delete(productId);
      setSelectedItems(newMap);
    }
  };

  const handleUnitPriceChange = (productId: string, price: string) => {
    const item = selectedItems.get(productId);
    if (!item) return;

    const unitPrice = parseFloat(price) || 0;
    if (unitPrice < 0) {
      toast.error('Unit price must be positive');
      return;
    }

    setSelectedItems(new Map(selectedItems.set(productId, {
      ...item,
      unitPrice,
    })));
  };

  const handleLocationToggle = (locationId: string) => {
    const newSelected = selectedLocationIds.includes(locationId)
      ? selectedLocationIds.filter(id => id !== locationId)
      : [...selectedLocationIds, locationId];
    
    setSelectedLocationIds(newSelected);

    if (!newSelected.includes(locationId)) {
      const newAllocations = new Map(itemAllocations);
      newAllocations.forEach((locationMap) => {
        locationMap.delete(locationId);
      });
      setItemAllocations(newAllocations);
    }
  };

  const handleSelectAllLocations = () => {
    if (selectedLocationIds.length === customerLocations.length) {
      setSelectedLocationIds([]);
      setItemAllocations(new Map());
    } else {
      setSelectedLocationIds(customerLocations.map((loc: any) => loc.id));
    }
  };

  const handleAllocationChange = (productId: string, locationId: string, quantity: string) => {
    const qty = parseInt(quantity) || 0;
    const item = selectedItems.get(productId);
    
    if (!item) return;

    const newAllocations = new Map(itemAllocations);
    if (!newAllocations.has(productId)) {
      newAllocations.set(productId, new Map());
    }
    
    const productAllocations = newAllocations.get(productId)!;
    
    if (qty > 0) {
      productAllocations.set(locationId, qty);
    } else {
      productAllocations.delete(locationId);
    }
    
    setItemAllocations(newAllocations);
  };

  const handleSplitEvenly = (productId: string) => {
    const item = selectedItems.get(productId);
    if (!item || selectedLocationIds.length === 0) return;

    const totalQty = item.orderedQuantity;
    const numLocations = selectedLocationIds.length;
    const baseQty = Math.floor(totalQty / numLocations);
    const remainder = totalQty % numLocations;

    const newAllocations = new Map(itemAllocations);
    const productAllocations = new Map<string, number>();

    selectedLocationIds.forEach((locationId, index) => {
      const qty = baseQty + (index < remainder ? 1 : 0);
      if (qty > 0) {
        productAllocations.set(locationId, qty);
      }
    });

    newAllocations.set(productId, productAllocations);
    setItemAllocations(newAllocations);
  };

  const toggleItemExpansion = (productId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedItems(newExpanded);
  };

  const getAllocatedQuantity = (productId: string): number => {
    const productAllocations = itemAllocations.get(productId);
    if (!productAllocations) return 0;
    
    return Array.from(productAllocations.values()).reduce((sum, qty) => sum + qty, 0);
  };

  const isAllocationValid = (productId: string): boolean => {
    if (selectedLocationIds.length === 0) return true;
    
    const item = selectedItems.get(productId);
    if (!item) return true;
    
    const allocated = getAllocatedQuantity(productId);
    return allocated === item.orderedQuantity;
  };

  const handleCreateSO = () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!orderDate) {
      toast.error('Please select an order date');
      return;
    }

    if (selectedLocationIds.length === 0) {
      toast.error('Please select at least one shipping location');
      return;
    }

    if (selectedItems.size === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const items = Array.from(selectedItems.values());
    const hasInvalidPrice = items.some(item => !item.unitPrice || item.unitPrice <= 0);
    if (hasInvalidPrice) {
      toast.error('All items must have a valid unit price');
      return;
    }

    for (const item of items) {
      if (!isAllocationValid(item.productId)) {
        const allocated = getAllocatedQuantity(item.productId);
        toast.error(`Invalid allocation for ${item.name}: ${allocated} allocated, ${item.orderedQuantity} ordered`);
        return;
      }
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    const itemsWithAllocations = items.map(item => {
      const productAllocations = itemAllocations.get(item.productId) || new Map();
      const locations = Array.from(productAllocations.entries()).map(([locationId, quantity]) => ({
        customerLocationId: locationId,
        quantity,
      }));

      return {
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        productName: item.name,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
        locations,
      };
    });

    const soData = {
      customerId: selectedCustomer,
      orderDate,
      requestedDeliveryDate: requestedDeliveryDate || null,
      deliveryInstructions: deliveryInstructions || null,
      notes: notes || null,
      items: itemsWithAllocations,
      customerName: customer?.name || 'N/A',
      selectedLocations: selectedLocationIds.map(id => {
        const location = customerLocations.find((loc: any) => loc.id === id);
        return {
          id,
          address: location?.address || location?.city || 'No address',
        };
      }),
    };

    setSelectedSOData(soData);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSO = async (soData: any) => {
    try {
      const response = await axios.post('/api/modules/sales-order/sales-orders', soData);
      
      if (response.data.success) {
        toast.success('Sales Order created successfully');
        const customer = customers.find(c => c.id === response.data.data.customerId);
        const enrichedCreatedSO = {
          ...response.data.data,
          customerName: customer?.name || 'N/A',
        };
        setCreatedSO(enrichedCreatedSO);
        setIsConfirmModalOpen(false);
        setIsPrintViewOpen(true);
        resetForm();
      } else {
        toast.error(response.data.message || 'Failed to create sales order');
        throw new Error(response.data.message || 'Failed to create sales order');
      }
    } catch (error: any) {
      console.error('Error creating SO:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create sales order';
      toast.error(errorMessage);
      throw error;
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setSelectedLocationIds([]);
    setItemAllocations(new Map());
    setExpandedItems(new Set());
    setOrderDate(new Date().toISOString().split('T')[0]);
    setRequestedDeliveryDate('');
    setDeliveryInstructions('');
    setNotes('');
    setSelectedItems(new Map());
    setSearchTerm('');
  };

  const handlePrintViewClose = () => {
    setIsPrintViewOpen(false);
    setCreatedSO(null);
    setSelectedSOData(null);
  };

  const handleConfirmBack = () => {
    setIsConfirmModalOpen(false);
  };

  const calculateTotal = () => {
    return Array.from(selectedItems.values()).reduce((sum, item) => {
      return sum + (item.orderedQuantity * item.unitPrice);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg font-medium">Loading...</div>
          <div className="text-sm text-muted-foreground">Please wait while we load the data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Sales Order</h1>
        <p className="text-muted-foreground">
          Create new sales orders for customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedDeliveryDate">Requested Delivery Date</Label>
              <Input
                id="requestedDeliveryDate"
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
            <Textarea
              id="deliveryInstructions"
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              placeholder="Enter delivery instructions"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {selectedCustomer && customerLocations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Locations *
              </CardTitle>
              {customerLocations.length >= 4 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllLocations}
                >
                  {selectedLocationIds.length === customerLocations.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Select one or more delivery locations ({selectedLocationIds.length} selected)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customerLocations.map((location: any) => (
                <div
                  key={location.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedLocationIds.includes(location.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleLocationToggle(location.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedLocationIds.includes(location.id)}
                      onCheckedChange={() => handleLocationToggle(location.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1">
                        {location.address || location.city || 'No address'}
                      </div>
                      {location.city && location.address && (
                        <div className="text-xs text-muted-foreground">{location.city}</div>
                      )}
                      {location.state && (
                        <div className="text-xs text-muted-foreground">{location.state}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Items</CardTitle>
            <span className="text-sm text-muted-foreground">
              ({selectedItems.size} items selected, {filteredProducts.length} products available)
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="border rounded-md max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Available Stock</TableHead>
                  <TableHead className="w-[100px]">Quantity</TableHead>
                  <TableHead className="w-[120px]">Unit Price</TableHead>
                  {selectedLocationIds.length > 0 && (
                    <TableHead className="w-[200px]">Allocation</TableHead>
                  )}
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const selectedItem = selectedItems.get(product.productId);
                  const isLowStock = (product.availableStock || 0) <= (product.minimumStockLevel || 0);
                  const isExpanded = expandedItems.has(product.productId);
                  const hasQuantity = selectedItem && selectedItem.orderedQuantity > 0;
                  const allocated = getAllocatedQuantity(product.productId);
                  const isValid = isAllocationValid(product.productId);
                  
                  return (
                    <React.Fragment key={product.productId}>
                      <TableRow>
                        <TableCell>
                          {hasQuantity && selectedLocationIds.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleItemExpansion(product.productId)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className={isLowStock ? 'text-yellow-600 font-medium' : ''}>
                              {product.availableStock || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={product.availableStock || 0}
                            value={selectedItem?.orderedQuantity || ''}
                            onChange={(e) => handleQuantityChange(product.productId, e.target.value)}
                            placeholder="0"
                            className="w-20"
                            disabled={selectedLocationIds.length === 0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={selectedItem?.unitPrice || ''}
                            onChange={(e) => handleUnitPriceChange(product.productId, e.target.value)}
                            placeholder="0.00"
                            className="w-24"
                            disabled={!selectedItem?.orderedQuantity}
                          />
                        </TableCell>
                        {selectedLocationIds.length > 0 && (
                          <TableCell>
                            {hasQuantity && (
                              <div className="space-y-1">
                                <div className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                  {allocated} / {selectedItem.orderedQuantity}
                                </div>
                                {!isValid && (
                                  <div className="text-xs text-red-600">
                                    {allocated > selectedItem.orderedQuantity ? 'Over-allocated' : 'Under-allocated'}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          ${((selectedItem?.orderedQuantity || 0) * (selectedItem?.unitPrice || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasQuantity && selectedLocationIds.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/50 p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Allocate to Locations</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSplitEvenly(product.productId)}
                                >
                                  Split Evenly
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {selectedLocationIds.map(locationId => {
                                  const location = customerLocations.find((loc: any) => loc.id === locationId);
                                  const productAllocations = itemAllocations.get(product.productId) || new Map();
                                  const qty = productAllocations.get(locationId) || 0;
                                  
                                  return (
                                    <div key={locationId} className="border rounded-lg p-3 space-y-2">
                                      <div className="text-sm font-medium truncate">
                                        {location?.address || location?.city || 'No address'}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs">Quantity:</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          max={selectedItem.orderedQuantity}
                                          value={qty || ''}
                                          onChange={(e) => handleAllocationChange(product.productId, locationId, e.target.value)}
                                          placeholder="0"
                                          className="w-20 h-8"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="pt-2 border-t">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Ordered: {selectedItem.orderedQuantity}</span>
                                  <span className="text-muted-foreground">Allocated: {allocated}</span>
                                  <span className={`font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                    Remaining: {selectedItem.orderedQuantity - allocated}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">${calculateTotal().toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={resetForm}>
          Reset Form
        </Button>
        <Button onClick={handleCreateSO}>
          Create Sales Order
        </Button>
      </div>

      <SOConfirmationModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        soData={selectedSOData || {}}
        onConfirm={handleConfirmSO}
        onBack={handleConfirmBack}
      />

      <SOPrintView
        open={isPrintViewOpen}
        onOpenChange={(open) => {
          if (!open) handlePrintViewClose();
        }}
        soData={createdSO || {}}
      />
    </div>
  );
};

export default withModuleAuthorization(SalesOrderCreate, { 
  moduleId: 'sales-order',
  moduleName: 'Sales Order'
});
