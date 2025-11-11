import { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Input } from '@client/components/ui/input';
import { Textarea } from '@client/components/ui/textarea';
import { Button } from '@client/components/ui/button';
import { Switch } from '@client/components/ui/switch';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  type: string;
  transporterId?: string;
  costCalculationMethod: string;
  baseCost?: string;
  estimatedDays?: number;
  isActive: boolean;
  description?: string;
}

interface Transporter {
  id: string;
  name: string;
  code: string;
}

interface ShippingMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shippingMethod?: ShippingMethod | null;
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  type: z.string().min(1, 'Type is required'),
  transporterId: z.string().optional(),
  costCalculationMethod: z.string().min(1, 'Cost calculation method is required'),
  baseCost: z.string().optional(),
  estimatedDays: z.string().optional(),
  isActive: z.boolean(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ShippingMethodDialog({
  isOpen,
  onClose,
  onSuccess,
  shippingMethod,
}: ShippingMethodDialogProps) {
  const [loading, setLoading] = useState(false);
  const [transporters, setTransporters] = useState<Transporter[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      type: '',
      transporterId: '',
      costCalculationMethod: 'fixed',
      baseCost: '',
      estimatedDays: '',
      isActive: true,
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchTransporters();
      if (shippingMethod) {
        form.reset({
          name: shippingMethod.name,
          code: shippingMethod.code,
          type: shippingMethod.type,
          transporterId: shippingMethod.transporterId || '',
          costCalculationMethod: shippingMethod.costCalculationMethod,
          baseCost: shippingMethod.baseCost || '',
          estimatedDays: shippingMethod.estimatedDays?.toString() || '',
          isActive: shippingMethod.isActive,
          description: shippingMethod.description || '',
        });
      } else {
        form.reset({
          name: '',
          code: '',
          type: '',
          transporterId: '',
          costCalculationMethod: 'fixed',
          baseCost: '',
          estimatedDays: '',
          isActive: true,
          description: '',
        });
      }
    }
  }, [isOpen, shippingMethod, form]);

  const fetchTransporters = async () => {
    try {
      const response = await axios.get('/api/modules/master-data/transporters', {
        params: { limit: 100 },
      });
      setTransporters(response.data.data || []);
    } catch (error) {
      console.error('Error fetching transporters:', error);
      toast.error('Failed to load transporters');
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        code: data.code,
        type: data.type,
        transporterId: data.transporterId || null,
        costCalculationMethod: data.costCalculationMethod,
        baseCost: data.baseCost ? parseFloat(data.baseCost) : null,
        estimatedDays: data.estimatedDays ? parseInt(data.estimatedDays) : null,
        isActive: data.isActive,
        description: data.description || null,
      };

      if (shippingMethod) {
        await axios.put(
          `/api/modules/master-data/shipping-methods/${shippingMethod.id}`,
          payload
        );
        toast.success('Shipping method updated successfully');
      } else {
        await axios.post('/api/modules/master-data/shipping-methods', payload);
        toast.success('Shipping method created successfully');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving shipping method:', error);
      toast.error(error.response?.data?.message || 'Failed to save shipping method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {shippingMethod ? 'Edit Shipping Method' : 'Create Shipping Method'}
          </DialogTitle>
          <DialogDescription>
            {shippingMethod
              ? 'Update the shipping method details below.'
              : 'Fill in the details to create a new shipping method.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Express Delivery" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="EXPRESS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="third_party">Third Party</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transporterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transporter</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transporter (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {transporters.map((transporter) => (
                          <SelectItem key={transporter.id} value={transporter.id}>
                            {transporter.name} ({transporter.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costCalculationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Calculation Method *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="weight_based">Weight Based</SelectItem>
                        <SelectItem value="volume_based">Volume Based</SelectItem>
                        <SelectItem value="distance_based">Distance Based</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional base cost amount</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="estimatedDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Days</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="3"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Estimated delivery time in days</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Enable or disable this shipping method
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : shippingMethod ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
