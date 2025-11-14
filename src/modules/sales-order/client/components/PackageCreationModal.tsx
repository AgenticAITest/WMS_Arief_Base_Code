import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Package as PackageIcon, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';

interface SOItem {
  id: string;
  lineNumber: number;
  productId: string;
  productName: string;
  sku: string;
  pickedQuantity: string;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: SOItem[];
}

interface PackageItem {
  productId: string;
  salesOrderItemId: string;
  quantity: number;
  productName: string;
  sku: string;
}

interface Package {
  id?: string;
  packageId: string;
  packageNumber: string;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  items: PackageItem[];
}

interface PackageCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesOrder: SalesOrder;
  existingPackages: Package[];
  onSave: (packages: Package[]) => void;
}

const PackageCreationModal: React.FC<PackageCreationModalProps> = ({
  isOpen,
  onClose,
  salesOrder,
  existingPackages,
  onSave,
}) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingPackages.length > 0) {
      setPackages(existingPackages);
    } else {
      setPackages([createEmptyPackage(1)]);
    }
  }, [existingPackages]);

  const createEmptyPackage = (sequence: number): Package => {
    return {
      packageId: `PKG-${salesOrder.orderNumber}-${String(sequence).padStart(3, '0')}`,
      packageNumber: `PKG-${salesOrder.orderNumber}-${String(sequence).padStart(3, '0')}`,
      length: null,
      width: null,
      height: null,
      weight: null,
      items: [],
    };
  };

  const handleAddPackage = () => {
    const nextSequence = packages.length + 1;
    setPackages([...packages, createEmptyPackage(nextSequence)]);
  };

  const handleRemovePackage = (index: number) => {
    if (packages.length === 1) {
      toast.error('At least one package is required');
      return;
    }
    setPackages(packages.filter((_, i) => i !== index));
  };

  const handlePackageFieldChange = (
    index: number,
    field: 'length' | 'width' | 'height' | 'weight',
    value: string
  ) => {
    const updated = [...packages];
    const numValue = value === '' ? null : parseFloat(value);
    updated[index] = { ...updated[index], [field]: numValue };
    setPackages(updated);
  };

  const handleAddItemToPackage = (packageIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].items.push({
      productId: '',
      salesOrderItemId: '',
      quantity: 0,
      productName: '',
      sku: '',
    });
    setPackages(updated);
  };

  const handleRemoveItemFromPackage = (packageIndex: number, itemIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].items = updated[packageIndex].items.filter((_, i) => i !== itemIndex);
    setPackages(updated);
  };

  const handleItemFieldChange = (
    packageIndex: number,
    itemIndex: number,
    field: 'salesOrderItemId' | 'quantity',
    value: string
  ) => {
    const updated = [...packages];
    const item = updated[packageIndex].items[itemIndex];

    if (field === 'salesOrderItemId') {
      const soItem = salesOrder.items.find(i => i.id === value);
      if (soItem) {
        item.salesOrderItemId = value;
        item.productId = soItem.productId;
        item.productName = soItem.productName;
        item.sku = soItem.sku;
      }
    } else if (field === 'quantity') {
      item.quantity = value === '' ? 0 : parseFloat(value);
    }

    setPackages(updated);
  };

  const validatePackages = (): boolean => {
    for (const pkg of packages) {
      if (pkg.items.length === 0) {
        toast.error('Each package must contain at least one item');
        return false;
      }

      for (const item of pkg.items) {
        if (!item.salesOrderItemId) {
          toast.error('All package items must have a product selected');
          return false;
        }
        if (item.quantity <= 0) {
          toast.error('All package items must have a quantity greater than 0');
          return false;
        }
      }
    }

    // Validate total quantities don't exceed picked quantities
    const itemTotals: { [itemId: string]: number } = {};
    
    for (const pkg of packages) {
      for (const item of pkg.items) {
        if (!itemTotals[item.salesOrderItemId]) {
          itemTotals[item.salesOrderItemId] = 0;
        }
        itemTotals[item.salesOrderItemId] += item.quantity;
      }
    }

    for (const [itemId, totalQty] of Object.entries(itemTotals)) {
      const soItem = salesOrder.items.find(i => i.id === itemId);
      if (soItem && totalQty > parseFloat(soItem.pickedQuantity)) {
        toast.error(
          `Total packaged quantity for ${soItem.sku} (${totalQty}) exceeds picked quantity (${soItem.pickedQuantity})`
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validatePackages()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/modules/sales-order/packs/${salesOrder.id}/packages`,
        { packages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Packages saved successfully');
        // Extract the packages array from the response
        onSave(response.data.data.packages || []);
      } else {
        toast.error(response.data.message || 'Failed to save packages');
      }
    } catch (error: any) {
      console.error('Error saving packages:', error);
      toast.error(error.response?.data?.message || 'Failed to save packages');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemRemainingQuantity = (itemId: string): number => {
    const soItem = salesOrder.items.find(i => i.id === itemId);
    if (!soItem) return 0;

    const picked = parseFloat(soItem.pickedQuantity);
    const packaged = packages.reduce((sum, pkg) => {
      return sum + pkg.items
        .filter(item => item.salesOrderItemId === itemId)
        .reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    return picked - packaged;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Packages - {salesOrder.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-md p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-medium">{salesOrder.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{salesOrder.customerName}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Available Items</h3>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Product Name</th>
                    <th className="px-3 py-2 text-right">Picked Qty</th>
                    <th className="px-3 py-2 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {salesOrder.items.map((item) => {
                    const remaining = getItemRemainingQuantity(item.id);
                    const remainingColor = remaining === 0 ? 'text-green-600' : 'text-orange-600';
                    
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{item.sku}</td>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{parseFloat(item.pickedQuantity).toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${remainingColor}`}>
                          {remaining.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Packages ({packages.length})</h3>
              <Button onClick={handleAddPackage} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </div>

            <div className="space-y-4">
              {packages.map((pkg, packageIndex) => (
                <div key={packageIndex} className="border rounded-md p-4 bg-muted/20">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Package {packageIndex + 1}</span>
                      <span className="text-sm text-muted-foreground font-mono">
                        {pkg.packageNumber}
                      </span>
                    </div>
                    {packages.length > 1 && (
                      <Button
                        onClick={() => handleRemovePackage(packageIndex)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div>
                      <Label htmlFor={`length-${packageIndex}`}>Length (cm)</Label>
                      <Input
                        id={`length-${packageIndex}`}
                        type="number"
                        step="0.01"
                        value={pkg.length ?? ''}
                        onChange={(e) =>
                          handlePackageFieldChange(packageIndex, 'length', e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`width-${packageIndex}`}>Width (cm)</Label>
                      <Input
                        id={`width-${packageIndex}`}
                        type="number"
                        step="0.01"
                        value={pkg.width ?? ''}
                        onChange={(e) =>
                          handlePackageFieldChange(packageIndex, 'width', e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`height-${packageIndex}`}>Height (cm)</Label>
                      <Input
                        id={`height-${packageIndex}`}
                        type="number"
                        step="0.01"
                        value={pkg.height ?? ''}
                        onChange={(e) =>
                          handlePackageFieldChange(packageIndex, 'height', e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`weight-${packageIndex}`}>Weight (kg)</Label>
                      <Input
                        id={`weight-${packageIndex}`}
                        type="number"
                        step="0.01"
                        value={pkg.weight ?? ''}
                        onChange={(e) =>
                          handlePackageFieldChange(packageIndex, 'weight', e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Package Items</Label>
                      <Button
                        onClick={() => handleAddItemToPackage(packageIndex)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {pkg.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="grid grid-cols-[1fr,120px,40px] gap-2 items-end"
                        >
                          <div>
                            <Label className="text-xs">Product</Label>
                            <Select
                              value={item.salesOrderItemId}
                              onValueChange={(value) =>
                                handleItemFieldChange(packageIndex, itemIndex, 'salesOrderItemId', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product..." />
                              </SelectTrigger>
                              <SelectContent>
                                {salesOrder.items.map((soItem) => (
                                  <SelectItem key={soItem.id} value={soItem.id}>
                                    {soItem.sku} - {soItem.productName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity || ''}
                              onChange={(e) =>
                                handleItemFieldChange(packageIndex, itemIndex, 'quantity', e.target.value)
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <Button
                            onClick={() => handleRemoveItemFromPackage(packageIndex, itemIndex)}
                            size="sm"
                            variant="ghost"
                            className="text-destructive h-10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {pkg.items.length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-2">
                          No items added yet. Click "Add Item" to start.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Packages'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PackageCreationModal;
