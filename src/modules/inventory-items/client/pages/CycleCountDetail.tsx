import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Badge } from '@client/components/ui/badge';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { ArrowLeft, Search, FileDown, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CycleCount {
  id: string;
  countNumber: string;
  status: string;
  countType: string;
  scheduledDate: string | null;
  completedDate: string | null;
  itemsCount: number;
}

interface CycleCountItem {
  id: string;
  binLocation: string;
  binId: string;
  productSku: string;
  productName: string;
  systemQuantity: number;
  countedQuantity: number | null;
  varianceQuantity: number | null;
  reasonCode: string | null;
  reasonDescription: string | null;
  countedAt: string | null;
  warehouseName: string;
}

const REASON_OPTIONS = [
  'Damaged',
  'Miscount',
  'Shrinkage',
  'Theft',
  'Other',
];

const CycleCountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cycleCount, setCycleCount] = useState<CycleCount | null>(null);
  const [items, setItems] = useState<CycleCountItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (id) {
      fetchCycleCount();
      fetchItems();
    }
  }, [id, pagination.page, searchDebounce]);

  const fetchCycleCount = async () => {
    try {
      const response = await axios.get(`/api/modules/inventory-items/cycle-counts/${id}`);
      if (response.data.success) {
        setCycleCount(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching cycle count:', error);
      toast.error('Failed to load cycle count details');
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/modules/inventory-items/cycle-counts/${id}/items`, {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchDebounce,
        },
      });

      if (response.data.success) {
        setItems(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching cycle count items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (itemId: string, data: Partial<CycleCountItem>) => {
    try {
      const response = await axios.put(
        `/api/modules/inventory-items/cycle-counts/${id}/items/${itemId}`,
        data
      );

      if (response.data.success) {
        // Update local state
        setItems(items.map(item =>
          item.id === itemId
            ? {
                ...item,
                ...data,
                varianceQuantity: data.countedQuantity !== undefined
                  ? data.countedQuantity - item.systemQuantity
                  : item.varianceQuantity,
              }
            : item
        ));
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const [updateTimers, setUpdateTimers] = useState<Record<string, NodeJS.Timeout>>({});

  const handleCountedQuantityChange = (itemId: string, value: string) => {
    const quantity = value === '' ? null : parseInt(value);
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Update local state immediately for better UX
    setItems(items.map(i =>
      i.id === itemId
        ? {
            ...i,
            countedQuantity: quantity,
            varianceQuantity: quantity !== null ? quantity - i.systemQuantity : null,
          }
        : i
    ));

    // Debounced API call (500ms)
    if (updateTimers[itemId]) {
      clearTimeout(updateTimers[itemId]);
    }
    
    const timer = setTimeout(() => {
      updateItem(itemId, { countedQuantity: quantity });
    }, 500);
    
    setUpdateTimers(prev => ({ ...prev, [itemId]: timer }));
  };

  const handleReasonChange = (itemId: string, reasonCode: string) => {
    updateItem(itemId, { reasonCode });
  };

  const handleNotesChange = (itemId: string, reasonDescription: string) => {
    // Update local state
    setItems(items.map(i =>
      i.id === itemId ? { ...i, reasonDescription } : i
    ));

    // Debounced API call (500ms)
    if (updateTimers[`${itemId}-notes`]) {
      clearTimeout(updateTimers[`${itemId}-notes`]);
    }
    
    const timer = setTimeout(() => {
      updateItem(itemId, { reasonDescription });
    }, 500);
    
    setUpdateTimers(prev => ({ ...prev, [`${itemId}-notes`]: timer }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post(`/api/modules/inventory-items/cycle-counts/${id}/submit`);

      if (response.data.success) {
        toast.success('Cycle count submitted successfully');
        navigate('/inventory-items/cycle-count');
      }
    } catch (error: any) {
      console.error('Error submitting cycle count:', error);
      toast.error(error.response?.data?.message || 'Failed to submit cycle count');
    } finally {
      setSubmitting(false);
    }
  };

  const exportDiscrepancies = () => {
    const discrepancies = items.filter(item => item.varianceQuantity !== 0);
    const csv = [
      ['Bin Location', 'SKU', 'Product Name', 'System Qty', 'Counted Qty', 'Difference', 'Reason', 'Notes'].join(','),
      ...discrepancies.map(item => [
        item.binLocation,
        item.productSku,
        item.productName,
        item.systemQuantity,
        item.countedQuantity || '',
        item.varianceQuantity || '',
        item.reasonCode || '',
        item.reasonDescription || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cycleCount?.countNumber}-discrepancies.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getVarianceBadge = (variance: number | null) => {
    if (variance === null || variance === 0) return null;

    return (
      <Badge variant={variance < 0 ? 'destructive' : 'default'} className="text-xs">
        {variance > 0 ? '+' : ''}{variance}
      </Badge>
    );
  };

  if (!cycleCount) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inventory-items/cycle-count')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Cycle Count: {cycleCount.countNumber}</h1>
          <p className="text-muted-foreground">
            {cycleCount.countType} count • {cycleCount.itemsCount} items • Created on{' '}
            {cycleCount.scheduledDate
              ? format(new Date(cycleCount.scheduledDate), 'MMM dd, yyyy')
              : 'N/A'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportDiscrepancies}>
            <FileDown className="w-4 h-4 mr-2" />
            Export Discrepancies
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || cycleCount.status !== 'created'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Count
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Count Items</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading items...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Bin Location</th>
                      <th className="text-left py-3 px-2 font-medium">Item SKU</th>
                      <th className="text-left py-3 px-2 font-medium">Item Name</th>
                      <th className="text-right py-3 px-2 font-medium">System Qty</th>
                      <th className="text-right py-3 px-2 font-medium">Counted Qty</th>
                      <th className="text-center py-3 px-2 font-medium">Difference</th>
                      <th className="text-left py-3 px-2 font-medium">Reason</th>
                      <th className="text-left py-3 px-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{item.binLocation}</td>
                        <td className="py-3 px-2">{item.productSku}</td>
                        <td className="py-3 px-2">{item.productName}</td>
                        <td className="py-3 px-2 text-right">{item.systemQuantity} units</td>
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.countedQuantity ?? ''}
                            onChange={(e) => handleCountedQuantityChange(item.id, e.target.value)}
                            className="w-24 text-right"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-2 text-center">
                          {item.varianceQuantity !== null ? (
                            getVarianceBadge(item.varianceQuantity) || (
                              <span className="text-muted-foreground">-</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={item.reasonCode || ''}
                            onValueChange={(value) => handleReasonChange(item.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {REASON_OPTIONS.map((reason) => (
                                <SelectItem key={reason} value={reason}>
                                  {reason}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2">
                          <Input
                            value={item.reasonDescription || ''}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            className="w-48"
                            placeholder="Notes..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} items
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-2 text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default withModuleAuthorization(CycleCountDetail, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
