import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@client/components/ui/table';
import { Badge } from '@client/components/ui/badge';
import { Check, X, Eye, RefreshCw } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { POApprovalModal } from '../components/POApprovalModal';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PurchaseOrderApprove: React.FC = () => {
  const [pendingPOs, setPendingPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/purchase-order/orders', {
        params: {
          status: 'pending',
          page: 1,
          limit: 100,
        },
      });
      setPendingPOs(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (po: any) => {
    setSelectedPO(po);
    setIsDetailModalOpen(true);
  };

  const handleApprove = async (poId: string) => {
    try {
      const response = await axios.post(`/api/modules/purchase-order/orders/${poId}/approve`);
      if (response.data.success) {
        toast.success('Purchase Order approved successfully');
        fetchPendingApprovals();
        setIsDetailModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error approving PO:', error);
      toast.error(error.response?.data?.message || 'Failed to approve purchase order');
    }
  };

  const handleReject = async (poId: string, reason?: string) => {
    try {
      const response = await axios.post(`/api/modules/purchase-order/orders/${poId}/reject`, {
        reason,
      });
      if (response.data.success) {
        toast.success('Purchase Order rejected');
        fetchPendingApprovals();
        setIsDetailModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error rejecting PO:', error);
      toast.error(error.response?.data?.message || 'Failed to reject purchase order');
    }
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approve Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Review and approve pending purchase orders</p>
        </div>
        <Button onClick={fetchPendingApprovals} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({pendingPOs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingPOs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg">No pending purchase orders awaiting approval.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPOs.map((po) => (
                    <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{po.orderNumber}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{po.warehouseName}</TableCell>
                      <TableCell>{format(new Date(po.orderDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {po.expectedDeliveryDate
                          ? format(new Date(po.expectedDeliveryDate), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Pending Approval</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(po)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPO && (
        <POApprovalModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPO(null);
          }}
          po={selectedPO}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default withModuleAuthorization(PurchaseOrderApprove, 'purchase-order');
