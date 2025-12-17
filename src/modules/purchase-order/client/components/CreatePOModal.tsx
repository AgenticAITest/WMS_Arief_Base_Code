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
import { RadioGroup, RadioGroupItem } from '@client/components/ui/radio-group';
import { Search, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface CreatePOModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedToConfirm: (poData: any) => void;
  initialData?: any;
  editMode?: boolean;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  open,
  onOpenChange,
  onProceedToConfirm,
  initialData,
  editMode = false,
}) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedSupplierLocation, setSelectedSupplierLocation] = useState<string>('');
  const [supplierLocations, setSupplierLocations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Map<string, any>>(new Map());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchWarehouses();
      fetchProducts();
    }
  }, [open]);

  useEffect(() => {
    if (selectedSupplier) {
      fetchSupplierLocations(selectedSupplier);
    }
  }, [selectedSupplier]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm]);

  // Prepopulate form when editing
  useEffect(() => {
    if (open && initialData && editMode) {
      setSelectedSupplier(initialData.supplierId || '');
      setDeliveryMethod(initialData.deliveryMethod || 'delivery');
      setSelectedSupplierLocation(initialData.supplierLocationId || '');
      setSelectedWarehouse(initialData.warehouseId || '');
      setExpectedDeliveryDate(initialData.expectedDeliveryDate || '');
      setNotes(initialData.notes || '');

      // Prepopulate selected items
      if (initialData.items && initialData.items.length > 0) {
        const itemsMap = new Map();
        initialData.items.forEach((item: any) => {
          itemsMap.set(item.productId, {
            productId: item.productId,
            sku: item.sku || '',
            name: item.name || '',
            orderedQuantity: item.orderedQuantity,
            unitCost: item.unitCost,
          });
        });
        setSelectedItems(itemsMap);
      }
    } else if (open && !editMode) {
      // Reset form for new PO
      setSelectedSupplier('');
      setDeliveryMethod('delivery');
      setSelectedSupplierLocation('');
      setSelectedWarehouse('');
      setExpectedDeliveryDate('');
      setNotes('');
      setSelectedItems(new Map());
    }
  }, [open, initialData, editMode]);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/api/modules/master-data/suppliers', {
        params: { page: 1, limit: 100 },
      });
      setSuppliers(response.data.suppliers || response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch suppliers');
    }
  };

  const fetchSupplierLocations = async (supplierId: string) => {
    try {
      const response = await axios.get(`/api/modules/master-data/suppliers/${supplierId}`);
      if (response.data.success) {
        setSupplierLocations(response.data.data.locations || []);
      }
    } catch (error: any) {
      console.error('Error fetching supplier locations:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch supplier locations');
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/modules/warehouse-setup/warehouses', {
        params: { page: 1, limit: 100 },
      });
      setWarehouses(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch warehouses');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/modules/purchase-order/products-with-stock', {
        params: {
          page: currentPage,
          limit: 20,
          search: searchTerm || undefined,
        },
      });
      setProducts(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch products');
    }
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    const product = products.find(p => p.productId === productId);
    if (!product) return;

    const qty = parseInt(quantity) || 0;
    if (qty > 0) {
      const currentItem = selectedItems.get(productId) || {};
      setSelectedItems(new Map(selectedItems.set(productId, {
        productId,
        sku: product.sku,
        name: product.name,
        orderedQuantity: qty,
        unitCost: currentItem.unitCost || 0,
      })));
    } else {
      const newItems = new Map(selectedItems);
      newItems.delete(productId);
      setSelectedItems(newItems);
    }
  };

  const handlePriceChange = (productId: string, price: string) => {
    const product = products.find(p => p.productId === productId);
    if (!product) return;

    const unitCost = parseFloat(price) || 0;
    const currentItem = selectedItems.get(productId);
    if (currentItem) {
      setSelectedItems(new Map(selectedItems.set(productId, {
        ...currentItem,
        unitCost,
      })));
    }
  };

  const calculateTotal = () => {
    let total = 0;
    selectedItems.forEach(item => {
      total += (item.orderedQuantity || 0) * (item.unitCost || 0);
    });
    return total;
  };

  const handleNext = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }

    if (!selectedWarehouse) {
      toast.error(deliveryMethod === 'delivery' ? 'Please select a delivery warehouse' : 'Please select a destination warehouse');
      return;
    }

    if (deliveryMethod === 'pickup' && !selectedSupplierLocation) {
      toast.error('Please select a pickup location');
      return;
    }

    // Validate items (both create and edit modes)
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const hasInvalidItems = Array.from(selectedItems.values()).some(
      item => !item.unitCost || item.unitCost <= 0
    );

    if (hasInvalidItems) {
      toast.error('Please enter unit price for all selected items');
      return;
    }

    const poData = {
      supplierId: selectedSupplier,
      deliveryMethod,
      supplierLocationId: selectedSupplierLocation || undefined,
      warehouseId: selectedWarehouse,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes: notes || undefined,
      items: Array.from(selectedItems.values()),
      ...(editMode && initialData?.editId ? { editMode: true, editId: initialData.editId } : {}),
    };

    onProceedToConfirm(poData);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      fetchProducts();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">
                Supplier <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>
                Fulfillment Method <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={deliveryMethod}
                onValueChange={(value: 'delivery' | 'pickup') => {
                  setDeliveryMethod(value);
                  // Reset supplier location when switching modes
                  if (value === 'delivery') {
                    setSelectedSupplierLocation('');
                  }
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="font-normal cursor-pointer">
                    Delivery (supplier delivers to our warehouse)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup" className="font-normal cursor-pointer">
                    Pickup (we pick up from supplier location)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">
                {deliveryMethod === 'delivery' ? 'Delivery Address' : 'Destination Warehouse'} <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder={deliveryMethod === 'delivery' ? 'Select delivery warehouse' : 'Select destination warehouse'} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {deliveryMethod === 'pickup' && (
              <div className="space-y-2">
                <Label htmlFor="location">
                  Pickup Location <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedSupplierLocation} onValueChange={setSelectedSupplierLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pickup location" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.locationType} - {location.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">
                {deliveryMethod === 'delivery' ? 'Expected Delivery Date' : 'Expected Pickup Date'}
              </Label>
              <Input
                id="deliveryDate"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
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
              <h3 className="text-lg font-semibold">Items to Purchase</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by SKU or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Available Stock</TableHead>
                    <TableHead className="text-right w-30">Quantity</TableHead>
                    <TableHead className="text-right w-40">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const item = selectedItems.get(product.productId);
                    const isLowStock = product.minimumStockLevel && 
                      product.totalAvailableStock <= product.minimumStockLevel;
                    
                    return (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {product.name}
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.totalAvailableStock}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            className="text-right"
                            value={item?.orderedQuantity || ''}
                            onChange={(e) => handleQuantityChange(product.productId, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right"
                            value={item?.unitCost || ''}
                            onChange={(e) => handlePriceChange(product.productId, e.target.value)}
                            disabled={!item?.orderedQuantity}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          ${((item?.orderedQuantity || 0) * (item?.unitCost || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground self-center">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div className="text-right">
                <div className="text-sm text-muted-foreground">Running Total</div>
                <div className="text-2xl font-bold">${calculateTotal().toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleNext}>
              {editMode ? 'Update' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
