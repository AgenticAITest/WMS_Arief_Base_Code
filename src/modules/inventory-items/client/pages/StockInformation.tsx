import { useState, useEffect } from 'react';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Search, Eye } from 'lucide-react';
import { Input } from '@client/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { useAuth } from '@client/provider/AuthProvider';
import { ViewStockDetailsDialog } from '../components/ViewStockDetailsDialog';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DebouncedInput } from '@client/components/DebouncedInput';

interface StockItem {
  productId: string;
  productSku: string;
  productName: string;
  productDescription: string | null;
  hasExpiryDate: boolean;
  totalAvailableQuantity: number;
  totalReservedQuantity: number;
  locationCount: number;
  firstBinId: string;
  firstBinName: string;
  earliestExpiryDate: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const StockInformation = () => {
  const { token: accessToken } = useAuth();
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    sku: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (pagination.page === 1) {
        fetchData();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/modules/inventory-items/stock-information', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.data.success) {
        setData(response.data.data || []);
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch stock information');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item: StockItem) => {
    setSelectedProduct({
      id: item.productId,
      sku: item.productSku,
      name: item.productName,
    });
    setDetailsDialogOpen(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const getLocationDisplay = (locationCount: number, firstBinName: string) => {
    if (locationCount === 1) {
      return firstBinName;
    }
    return `${locationCount} locations`;
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Information</h1>
          <p className="text-muted-foreground">
            View current stock levels and locations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              {/* <Input
                placeholder="Search by product SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              /> */}
              <DebouncedInput
                value={searchTerm}
                onChange={(value) => setSearchTerm(String(value))}
                placeholder="Search by product SKU or name..."
                debounce={500}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {searchTerm
                        ? 'No stock items found matching your search.'
                        : 'No stock items available.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">
                        {item.productSku}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          {item.productDescription && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {item.productDescription}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-green-600">
                            {item.totalAvailableQuantity.toLocaleString()}
                          </span>
                          {item.totalReservedQuantity > 0 && (
                            <span className="text-xs text-orange-600">
                              ({item.totalReservedQuantity.toLocaleString()} reserved)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.locationCount > 1 ? (
                          <Badge variant="secondary">
                            {getLocationDisplay(item.locationCount, item.firstBinName)}
                          </Badge>
                        ) : (
                          <span className="text-sm">{item.firstBinName}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.hasExpiryDate ? (
                          <span className="text-sm">
                            {formatDate(item.earliestExpiryDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} items
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === pagination.totalPages ||
                        Math.abs(page - pagination.page) <= 1
                    )
                    .map((page, index, arr) => (
                      <div key={page}>
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <Button
                          variant={page === pagination.page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPagination((prev) => ({ ...prev, page }))}
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <ViewStockDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          productId={selectedProduct.id}
          productSku={selectedProduct.sku}
          productName={selectedProduct.name}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(StockInformation, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
