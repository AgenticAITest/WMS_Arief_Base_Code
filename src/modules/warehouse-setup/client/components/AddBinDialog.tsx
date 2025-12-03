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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/components/ui/popover';
import { Loader2, ChevronsUpDown, Check, X } from 'lucide-react';
import { binFormSchema, type BinFormData } from '../schemas/warehouseSchemas';
import { useAuth } from '@client/provider/AuthProvider';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@client/lib/utils';

interface AddBinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shelfId: string;
  shelfName: string;
  onSuccess: () => void;
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

export function AddBinDialog({
  open,
  onOpenChange,
  shelfId,
  shelfName,
  onSuccess,
}: AddBinDialogProps) {
  const { token: accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuPopoverOpen, setSkuPopoverOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BinFormData>({
    resolver: zodResolver(binFormSchema),
    defaultValues: {
      name: '',
      barcode: '',
      maxWeight: '',
      maxVolume: '',
      fixedSku: '',
      category: '',
      requiredTemperature: '',
      accessibilityScore: 50,
      shelfId,
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

  useEffect(() => {
    if (open && accessToken) {
      fetchProducts();
    }
  }, [open, accessToken]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await axios.get('/api/modules/master-data/products', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 }
      });
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.sku.toLowerCase().includes(skuSearch.toLowerCase()) ||
      product.name.toLowerCase().includes(skuSearch.toLowerCase())
  ).slice(0, 10);

  const cleanupPointerEvents = () => {
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  };

  const onSubmit = async (data: BinFormData) => {
    setIsSubmitting(true);
    try {
      await axios.post('/api/modules/warehouse-setup/bins', data, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Bin created successfully');
      reset();
      setSelectedProduct(null);
      setSkuSearch('');
      setProducts([]);
      setLoadingProducts(false);
      setSkuPopoverOpen(false);
      cleanupPointerEvents();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create bin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      if (!newOpen) {
        setSkuPopoverOpen(false);
        reset();
        setSelectedProduct(null);
        setSkuSearch('');
        setProducts([]);
        setLoadingProducts(false);
      }
      onOpenChange(newOpen);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setValue('fixedSku', product.sku);
    setSkuPopoverOpen(false);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setValue('fixedSku', '');
    setSkuSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Bin</DialogTitle>
          <p className="text-sm text-muted-foreground">
            in <span className="font-medium">{shelfName}</span>
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('shelfId')} value={shelfId} />

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register('name')} placeholder="Bin 001" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              {...register('barcode')}
              placeholder="BIN-001-ABC"
            />
            {errors.barcode && (
              <p className="text-sm text-destructive">{errors.barcode.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxWeight">Max Weight (kg)</Label>
              <Input
                id="maxWeight"
                {...register('maxWeight')}
                type="number"
                step="0.001"
                placeholder="100.000"
              />
              {errors.maxWeight && (
                <p className="text-sm text-destructive">{errors.maxWeight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxVolume">Max Volume (m³)</Label>
              <Input
                id="maxVolume"
                {...register('maxVolume')}
                type="number"
                step="0.001"
                placeholder="5.000"
              />
              {errors.maxVolume && (
                <p className="text-sm text-destructive">{errors.maxVolume.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fixed SKU</Label>
            <input type="hidden" {...register('fixedSku')} />
            <Popover open={skuPopoverOpen} onOpenChange={setSkuPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={skuPopoverOpen}
                  className="w-full justify-between"
                  type="button"
                >
                  {selectedProduct ? (
                    <span className="truncate">{selectedProduct.sku} - {selectedProduct.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Select product (optional)</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <div className="flex items-center border-b p-2">
                  <Input
                    placeholder="Search by SKU or name..."
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    className="border-0 focus-visible:ring-0"
                  />
                  {skuSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSkuSearch('')}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="max-h-60 overflow-auto">
                  {loadingProducts ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading products...</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {skuSearch ? 'No products found' : 'No products available'}
                    </div>
                  ) : (
                    <div className="p-1">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className={cn(
                            "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            selectedProduct?.id === product.id && "bg-accent"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{product.sku}</div>
                            <div className="text-xs text-muted-foreground">{product.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedProduct && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Selected:</span>
                <span className="font-medium">{selectedProduct.sku}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearProduct}
                  className="h-6 px-2"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {errors.fixedSku && (
              <p className="text-sm text-destructive">{errors.fixedSku.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              If this bin is dedicated to one product only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              {...register('category')}
              placeholder="Heavy, Fragile, etc."
            />
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredTemperature">Required Temperature</Label>
            <Input
              id="requiredTemperature"
              {...register('requiredTemperature')}
              placeholder="Cold (2-8°C), Frozen, Room Temp"
            />
            {errors.requiredTemperature && (
              <p className="text-sm text-destructive">
                {errors.requiredTemperature.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessibilityScore">
              Accessibility Score (0-100)
            </Label>
            <Input
              id="accessibilityScore"
              {...register('accessibilityScore', { valueAsNumber: true })}
              type="number"
              min="0"
              max="100"
              placeholder="50"
            />
            {errors.accessibilityScore && (
              <p className="text-sm text-destructive">
                {errors.accessibilityScore.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Higher score = easier to access (e.g., ground level = 100, high shelf = 20)
            </p>
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
              Create Bin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
