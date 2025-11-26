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
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  Download,
  Calendar,
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

const FinancialReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [periodFilter, setPeriodFilter] = useState('all');

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
    </div>
  );
};

export default FinancialReport;
