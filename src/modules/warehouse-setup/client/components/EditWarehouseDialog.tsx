import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Switch } from '@client/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Loader2 } from 'lucide-react';
import { warehouseFormSchema, type WarehouseFormData } from '../schemas/warehouseSchemas';
import { useAuth } from '@client/provider/AuthProvider';
import axios from 'axios';
import { toast } from 'sonner';

interface EditWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: {
    id: string;
    name: string;
    address: string | null;
    isActive: boolean;
    pickingStrategy: string;
    autoAssignBins: boolean;
    requireBatchTracking: boolean;
    requireExpiryTracking: boolean;
  } | null;
  onSuccess: () => void;
}

export function EditWarehouseDialog({ open, onOpenChange, warehouse, onSuccess }: EditWarehouseDialogProps) {
  const { token: accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: '',
      address: '',
      isActive: true,
      pickingStrategy: 'FEFO',
      autoAssignBins: true,
      requireBatchTracking: false,
      requireExpiryTracking: true,
    },
  });

  // Cleanup pointer events when dialog state changes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (warehouse) {
      reset({
        name: warehouse.name,
        address: warehouse.address || '',
        isActive: Boolean(warehouse.isActive),
        pickingStrategy: warehouse.pickingStrategy as any,
        autoAssignBins: Boolean(warehouse.autoAssignBins),
        requireBatchTracking: Boolean(warehouse.requireBatchTracking),
        requireExpiryTracking: Boolean(warehouse.requireExpiryTracking),
      });
    } else {
      reset({
        name: '',
        address: '',
        isActive: true,
        pickingStrategy: 'FEFO',
        autoAssignBins: true,
        requireBatchTracking: false,
        requireExpiryTracking: true,
      });
    }
  }, [warehouse, open, reset]);

  const isActive = watch('isActive');
  const autoAssignBins = watch('autoAssignBins');
  const requireBatchTracking = watch('requireBatchTracking');
  const requireExpiryTracking = watch('requireExpiryTracking');

  const onSubmit = async (data: WarehouseFormData) => {
    if (!warehouse) return;
    
    setIsSubmitting(true);
    try {
      await axios.put(`/api/modules/warehouse-setup/warehouses/${warehouse.id}`, data, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Warehouse updated successfully');
      onOpenChange(false);
      // Delay success callback to ensure dialog closes first
      setTimeout(() => {
        onSuccess();
      }, 150);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.error('Form validation errors:', errors);
    toast.error('Please check the form for errors');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Delay reset to ensure dialog closes properly
        setTimeout(() => {
          reset({
            name: '',
            address: '',
            isActive: true,
            pickingStrategy: 'FEFO',
            autoAssignBins: true,
            requireBatchTracking: false,
            requireExpiryTracking: true,
          });
        }, 150);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Warehouse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register('name')} placeholder="Main Warehouse" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="123 Storage St, City, Country"
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">Warehouse Configuration</h4>
            
            <div className="space-y-2">
              <Label htmlFor="pickingStrategy">
                Picking Strategy <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="pickingStrategy"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pickingStrategy">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIFO">First In, First Out (FIFO)</SelectItem>
                      <SelectItem value="FEFO">First Expired, First Out (FEFO)</SelectItem>
                      <SelectItem value="LIFO">Last In, First Out (LIFO)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.pickingStrategy && (
                <p className="text-sm text-destructive">{errors.pickingStrategy.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoAssignBins">Auto-assign Bins</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign bins during putaway
                </p>
              </div>
              <Switch
                id="autoAssignBins"
                checked={autoAssignBins}
                onCheckedChange={(checked) => setValue('autoAssignBins', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireBatchTracking">Batch Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Track inventory by batch numbers
                </p>
              </div>
              <Switch
                id="requireBatchTracking"
                checked={requireBatchTracking}
                onCheckedChange={(checked) => setValue('requireBatchTracking', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireExpiryTracking">Expiry Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Track inventory expiration dates
                </p>
              </div>
              <Switch
                id="requireExpiryTracking"
                checked={requireExpiryTracking}
                onCheckedChange={(checked) => setValue('requireExpiryTracking', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Warehouse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
