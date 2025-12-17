import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import { Switch } from '@client/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  inventoryTypeId: z.string().optional(),
  packageTypeId: z.string().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  minimumStockLevel: z.number().optional().or(z.nan().transform(() => undefined)),
  reorderPoint: z.number().optional().or(z.nan().transform(() => undefined)),
  hasExpiryDate: z.boolean(),
  requiredTemperatureMin: z.number().optional().or(z.nan().transform(() => undefined)),
  requiredTemperatureMax: z.number().optional().or(z.nan().transform(() => undefined)),
  active: z.boolean(),
});

type ProductForm = z.infer<typeof productSchema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  onSuccess: () => void;
}

const ProductDialog = ({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: ProductDialogProps) => {
  const [inventoryTypes, setInventoryTypes] = useState<any[]>([]);
  const [packageTypes, setPackageTypes] = useState<any[]>([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      inventoryTypeId: '',
      packageTypeId: '',
      weight: '',
      dimensions: '',
      minimumStockLevel: undefined,
      reorderPoint: undefined,
      hasExpiryDate: false,
      requiredTemperatureMin: undefined,
      requiredTemperatureMax: undefined,
      active: true,
    },
  });

  const active = watch('active');
  const hasExpiryDate = watch('hasExpiryDate');
  const inventoryTypeId = watch('inventoryTypeId');
  const packageTypeId = watch('packageTypeId');

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [typesRes, packagesRes] = await Promise.all([
          axios.get('/api/modules/master-data/product-types', { params: { page: 1, limit: 100 } }),
          axios.get('/api/modules/master-data/package-types', { params: { page: 1, limit: 100 } }),
        ]);
        setInventoryTypes(typesRes.data.productTypes || typesRes.data.data || []);
        setPackageTypes(packagesRes.data.packageTypes ||packagesRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch options:', error);
      }
    };

    if (open) {
      fetchOptions();
    }
  }, [open]);

  useEffect(() => {
    if (editingItem) {
      setValue('sku', editingItem.sku);
      setValue('name', editingItem.name);
      setValue('description', editingItem.description || '');
      setValue('inventoryTypeId', editingItem.inventoryTypeId || '');
      setValue('packageTypeId', editingItem.packageTypeId || '');
      setValue('weight', editingItem.weight || '');
      setValue('dimensions', editingItem.dimensions || '');
      setValue('minimumStockLevel', editingItem.minimumStockLevel || undefined);
      setValue('reorderPoint', editingItem.reorderPoint || undefined);
      setValue('hasExpiryDate', editingItem.hasExpiryDate || false);
      setValue('requiredTemperatureMin', editingItem.requiredTemperatureMin || undefined);
      setValue('requiredTemperatureMax', editingItem.requiredTemperatureMax || undefined);
      setValue('active', editingItem.active);
    } else {
      reset({
        sku: '',
        name: '',
        description: '',
        inventoryTypeId: '',
        packageTypeId: '',
        weight: '',
        dimensions: '',
        minimumStockLevel: undefined,
        reorderPoint: undefined,
        hasExpiryDate: false,
        requiredTemperatureMin: undefined,
        requiredTemperatureMax: undefined,
        active: true,
      });
    }
  }, [editingItem, open, reset, setValue]);

  const onSubmit = async (data: ProductForm) => {
    try {
      const payload = {
        ...data,
        inventoryTypeId: data.inventoryTypeId || null,
        packageTypeId: data.packageTypeId || null,
        minimumStockLevel: data.minimumStockLevel || undefined,
        reorderPoint: data.reorderPoint || undefined,
        requiredTemperatureMin: data.requiredTemperatureMin || undefined,
        requiredTemperatureMax: data.requiredTemperatureMax || undefined,
        weight: data.weight || undefined,
        dimensions: data.dimensions || undefined,
      };

      if (editingItem) {
        await axios.put(`/api/modules/master-data/products/${editingItem.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/api/modules/master-data/products', payload);
        toast.success('Product created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Edit Product' : 'Add Product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">
                SKU <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="Enter SKU"
              />
              {errors.sku && (
                <p className="text-sm text-red-500">{errors.sku.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inventoryTypeId">Inventory Type</Label>
              <Select
                value={inventoryTypeId || 'none'}
                onValueChange={(value) => setValue('inventoryTypeId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {inventoryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageTypeId">Package Type</Label>
              <Select
                value={packageTypeId || 'none'}
                onValueChange={(value) => setValue('packageTypeId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {packageTypes.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                {...register('weight')}
                placeholder="e.g., 2.5kg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                {...register('dimensions')}
                placeholder="e.g., 10x20x30 cm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumStockLevel">Minimum Stock Level</Label>
              <Input
                id="minimumStockLevel"
                type="number"
                {...register('minimumStockLevel', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                {...register('reorderPoint', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requiredTemperatureMin">Min Temperature (°C)</Label>
              <Input
                id="requiredTemperatureMin"
                type="number"
                step="0.1"
                {...register('requiredTemperatureMin', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredTemperatureMax">Max Temperature (°C)</Label>
              <Input
                id="requiredTemperatureMax"
                type="number"
                step="0.1"
                {...register('requiredTemperatureMax', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="hasExpiryDate">Has Expiry Date</Label>
            <Switch
              id="hasExpiryDate"
              checked={hasExpiryDate}
              onCheckedChange={(checked) => setValue('hasExpiryDate', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={(checked) => setValue('active', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;
