import React, { useEffect, useState } from 'react';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Search, X, Eye, Download, Calendar } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DataPagination from '@client/components/console/DataPagination';
import { useNavigate } from 'react-router';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { DebouncedInput } from '@client/components/DebouncedInput';

interface MovementRecord {
  id: string;
  productSku: string;
  productName: string;
  locationPath: string;
  quantityChanged: number;
  movementType: string;
  referenceNumber: string;
  userName: string;
  notes: string;
  createdAt: string;
}

const MovementHistory: React.FC = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);

  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [perPage, setPerPage] = useState(Number(params.get('perPage')) || 10);

  // Filters
  const [search, setSearch] = useState(params.get('search') || '');
  const [movementType, setMovementType] = useState(params.get('movementType') || 'all');
  const [dateFrom, setDateFrom] = useState(params.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(params.get('dateTo') || '');
  const [activeQuickFilter, setActiveQuickFilter] = useState<number | null>(null);

  // Track previous filter values to detect changes
  const [prevSearch, setPrevSearch] = useState(params.get('search') || '');
  const [prevMovementType, setPrevMovementType] = useState(params.get('movementType') || 'all');
  const [prevDateFrom, setPrevDateFrom] = useState(params.get('dateFrom') || '');
  const [prevDateTo, setPrevDateTo] = useState(params.get('dateTo') || '');

  // Details modal
  const [selectedRecord, setSelectedRecord] = useState<MovementRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function gotoPage(p: number) {
    if (p < 1 || (count !== 0 && p > Math.ceil(count / perPage))) return;

    const urlParams = new URLSearchParams(window.location.search);
    setPage(p);
    urlParams.set('page', p.toString());
    urlParams.set('perPage', perPage.toString());
    if (search) urlParams.set('search', search);
    if (movementType && movementType !== 'all') urlParams.set('movementType', movementType);
    if (dateFrom) urlParams.set('dateFrom', dateFrom);
    if (dateTo) urlParams.set('dateTo', dateTo);

    navigate(`${window.location.pathname}?${urlParams.toString()}`);
    setLoading(true);
  }

  useEffect(() => {
    // Check if any filter changed
    const filterChanged = 
      search !== prevSearch || 
      movementType !== prevMovementType || 
      dateFrom !== prevDateFrom || 
      dateTo !== prevDateTo;

    // Reset to page 1 when filters change (but don't fetch yet)
    if (filterChanged && page !== 1) {
      setPrevSearch(search);
      setPrevMovementType(movementType);
      setPrevDateFrom(dateFrom);
      setPrevDateTo(dateTo);
      setPage(1);
      return; // Skip fetching, let the page change trigger the fetch
    }

    // Update previous filter values if they changed
    if (filterChanged) {
      setPrevSearch(search);
      setPrevMovementType(movementType);
      setPrevDateFrom(dateFrom);
      setPrevDateTo(dateTo);
    }

    // Fetch movement history for current page/filter combination
    const fetchMovementHistory = async () => {
      try {
        setLoading(true);

        const apiParams: any = {
          page,
          perPage,
        };

        if (search) apiParams.search = search;
        if (movementType && movementType !== 'all') apiParams.movementType = movementType;
        if (dateFrom) apiParams.dateFrom = dateFrom;
        if (dateTo) apiParams.dateTo = dateTo;

        const response = await axios.get('/api/modules/inventory-items/movement-history', { 
          params: apiParams 
        });

        if (response.data.success) {
          setMovements(response.data.data || []);
          setCount(response.data.pagination?.total || 0);
        }
      } catch (error: any) {
        console.error('Error fetching movement history:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch movement history');
      } finally {
        setLoading(false);
      }
    };

    fetchMovementHistory();
  }, [page, perPage, search, movementType, dateFrom, dateTo]);

  const handleSearch = () => {
    gotoPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setMovementType('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setActiveQuickFilter(null);
  };

  const handleQuickFilter = (days: number) => {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);

    setDateFrom(format(fromDate, 'yyyy-MM-dd'));
    setDateTo(format(today, 'yyyy-MM-dd'));
    setPage(1);
    setActiveQuickFilter(days);
  };

  // Reset quick filter when manual date changes
  useEffect(() => {
    if (activeQuickFilter !== null) {
      const today = new Date();
      const expectedFrom = new Date();
      expectedFrom.setDate(today.getDate() - activeQuickFilter);
      const expectedFromStr = format(expectedFrom, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      if (dateFrom !== expectedFromStr || dateTo !== todayStr) {
        setActiveQuickFilter(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const handleExportCSV = async () => {
    try {
      const apiParams: any = {
        page: 1,
        perPage: 10000,
      };

      if (search) apiParams.search = search;
      if (movementType && movementType !== 'all') apiParams.movementType = movementType;
      if (dateFrom) apiParams.dateFrom = dateFrom;
      if (dateTo) apiParams.dateTo = dateTo;

      const response = await axios.get('/api/modules/inventory-items/movement-history/export/csv', { 
        params: apiParams,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `movement-history-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast.success('Movement history exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch movement history');
    }
  };

  const handleViewDetails = (record: MovementRecord) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Movement History</h1>
          <p className="text-muted-foreground">
            Track all inventory movements and adjustments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Filters</h2>

        {/* Quick Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={activeQuickFilter === 0 ? "default" : "outline"}
            size="sm" onClick={() => handleQuickFilter(0)}>
            <Calendar className="mr-2 h-4 w-4" />
            Today
          </Button>
          <Button 
            variant={activeQuickFilter === 7 ? "default" : "outline"}
            size="sm" onClick={() => handleQuickFilter(7)}>
            Last 7 Days
          </Button>
          <Button 
            variant={activeQuickFilter === 30 ? "default" : "outline"}
            size="sm" onClick={() => handleQuickFilter(30)}>
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Movement Type</Label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="putaway">Putaway</SelectItem>
                <SelectItem value="pick">Pick</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="relocation">Relocation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              {/* <Input
                placeholder="Search SKU or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              /> */}
              <DebouncedInput
                value={search}
                onChange={(value) => setSearch(String(value))}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search SKU or product..."
                debounce={500}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* <div className="flex justify-end">
          <Button onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div> */}
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/20">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Movement Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No movement history found.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{record.productSku}</div>
                      <div className="text-muted-foreground truncate max-w-[200px]">
                        {record.productName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate text-sm" title={record.locationPath}>
                      {record.locationPath}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {record.movementType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={record.quantityChanged > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {record.quantityChanged > 0 ? '+' : ''}{record.quantityChanged}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{record.referenceNumber || 'N/A'}</TableCell>
                  <TableCell className="text-sm">{record.userName || 'System'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(record)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4">
        <DataPagination
          count={count}
          perPage={perPage}
          page={page}
          gotoPage={gotoPage}
        />
      </div>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Movement Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date & Time</Label>
                  <p className="font-mono">
                    {format(new Date(selectedRecord.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Movement Type</Label>
                  <p className="font-medium">{selectedRecord.movementType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">SKU</Label>
                  <p className="font-mono">{selectedRecord.productSku}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Product Name</Label>
                  <p>{selectedRecord.productName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="text-sm">{selectedRecord.locationPath}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Quantity Changed</Label>
                  <p className={selectedRecord.quantityChanged > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {selectedRecord.quantityChanged > 0 ? '+' : ''}{selectedRecord.quantityChanged}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reference Number</Label>
                  <p>{selectedRecord.referenceNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p>{selectedRecord.userName || 'System'}</p>
                </div>
              </div>
              {selectedRecord.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm bg-muted p-2 rounded">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default withModuleAuthorization(MovementHistory, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
