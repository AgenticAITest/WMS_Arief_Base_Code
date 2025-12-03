import { useState, useEffect, useRef } from 'react';
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

interface AddWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddWarehouseDialog({ open, onOpenChange, onSuccess }: AddWarehouseDialogProps) {
  const { token: accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    if (!open) {
      cleanupTimerRef.current = setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';
        cleanupTimerRef.current = null;
      }, 100);
    }

    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
      document.body.style.pointerEvents = '';
      document.documentElement.style.pointerEvents = '';
    };
  }, [open]);

  const isActive = watch('isActive');
  const autoAssignBins = watch('autoAssignBins');
  const requireBatchTracking = watch('requireBatchTracking');
  const requireExpiryTracking = watch('requireExpiryTracking');

  const cleanupPointerEvents = () => {
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  };

  const onSubmit = async (data: WarehouseFormData) => {
    setIsSubmitting(true);
    try {
      await axios.post('/api/modules/warehouse-setup/warehouses', data, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Warehouse created successfully');
      reset();
      cleanupPointerEvents();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        reset();
        cleanupPointerEvents();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Warehouse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              Create Warehouse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
