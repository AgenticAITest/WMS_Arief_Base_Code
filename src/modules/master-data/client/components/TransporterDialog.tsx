import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { X } from 'lucide-react';
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
import { Textarea } from '@client/components/ui/textarea';
import { Badge } from '@client/components/ui/badge';

const transporterSchema = z.object({
  name: z.string().min(1, 'Transporter name is required'),
  code: z.string().min(1, 'Code is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  serviceAreas: z.array(z.string()).optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
});

type TransporterForm = z.infer<typeof transporterSchema>;

interface TransporterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  onSuccess: () => void;
}

const TransporterDialog = ({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: TransporterDialogProps) => {
  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<TransporterForm>({
    resolver: zodResolver(transporterSchema),
    defaultValues: {
      name: '',
      code: '',
      contactPerson: '',
      phone: '',
      email: '',
      website: '',
      serviceAreas: [],
      isActive: true,
      notes: '',
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name || '',
        code: editingItem.code || '',
        contactPerson: editingItem.contactPerson || '',
        phone: editingItem.phone || '',
        email: editingItem.email || '',
        website: editingItem.website || '',
        serviceAreas: editingItem.serviceAreas || [],
        isActive: editingItem.isActive ?? true,
        notes: editingItem.notes || '',
      });
      setServiceAreas(editingItem.serviceAreas || []);
    } else {
      reset({
        name: '',
        code: '',
        contactPerson: '',
        phone: '',
        email: '',
        website: '',
        serviceAreas: [],
        isActive: true,
        notes: '',
      });
      setServiceAreas([]);
    }
    setServiceAreaInput('');
  }, [editingItem, reset, open]);

  const handleAddServiceArea = () => {
    const trimmed = serviceAreaInput.trim();
    if (trimmed && !serviceAreas.includes(trimmed)) {
      const updatedAreas = [...serviceAreas, trimmed];
      setServiceAreas(updatedAreas);
      setValue('serviceAreas', updatedAreas);
      setServiceAreaInput('');
    }
  };

  const handleRemoveServiceArea = (area: string) => {
    const updatedAreas = serviceAreas.filter((a) => a !== area);
    setServiceAreas(updatedAreas);
    setValue('serviceAreas', updatedAreas);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddServiceArea();
    }
  };

  const onSubmit = async (data: TransporterForm) => {
    try {
      const payload = {
        ...data,
        serviceAreas: serviceAreas.length > 0 ? serviceAreas : null,
      };

      if (editingItem) {
        await axios.put(`/api/modules/master-data/transporters/${editingItem.id}`, payload);
        toast.success('Transporter updated successfully');
      } else {
        await axios.post('/api/modules/master-data/transporters', payload);
        toast.success('Transporter created successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save transporter');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Transporter' : 'Add New Transporter'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Transporter Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter transporter name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input id="code" {...register('code')} placeholder="Enter code" />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                {...register('contactPerson')}
                placeholder="Enter contact person"
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

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register('website')}
                placeholder="https://example.com"
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceArea">Service Areas</Label>
            <div className="flex gap-2">
              <Input
                id="serviceArea"
                value={serviceAreaInput}
                onChange={(e) => setServiceAreaInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter service area and press Enter"
              />
              <Button type="button" onClick={handleAddServiceArea} variant="secondary">
                Add
              </Button>
            </div>
            {serviceAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {serviceAreas.map((area, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {area}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveServiceArea(area)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Enter additional notes"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Transporter' : 'Create Transporter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransporterDialog;
