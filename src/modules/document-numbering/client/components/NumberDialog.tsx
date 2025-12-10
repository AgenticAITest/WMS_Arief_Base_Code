import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Switch } from '@client/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';

const numberConfigSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentName: z.string().min(1, 'Document name is required'),
  periodFormat: z.string().min(1, 'Period format is required'),
  prefix1Label: z.string().optional(),
  prefix1DefaultValue: z.string().optional(),
  prefix1Required: z.boolean(),
  prefix2Label: z.string().optional(),
  prefix2DefaultValue: z.string().optional(),
  prefix2Required: z.boolean(),
  sequenceLength: z.number().min(1).max(10),
  sequencePadding: z.string().length(1),
  separator: z.string().min(1).max(3),
  isActive: z.boolean(),
});

type NumberConfigForm = z.infer<typeof numberConfigSchema>;

interface DocumentNumberConfig {
  id: string;
  documentType: string;
  documentName: string;
  periodFormat: string;
  prefix1Label: string | null;
  prefix1DefaultValue: string | null;
  prefix1Required: boolean;
  prefix2Label: string | null;
  prefix2DefaultValue: string | null;
  prefix2Required: boolean;
  sequenceLength: number;
  sequencePadding: string;
  separator: string;
  isActive: boolean;
}

interface NumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: DocumentNumberConfig | null;
  onSuccess: () => void;
}

