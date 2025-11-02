import React, { useState, useEffect } from 'react';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
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
import { Search, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { SOConfirmationModal } from '../components/SOConfirmationModal';
import { SOPrintView } from '../components/SOPrintView';
import axios from 'axios';
import { toast } from 'sonner';

const SalesOrderCreate: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerLocations, setCustomerLocations] = useState<any[]>([]);
  const [selectedShippingLocation, setSelectedShippingLocation] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Map<string, any>>(new Map());
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [selectedSOData, setSelectedSOData] = useState<any>(null);
  const [createdSO, setCreatedSO] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setSelectedShippingLocation('');
      setCustomerLocations([]);
      fetchCustomerLocations(selectedCustomer);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/modules/master-data/customers', {
        params: { page: 1, limit: 1000 },
      });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    }
  };

  const fetchCustomerLocations = async (customerId: string) => {
    try {
      const response = await axios.get(`/api/modules/master-data/customers/${customerId}`);
      if (response.data.success) {
        setCustomerLocations(response.data.data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching customer locations:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/modules/sales-order/products-with-stock', {
        params: {
          page: currentPage,
          limit: 20,
          search: searchTerm || undefined,
        },
      });
      setProducts(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    const product = products.find(p => p.productId === productId);
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

  const handleCreateSO = () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!orderDate) {
      toast.error('Please select an order date');
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

    const customer = customers.find(c => c.id === selectedCustomer);
    const soData = {
      customerId: selectedCustomer,
      shippingLocationId: selectedShippingLocation || null,
      orderDate,
      requestedDeliveryDate: requestedDeliveryDate || null,
      deliveryInstructions: deliveryInstructions || null,
      notes: notes || null,
      items: items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
      })),
      customerName: customer?.name || 'N/A',
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
    setSelectedShippingLocation('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setRequestedDeliveryDate('');
    setDeliveryInstructions('');
    setNotes('');
    setSelectedItems(new Map());
    setSearchTerm('');
    setCurrentPage(1);
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

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

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
          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="shippingLocation">Shipping Location</Label>
              <Select 
                value={selectedShippingLocation} 
                onValueChange={setSelectedShippingLocation}
                disabled={!selectedCustomer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shipping location" />
                </SelectTrigger>
                <SelectContent>
                  {customerLocations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.addressLine1}, {location.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Items</CardTitle>
            <span className="text-sm text-muted-foreground">
              ({selectedItems.size} items selected)
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Available Stock</TableHead>
                  <TableHead className="w-[100px]">Quantity</TableHead>
                  <TableHead className="w-[120px]">Unit Price</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => {
                  const selectedItem = selectedItems.get(product.productId);
                  const isLowStock = (product.availableStock || 0) <= (product.minimumStockLevel || 0);
                  
                  return (
                    <TableRow key={product.productId}>
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
                      <TableCell className="text-right font-medium">
                        ${((selectedItem?.orderedQuantity || 0) * (selectedItem?.unitPrice || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

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
