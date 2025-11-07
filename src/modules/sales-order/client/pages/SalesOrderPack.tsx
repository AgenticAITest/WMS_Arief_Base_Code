import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { toast } from 'sonner';
import { PackageOpen, RefreshCw, Plus, FileText } from 'lucide-react';
import { DocumentViewerModal } from '@client/components/DocumentViewerModal';
import PackageCreationModal from '../components/PackageCreationModal';
import { PackPrintView } from '../components/PackPrintView';

interface SOItem {
  id: string;
  lineNumber: number;
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: string;
  allocatedQuantity: string;
  pickedQuantity: string;
  unitPrice: string;
  totalPrice: string;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  requestedDeliveryDate: string | null;
  totalAmount: string;
  notes: string | null;
  status: string;
  workflowState: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  documentPath: string | null;
  items: SOItem[];
}

interface Package {
  id?: string;
  packageId: string;
  packageNumber: string;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  items: Array<{
    productId: string;
    salesOrderItemId: string;
    quantity: number;
    productName: string;
    sku: string;
  }>;
}

const SalesOrderPack: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDocumentPath, setViewDocumentPath] = useState<string | null>(null);
  const [viewDocumentNumber, setViewDocumentNumber] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [packages, setPackages] = useState<{ [orderId: string]: Package[] }>({});
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [packData, setPackData] = useState<{ packNumber: string; documentPath: string } | null>(null);

  useEffect(() => {
    fetchPackableSalesOrders();
  }, []);

  const fetchPackableSalesOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/modules/sales-order/packs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSalesOrders(response.data.data);
        
        // Fetch packages for each order
        const packagesData: { [orderId: string]: Package[] } = {};
        for (const order of response.data.data) {
          const pkgResponse = await axios.get(`/api/modules/sales-order/packs/${order.id}/packages`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (pkgResponse.data.success) {
            packagesData[order.id] = pkgResponse.data.data || [];
          }
        }
        setPackages(packagesData);
      } else {
        toast.error(response.data.message || 'Failed to fetch packable orders');
      }
    } catch (error: any) {
      console.error('Error fetching packable orders:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch packable orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePackagesSaved = (orderId: string, updatedPackages: Package[]) => {
    setPackages(prev => ({
      ...prev,
      [orderId]: updatedPackages,
    }));
    setSelectedOrderId(null);
    toast.success('Packages saved successfully');
  };

  const handleConfirmPack = async (orderId: string) => {
    const orderPackages = packages[orderId] || [];
    
    if (orderPackages.length === 0) {
      toast.error('Please create at least one package before confirming');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/modules/sales-order/packs/${orderId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Sales order packed successfully');
        
        // Open print view modal
        setPackData({
          packNumber: response.data.data.packNumber,
          documentPath: response.data.data.documentPath,
        });
        setIsPrintViewOpen(true);
        
        // Refresh the list
        await fetchPackableSalesOrders();
      } else {
        toast.error(response.data.message || 'Failed to confirm pack');
      }
    } catch (error: any) {
      console.error('Error confirming pack:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm pack');
    }
  };

  const handlePrintViewClose = () => {
    setIsPrintViewOpen(false);
    setPackData(null);
  };

  const getPackageCountColor = (count: number) => {
    if (count === 0) return 'text-red-500';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PackageOpen className="h-8 w-8" />
            Pack Orders
          </h1>
          <p className="text-muted-foreground">
            Create packages for picked sales orders
          </p>
        </div>
        <Button
          onClick={fetchPackableSalesOrders}
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading packable sales orders...</p>
            </div>
          </CardContent>
        </Card>
      ) : salesOrders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No Sales Orders Ready for Packing</p>
              <p className="text-muted-foreground mt-2">
                Sales orders with status 'picked' and workflow state 'pack' will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {salesOrders.map((order) => {
            const orderPackages = packages[order.id] || [];
            const packageCount = orderPackages.length;

            return (
              <Card key={order.id} className="border-2">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold">
                        {order.orderNumber}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                        <div>
                          <span className="font-medium">Customer:</span>{' '}
                          {order.customerName}
                        </div>
                        <div>
                          <span className="font-medium">Order Date:</span>{' '}
                          {new Date(order.orderDate).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Total Amount:</span>{' '}
                          ${parseFloat(order.totalAmount).toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Packages:</span>{' '}
                          <span className={getPackageCountColor(packageCount)}>
                            {packageCount} package{packageCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedOrderId(order.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Manage Packages
                      </Button>
                      <Button
                        onClick={() => handleConfirmPack(order.id)}
                        disabled={packageCount === 0}
                        size="sm"
                      >
                        <PackageOpen className="h-4 w-4 mr-2" />
                        Confirm Pack
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Order Items</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left">Line</th>
                              <th className="px-4 py-2 text-left">SKU</th>
                              <th className="px-4 py-2 text-left">Product Name</th>
                              <th className="px-4 py-2 text-right">Picked Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr key={item.id} className="border-t">
                                <td className="px-4 py-2">{item.lineNumber}</td>
                                <td className="px-4 py-2 font-medium">{item.sku}</td>
                                <td className="px-4 py-2">{item.productName}</td>
                                <td className="px-4 py-2 text-right">
                                  {parseFloat(item.pickedQuantity).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {packageCount > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Packages</h3>
                        <div className="grid gap-3">
                          {orderPackages.map((pkg, index) => (
                            <div key={pkg.id} className="border rounded-md p-3 bg-muted/50">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">
                                  Package {index + 1}: {pkg.packageNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {pkg.length && pkg.width && pkg.height
                                    ? `${pkg.length}×${pkg.width}×${pkg.height} cm`
                                    : 'No dimensions'}
                                  {pkg.weight && `, ${pkg.weight} kg`}
                                </div>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">Items:</span>{' '}
                                {pkg.items.length} item{pkg.items.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedOrderId && (
        <PackageCreationModal
          isOpen={true}
          onClose={() => setSelectedOrderId(null)}
          salesOrder={salesOrders.find(so => so.id === selectedOrderId)!}
          existingPackages={packages[selectedOrderId] || []}
          onSave={(updatedPackages) => handlePackagesSaved(selectedOrderId, updatedPackages)}
        />
      )}

      {viewDocumentPath && (
        <DocumentViewerModal
          isOpen={true}
          onClose={() => {
            setViewDocumentPath(null);
            setViewDocumentNumber(null);
          }}
          documentPath={viewDocumentPath}
          documentNumber={viewDocumentNumber || ''}
        />
      )}

      {isPrintViewOpen && packData && (
        <PackPrintView
          isOpen={isPrintViewOpen}
          onClose={handlePrintViewClose}
          packNumber={packData.packNumber}
          documentPath={packData.documentPath}
        />
      )}
    </div>
  );
};

export default SalesOrderPack;
