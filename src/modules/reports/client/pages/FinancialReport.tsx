import React, { useState, useEffect } from 'react';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  Download,
  Calendar,
  FileSpreadsheet,
  Construction,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FinancialSummary {
  totalRevenue: number;
  orderCount: number;
  grossProfit: number;
  profitMargin: number;
  inventoryValue: number;
  avgOrderValue: number;
  period: {
    year: number | null;
    month: number | null;
    label: string;
  };
}

interface OrderProfitability {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
}

interface OrderProfitabilityResponse {
  success: boolean;
  data: OrderProfitability[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  period: {
    year: number | null;
    month: number | null;
    label: string;
  };
}

const FinancialReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('order-profitability');
  
  const [orderProfitabilityLoading, setOrderProfitabilityLoading] = useState(false);
  const [orderProfitabilityData, setOrderProfitabilityData] = useState<OrderProfitability[]>([]);
  const [orderProfitabilityPagination, setOrderProfitabilityPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const periodOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: `${currentYear}`, label: `${currentYear}` },
    { value: `${currentYear - 1}`, label: `${currentYear - 1}` },
  ];

  for (let i = 0; i < 12; i++) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    periodOptions.push({
      value: `${date.getFullYear()}-${date.getMonth() + 1}`,
      label: format(date, 'MMMM yyyy'),
    });
  }

  useEffect(() => {
    fetchFinancialData();
    fetchOrderProfitability(1);
  }, [periodFilter]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      const params: { year?: number; month?: number } = {};

      if (periodFilter !== 'all') {
        const parts = periodFilter.split('-');
        params.year = parseInt(parts[0]);
        if (parts.length > 1) {
          params.month = parseInt(parts[1]);
        }
      }

      const response = await axios.get('/api/modules/reports/financial/summary', { params });

      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderProfitability = async (page: number) => {
    try {
      setOrderProfitabilityLoading(true);

      const params: { year?: number; month?: number; page: number; limit: number } = {
        page,
        limit: 20,
      };

      if (periodFilter !== 'all') {
        const parts = periodFilter.split('-');
        params.year = parseInt(parts[0]);
        if (parts.length > 1) {
          params.month = parseInt(parts[1]);
        }
      }

      const response = await axios.get<OrderProfitabilityResponse>(
        '/api/modules/reports/financial/order-profitability',
        { params }
      );

      if (response.data.success) {
        setOrderProfitabilityData(response.data.data);
        setOrderProfitabilityPagination(response.data.pagination);
      }
    } catch (error: any) {
      console.error('Error fetching order profitability:', error);
      toast.error('Failed to fetch order profitability data');
    } finally {
      setOrderProfitabilityLoading(false);
    }
  };

  const handleExportData = () => {
    if (!data) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Metric', 'Value', 'Unit'],
      ['Period', `"${data.period.label}"`, ''],
      ['Total Revenue', data.totalRevenue.toString(), 'USD'],
      ['Order Count', data.orderCount.toString(), 'orders'],
      ['Gross Profit', data.grossProfit.toString(), 'USD'],
      ['Profit Margin', data.profitMargin.toFixed(2), '%'],
      ['Inventory Value', data.inventoryValue.toString(), 'USD'],
      ['Average Order Value', data.avgOrderValue.toString(), 'USD'],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Financial report exported successfully');
  };

  const formatCurrency = (value: number): string => {
    if (value < 0) {
      return `-$${Math.abs(value).toLocaleString()}`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">
            Revenue analysis, cost tracking, and profitability insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExportData} disabled={!data || loading}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(data.totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    From {data.orderCount} orders
                  </p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                  <p className={`text-3xl font-bold mt-2 ${data.grossProfit < 0 ? 'text-red-600' : ''}`}>
                    {formatCurrency(data.grossProfit)}
                  </p>
                  <p className={`text-sm mt-1 ${data.profitMargin < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {data.profitMargin.toFixed(1)}% margin
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(data.inventoryValue)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Current stock valuation</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(data.avgOrderValue)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Per sales order</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No financial data available</p>
        </div>
      )}

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="border-b w-full justify-start rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="order-profitability"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Order Profitability
          </TabsTrigger>
          <TabsTrigger 
            value="product-analysis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Product Analysis
          </TabsTrigger>
          <TabsTrigger 
            value="inventory-valuation"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Inventory Valuation
          </TabsTrigger>
          <TabsTrigger 
            value="supplier-analysis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Supplier Analysis
          </TabsTrigger>
          <TabsTrigger 
            value="customer-analysis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Customer Revenue Analysis
          </TabsTrigger>
        </TabsList>

        {/* Order Profitability Tab */}
        <TabsContent value="order-profitability" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Order-Level Profitability Analysis</h2>
              </div>

              {orderProfitabilityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : orderProfitabilityData.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">COGS</TableHead>
                        <TableHead className="text-right">Gross Profit</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderProfitabilityData.map((order) => (
                        <TableRow key={order.orderId}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.cogs)}</TableCell>
                          <TableCell className={`text-right ${order.grossProfit < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(order.grossProfit)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                order.marginPercent < 0
                                  ? 'bg-red-100 text-red-700'
                                  : order.marginPercent < 20
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {order.marginPercent.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {orderProfitabilityPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {((orderProfitabilityPagination.page - 1) * orderProfitabilityPagination.limit) + 1} to{' '}
                        {Math.min(
                          orderProfitabilityPagination.page * orderProfitabilityPagination.limit,
                          orderProfitabilityPagination.total
                        )}{' '}
                        of {orderProfitabilityPagination.total} orders
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchOrderProfitability(orderProfitabilityPagination.page - 1)}
                          disabled={!orderProfitabilityPagination.hasPrev || orderProfitabilityLoading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {orderProfitabilityPagination.page} of {orderProfitabilityPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchOrderProfitability(orderProfitabilityPagination.page + 1)}
                          disabled={!orderProfitabilityPagination.hasNext || orderProfitabilityLoading}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No order profitability data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Under Construction Tabs */}
        <TabsContent value="product-analysis" className="mt-4">
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Construction className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Product Analysis</h3>
                <p className="text-muted-foreground">
                  This feature is under construction. Check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory-valuation" className="mt-4">
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Construction className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Inventory Valuation</h3>
                <p className="text-muted-foreground">
                  This feature is under construction. Check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier-analysis" className="mt-4">
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Construction className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Supplier Cost Analysis</h3>
                <p className="text-muted-foreground">
                  This feature is under construction. Check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer-analysis" className="mt-4">
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Construction className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Customer Revenue Analysis</h3>
                <p className="text-muted-foreground">
                  This feature is under construction. Check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReport;
