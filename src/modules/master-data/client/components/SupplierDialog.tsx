import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin } from 'lucide-react';
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
import { Separator } from '@client/components/ui/separator';

const locationSchema = z.object({
  id: z.string().optional(),
  locationType: z.string().min(1, 'Location type is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isActive: z.boolean(),
});

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  locations: z.array(locationSchema),
});

type SupplierForm = z.infer<typeof supplierSchema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  onSuccess: () => void;
}

const SupplierDialog = ({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: SupplierDialogProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    control,
    watch,
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      taxId: '',
      locations: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'locations',
  });

  const [coordinateInputs, setCoordinateInputs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        contactPerson: editingItem.contactPerson || '',
        email: editingItem.email || '',
        phone: editingItem.phone || '',
        taxId: editingItem.taxId || '',
        locations: (editingItem.locations || []).map((loc: any) => ({
          ...loc,
          latitude: loc.latitude ? parseFloat(loc.latitude) : undefined,
          longitude: loc.longitude ? parseFloat(loc.longitude) : undefined,
        })),
      });
    } else {
      reset({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        taxId: '',
        locations: [],
      });
    }
  }, [editingItem, open, reset]);

  useEffect(() => {
    const coords: { [key: string]: string } = {};
    fields.forEach((field, idx) => {
      const long = watch(`locations.${idx}.longitude`);
      const lat = watch(`locations.${idx}.latitude`);
      if (long != null && lat != null && !isNaN(long) && !isNaN(lat)) {
        coords[idx] = `${long},${lat}`;
      } else {
        coords[idx] = '';
      }
    });
    setCoordinateInputs(coords);
  }, [fields, watch]);

  const onSubmit = async (data: SupplierForm) => {
    try {
      const payload = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        contactPerson: data.contactPerson || undefined,
        taxId: data.taxId || undefined,
        locations: data.locations.map(loc => ({
          ...loc,
          email: loc.email || undefined,
          phone: loc.phone || undefined,
          contactPerson: loc.contactPerson || undefined,
          latitude: loc.latitude ?? undefined,
          longitude: loc.longitude ?? undefined,
        })),
      };

      if (editingItem) {
        await axios.put(`/api/modules/master-data/suppliers/${editingItem.id}`, payload);
        toast.success('Supplier updated successfully');
      } else {
        await axios.post('/api/modules/master-data/suppliers', payload);
        toast.success('Supplier created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    }
  };

  const getFirstErrorMessage = (errors: any): string | null => {
    if (!errors || typeof errors !== 'object') return null;
    
    if (errors.message && typeof errors.message === 'string') {
      return errors.message;
    }
    
    for (const key in errors) {
      if (errors.hasOwnProperty(key)) {
        const nestedError = getFirstErrorMessage(errors[key]);
        if (nestedError) return nestedError;
      }
    }
    
    return null;
  };

  const onInvalid = (errors: any) => {
    console.log('Form validation errors:', errors);
    const errorMessage = getFirstErrorMessage(errors);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.error('Please check all required fields');
    }
  };

  const addLocation = () => {
    append({
      locationType: 'pickup',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      latitude: undefined,
      longitude: undefined,
      contactPerson: '',
      phone: '',
      email: '',
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Edit Supplier' : 'Add Supplier'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Supplier Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Supplier Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter supplier name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / Code</Label>
                <Input
                  id="taxId"
                  {...register('taxId')}
                  placeholder="Enter tax ID or code"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  {...register('contactPerson')}
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Locations</h3>
              <Button type="button" size="sm" onClick={addLocation}>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No locations added yet</p>
                <p className="text-xs">Click "Add Location" to add pickup or billing locations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Location {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Location Type <span className="text-destructive">*</span></Label>
                        <Select
                          value={watch(`locations.${index}.locationType`)}
                          onValueChange={(value) => setValue(`locations.${index}.locationType`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">Pickup</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.locations?.[index]?.locationType && (
                          <p className="text-sm text-destructive">
                            {errors.locations[index]?.locationType?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Contact Person</Label>
                        <Input
                          {...register(`locations.${index}.contactPerson`)}
                          placeholder="Location contact"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Address <span className="text-destructive">*</span></Label>
                      <Input
                        {...register(`locations.${index}.address`)}
                        placeholder="Street address"
                      />
                      {errors.locations?.[index]?.address && (
                        <p className="text-sm text-destructive">
                          {errors.locations[index]?.address?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>City <span className="text-destructive">*</span></Label>
                        <Input
                          {...register(`locations.${index}.city`)}
                          placeholder="City"
                        />
                        {errors.locations?.[index]?.city && (
                          <p className="text-sm text-destructive">
                            {errors.locations[index]?.city?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>State <span className="text-destructive">*</span></Label>
                        <Input
                          {...register(`locations.${index}.state`)}
                          placeholder="State"
                        />
                        {errors.locations?.[index]?.state && (
                          <p className="text-sm text-destructive">
                            {errors.locations[index]?.state?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Postal Code <span className="text-destructive">*</span></Label>
                        <Input
                          {...register(`locations.${index}.postalCode`)}
                          placeholder="ZIP"
                        />
                        {errors.locations?.[index]?.postalCode && (
                          <p className="text-sm text-destructive">
                            {errors.locations[index]?.postalCode?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Country <span className="text-destructive">*</span></Label>
                        <Input
                          {...register(`locations.${index}.country`)}
                          placeholder="Country"
                        />
                        {errors.locations?.[index]?.country && (
                          <p className="text-sm text-destructive">
                            {errors.locations[index]?.country?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Coordinates (long,lat)</Label>
                        <Input
                          placeholder="e.g., 103.8198,1.3521"
                          value={coordinateInputs[index] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCoordinateInputs(prev => ({ ...prev, [index]: value }));
                            
                            const parts = value.split(',').map(p => p.trim());
                            if (parts.length === 2) {
                              const long = parseFloat(parts[0]);
                              const lat = parseFloat(parts[1]);
                              if (!isNaN(long) && !isNaN(lat)) {
                                setValue(`locations.${index}.longitude`, long);
                                setValue(`locations.${index}.latitude`, lat);
                              }
                            } else if (value === '') {
                              setValue(`locations.${index}.longitude`, undefined);
                              setValue(`locations.${index}.latitude`, undefined);
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground">Copy from Google Maps</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          {...register(`locations.${index}.phone`)}
                          placeholder="Location phone"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          {...register(`locations.${index}.email`)}
                          placeholder="Location email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex items-center space-x-2 pt-2">
                          <Switch
                            checked={watch(`locations.${index}.isActive`)}
                            onCheckedChange={(checked) => setValue(`locations.${index}.isActive`, checked)}
                          />
                          <span className="text-sm">
                            {watch(`locations.${index}.isActive`) ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierDialog;