const NumberDialog = ({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: NumberDialogProps) => {
  const [preview, setPreview] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<NumberConfigForm>({
    resolver: zodResolver(numberConfigSchema),
    defaultValues: {
      documentType: '',
      documentName: '',
      periodFormat: 'YYMM',
      prefix1Label: '',
      prefix1DefaultValue: '',
      prefix1Required: false,
      prefix2Label: '',
      prefix2DefaultValue: '',
      prefix2Required: false,
      sequenceLength: 4,
      sequencePadding: '0',
      separator: '-',
      isActive: true,
    },
  });

  const documentType = watch('documentType');
  const periodFormat = watch('periodFormat');
  const prefix1Label = watch('prefix1Label');
  const prefix1DefaultValue = watch('prefix1DefaultValue');
  const prefix1Required = watch('prefix1Required');
  const prefix2Label = watch('prefix2Label');
  const prefix2DefaultValue = watch('prefix2DefaultValue');
  const prefix2Required = watch('prefix2Required');
  const sequenceLength = watch('sequenceLength');
  const separator = watch('separator');
  const isActive = watch('isActive');

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchPreview = useCallback(async (formData: any) => {
    if (!formData.documentType || !formData.periodFormat) {
      setPreview('');
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        
        const parts = [formData.documentType, '[PERIOD]'];
        if (formData.prefix1DefaultValue) parts.push(formData.prefix1DefaultValue);
        if (formData.prefix2DefaultValue) parts.push(formData.prefix2DefaultValue);
        parts.push('0'.repeat(formData.sequenceLength || 4));
        
        const localPreview = parts.join(formData.separator || '-');
        setPreview(localPreview);
      } catch (error) {
        console.error('Failed to generate preview:', error);
        setPreview('Preview unavailable');
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (open && !editingItem) {
      reset({
        documentType: '',
        documentName: '',
        periodFormat: 'YYMM',
        prefix1Label: '',
        prefix1DefaultValue: '',
        prefix1Required: false,
        prefix2Label: '',
        prefix2DefaultValue: '',
        prefix2Required: false,
        sequenceLength: 4,
        sequencePadding: '0',
        separator: '-',
        isActive: true,
      });
      setPreview('');
    }
  }, [open, editingItem, reset]);

  useEffect(() => {
    if (editingItem) {
      setValue('documentType', editingItem.documentType);
      setValue('documentName', editingItem.documentName);
      setValue('periodFormat', editingItem.periodFormat);
      setValue('prefix1Label', editingItem.prefix1Label || '');
      setValue('prefix1DefaultValue', editingItem.prefix1DefaultValue || '');
      setValue('prefix1Required', editingItem.prefix1Required || false);
      setValue('prefix2Label', editingItem.prefix2Label || '');
      setValue('prefix2DefaultValue', editingItem.prefix2DefaultValue || '');
      setValue('prefix2Required', editingItem.prefix2Required || false);
      setValue('sequenceLength', editingItem.sequenceLength || 4);
      setValue('sequencePadding', editingItem.sequencePadding || '0');
      setValue('separator', editingItem.separator || '-');
      setValue('isActive', editingItem.isActive);
    }
  }, [editingItem, setValue]);

  useEffect(() => {
    const formData = {
      documentType,
      periodFormat,
      prefix1DefaultValue,
      prefix2DefaultValue,
      sequenceLength,
      separator,
    };
    fetchPreview(formData);
  }, [documentType, periodFormat, prefix1DefaultValue, prefix2DefaultValue, sequenceLength, separator, fetchPreview]);

  const onSubmit = async (data: NumberConfigForm) => {
    try {
      const payload = {
        ...data,
        prefix1Label: data.prefix1Label || null,
        prefix1DefaultValue: data.prefix1DefaultValue || null,
        prefix2Label: data.prefix2Label || null,
        prefix2DefaultValue: data.prefix2DefaultValue || null,
      };

      if (editingItem) {
        await axios.put(`/api/modules/document-numbering/configs/${editingItem.id}`, payload);
        toast.success('Document configuration updated successfully');
      } else {
        await axios.post('/api/modules/document-numbering/configs', payload);
        toast.success('Document configuration created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Edit' : 'Add'} Document Number Configuration
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">
                Document Type Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="documentType"
                placeholder="e.g., PO, SO, GRN"
                {...register('documentType')}
                disabled={!!editingItem}
              />
              {errors.documentType && (
                <p className="text-sm text-destructive">{errors.documentType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentName">
                Document Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="documentName"
                placeholder="e.g., Purchase Order"
                {...register('documentName')}
              />
              {errors.documentName && (
                <p className="text-sm text-destructive">{errors.documentName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodFormat">
              Period Format <span className="text-destructive">*</span>
            </Label>
            <Select
              value={periodFormat}
              onValueChange={(value) => setValue('periodFormat', value)}
            >
              <SelectTrigger id="periodFormat">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YYMM">YYMM (e.g., 2510 for Oct 2025)</SelectItem>
                <SelectItem value="YYYYMM">YYYYMM (e.g., 202510)</SelectItem>
                <SelectItem value="YYWW">YYWW (e.g., 2542 for Week 42)</SelectItem>
                <SelectItem value="YYYYWW">YYYYWW (e.g., 202542)</SelectItem>
              </SelectContent>
            </Select>
            {errors.periodFormat && (
              <p className="text-sm text-destructive">{errors.periodFormat.message}</p>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h3 className="font-medium text-sm">Prefix 1 (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix1Label">Label</Label>
                <Input
                  id="prefix1Label"
                  placeholder="e.g., Warehouse"
                  {...register('prefix1Label')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix1DefaultValue">Default Value</Label>
                <Input
                  id="prefix1DefaultValue"
                  placeholder="e.g., WH1"
                  {...register('prefix1DefaultValue')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="prefix1Required" className="text-sm">
                Make Prefix 1 Required
              </Label>
              <Switch
                id="prefix1Required"
                checked={prefix1Required}
                onCheckedChange={(checked) => setValue('prefix1Required', checked)}
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h3 className="font-medium text-sm">Prefix 2 (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix2Label">Label</Label>
                <Input
                  id="prefix2Label"
                  placeholder="e.g., Category"
                  {...register('prefix2Label')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix2DefaultValue">Default Value</Label>
                <Input
                  id="prefix2DefaultValue"
                  placeholder="e.g., LOCAL"
                  {...register('prefix2DefaultValue')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="prefix2Required" className="text-sm">
                Make Prefix 2 Required
              </Label>
              <Switch
                id="prefix2Required"
                checked={prefix2Required}
                onCheckedChange={(checked) => setValue('prefix2Required', checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sequenceLength">Sequence Length</Label>
              <Input
                id="sequenceLength"
                type="number"
                min="1"
                max="10"
                {...register('sequenceLength', { valueAsNumber: true })}
              />
              {errors.sequenceLength && (
                <p className="text-sm text-destructive">{errors.sequenceLength.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="separator">Separator</Label>
              <Input
                id="separator"
                placeholder="-"
                maxLength={3}
                {...register('separator')}
              />
              {errors.separator && (
                <p className="text-sm text-destructive">{errors.separator.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable this document number configuration
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <div className="border rounded-lg p-6 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Preview</h3>
              {previewLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              Next document number will look like:
            </p>
            <div className="bg-background border-2 border-primary/20 rounded-md p-4 text-center">
              <p className="text-2xl font-mono font-bold text-primary">
                {preview || 'Configure fields to see preview'}
              </p>
            </div>
            {preview && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-mono">
                  {documentType && <span className="text-primary font-semibold">{documentType}</span>}
                  {documentType && separator}
                  <span className="text-blue-600 font-semibold">[PERIOD]</span>
                  {prefix1DefaultValue && separator}
                  {prefix1DefaultValue && <span className="text-green-600 font-semibold">{prefix1DefaultValue}</span>}
                  {prefix2DefaultValue && separator}
                  {prefix2DefaultValue && <span className="text-orange-600 font-semibold">{prefix2DefaultValue}</span>}
                  {separator}
                  <span className="text-purple-600 font-semibold">{'0'.repeat(sequenceLength || 4)}</span>
                </p>
                <p className="text-center">
                  <span className="text-primary">Type</span> • 
                  <span className="text-blue-600"> Period</span> • 
                  {prefix1DefaultValue && <><span className="text-green-600"> Prefix1</span> • </>}
                  {prefix2DefaultValue && <><span className="text-orange-600"> Prefix2</span> • </>}
                  <span className="text-purple-600"> Sequence</span>
                </p>
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
              {isSubmitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NumberDialog;
