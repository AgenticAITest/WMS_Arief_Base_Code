import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Eye, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { ViewMovementModal } from '../components/ViewMovementModal';

interface MovementHistory {
  id: string;
  productSku: string;
  productName: string;
  binName: string;
  quantityChanged: number;
  movementType: string;
  referenceType: string;
  referenceNumber: string;
  notes: string | null;
  createdAt: string;
  userName: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const MovementHistory: React.FC = () => {
  const [movements, setMovements] = useState<MovementHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMovements();
  }, [pagination.page, search, movementType, startDate, endDate]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (search) params.search = search;
      if (movementType && movementType !== 'all') params.movementType = movementType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get('/api/modules/inventory-items/movement-history', {
        params,
      });

      if (response.data.success) {
        setMovements(response.data.data || []);
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      console.error('Error fetching movement history:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch movement history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMovement = (id: string) => {
    setSelectedMovementId(id);
    setViewModalOpen(true);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params: any = {};
      if (search) params.search = search;
      if (movementType && movementType !== 'all') params.movementType = movementType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get('/api/modules/inventory-items/movement-history/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `movement-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Export completed successfully');
    } catch (error: any) {
      console.error('Error exporting movement history:', error);
      toast.error(error.response?.data?.message || 'Failed to export movement history');
    } finally {
      setExporting(false);
    }
  };

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      putaway: { variant: 'default', label: 'Putaway' },
      pick: { variant: 'secondary', label: 'Pick' },
      adjustment: { variant: 'outline', label: 'Adjustment' },
      relocation: { variant: 'default', label: 'Relocation' },
    };

    const config = variants[type] || { variant: 'secondary', label: type };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleMovementTypeChange = (value: string) => {
    setMovementType(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movement History</h1>
          <p className="text-muted-foreground">
            Track all inventory movements across your warehouse
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={exporting || movements.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Input
            placeholder="Search SKU or product name..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div>
          <Select value={movementType} onValueChange={handleMovementTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Movement Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="putaway">Putaway</SelectItem>
              <SelectItem value="pick">Pick</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
              <SelectItem value="relocation">Relocation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>
        <div>
          <Input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : movements.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No movement history found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">{movement.productSku}</TableCell>
                    <TableCell>{movement.productName}</TableCell>
                    <TableCell>{movement.binName}</TableCell>
                    <TableCell className="text-right">
                      <span className={movement.quantityChanged >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {movement.quantityChanged >= 0 ? '+' : ''}{movement.quantityChanged}
                      </span>
                    </TableCell>
                    <TableCell>{getMovementTypeBadge(movement.movementType)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{movement.referenceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {movement.referenceType.toUpperCase()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {movement.createdAt
                        ? format(new Date(movement.createdAt), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{movement.userName}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMovement(movement.id)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {movements.length} of {pagination.total} movements (Page {pagination.page} of {pagination.totalPages})
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={!pagination.hasPrev}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={!pagination.hasNext}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedMovementId && (
        <ViewMovementModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          movementId={selectedMovementId}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(MovementHistory, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items',
});
