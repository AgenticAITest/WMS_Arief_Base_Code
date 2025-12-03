import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@client/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { shelfFormSchema, type ShelfFormData } from '../schemas/warehouseSchemas';
import { useAuth } from '@client/provider/AuthProvider';
import axios from 'axios';
import { toast } from 'sonner';

interface AddShelfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aisleId: string;
  aisleName: string;
  onSuccess: () => void;
}

export function AddShelfDialog({
  open,
  onOpenChange,
  aisleId,
  aisleName,
  onSuccess,
}: AddShelfDialogProps) {
  const { token: accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ShelfFormData>({
    resolver: zodResolver(shelfFormSchema),
    defaultValues: {
      name: '',
      description: '',
      aisleId,
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

  const cleanupPointerEvents = () => {
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  };

  const onSubmit = async (data: ShelfFormData) => {
    setIsSubmitting(true);
    try {
      await axios.post('/api/modules/warehouse-setup/shelves', data, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Shelf created successfully');
      reset();
      cleanupPointerEvents();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create shelf');
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
          <DialogTitle>Add New Shelf</DialogTitle>
          <p className="text-sm text-muted-foreground">
            in <span className="font-medium">{aisleName}</span>
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('aisleId')} value={aisleId} />

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register('name')} placeholder="Shelf A" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Top level shelf..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
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
              Create Shelf
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
