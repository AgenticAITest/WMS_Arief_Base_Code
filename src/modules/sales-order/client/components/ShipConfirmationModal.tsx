import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/components/ui/dialog';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { toast } from 'sonner';
import { Ship, Package, MapPin, Truck, Calendar, DollarSign, Hash } from 'lucide-react';

interface PackageItem {
  id: string;
  productId: string;
  salesOrderItemId: string;
  quantity: number;
  productName: string;
  sku: string;
}

interface Package {
  id: string;
  packageId: string;
  packageNumber: string;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  barcode: string | null;
  items: PackageItem[];
}

interface CustomerLocation {
  id: string;
  locationType: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
}

interface Transporter {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
}

interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  type: string;
  estimatedDays: number | null;
}

interface ShipConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesOrderId: string;
  onSuccess: (data: { shipNumber: string; documentPath: string }) => void;
}

const ShipConfirmationModal: React.FC<ShipConfirmationModalProps> = ({
  isOpen,
  onClose,
  salesOrderId,
  onSuccess,
}) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [transporterId, setTransporterId] = useState('');
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingDate, setShippingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [notes, setNotes] = useState('');
  const [packageLocations, setPackageLocations] = useState<{ [packageId: string]: string }>(
    {}
  );

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, salesOrderId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Fetch packages
      const packagesRes = await axios.get(
        `/api/modules/sales-order/ships/${salesOrderId}/packages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch customer locations
      const locationsRes = await axios.get(
        `/api/modules/sales-order/ships/${salesOrderId}/customer-locations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch transporters
      const transportersRes = await axios.get('/api/modules/master-data/transporters', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch shipping methods
      const methodsRes = await axios.get('/api/modules/sales-order/shipping-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (packagesRes.data.success) {
        setPackages(packagesRes.data.data);
      }

      if (locationsRes.data.success) {
        setCustomerLocations(locationsRes.data.data);
      }

      if (transportersRes.data.success) {
        setTransporters(transportersRes.data.data);
      }

      if (methodsRes.data) {
        // Handle both { success, data } and array response formats
        const methodsData = methodsRes.data.success 
          ? methodsRes.data.data 
          : (Array.isArray(methodsRes.data) ? methodsRes.data : []);
        setShippingMethods(methodsData);
      }
    } catch (error: any) {
      console.error('Error fetching ship data:', error);
      toast.error('Failed to load shipping data');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (packageId: string, locationId: string) => {
    setPackageLocations((prev) => ({
      ...prev,
      [packageId]: locationId,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!transporterId) {
      toast.error('Please select a transporter');
      return;
    }

    // Check if all packages have location assignments
    const unassignedPackages = packages.filter((pkg) => !packageLocations[pkg.id]);
    if (unassignedPackages.length > 0) {
      toast.error(
        `Please assign delivery locations to all packages (${unassignedPackages.length} unassigned)`
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      // Prepare package locations array
      const packageLocationsArray = packages.map((pkg) => ({
        packageId: pkg.id,
        locationId: packageLocations[pkg.id],
      }));

      const response = await axios.post(
        `/api/modules/sales-order/ships/${salesOrderId}/confirm`,
        {
          transporterId,
          shippingMethodId: shippingMethodId || null,
          trackingNumber: trackingNumber || null,
          shippingDate,
          estimatedDeliveryDate: estimatedDeliveryDate || null,
          totalCost: totalCost ? parseFloat(totalCost) : null,
          notes,
          packageLocations: packageLocationsArray,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Sales order shipped successfully!');
        onSuccess({
          shipNumber: response.data.data.shipNumber,
          documentPath: response.data.data.documentPath,
        });
      } else {
        toast.error(response.data.message || 'Failed to ship sales order');
      }
    } catch (error: any) {
      console.error('Error shipping sales order:', error);
      toast.error(error.response?.data?.message || 'Failed to ship sales order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Ship className="h-6 w-6 text-red-600" />
            Confirm Shipment
          </DialogTitle>
          <DialogDescription>
            Select delivery locations for each package and provide shipping details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="text-lg font-medium">Loading shipment data...</div>
            <div className="text-sm text-muted-foreground">Please wait</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Packages with Location Assignment */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Packages & Delivery Locations
              </h3>

              <div className="space-y-4">
                {packages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-lg">Package {index + 1}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {pkg.packageNumber}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.weight ? `${pkg.weight} kg` : 'Weight not specified'}
                      </div>
                    </div>

                    {/* Package Details */}
                    <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
                      <div>
                        <span className="font-medium">Dimensions:</span>{' '}
                        {pkg.length && pkg.width && pkg.height
                          ? `${pkg.length} × ${pkg.width} × ${pkg.height} cm`
                          : 'N/A'}
                      </div>
                      {pkg.barcode && (
                        <div>
                          <span className="font-medium">Barcode:</span> {pkg.barcode}
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="font-medium">Items:</span> {pkg.items.length}{' '}
                        item(s)
                      </div>
                    </div>

                    {/* Package Items Table */}
                    <div className="mb-3 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">SKU</th>
                            <th className="px-3 py-2 text-left">Product</th>
                            <th className="px-3 py-2 text-right">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {pkg.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 font-mono">{item.sku}</td>
                              <td className="px-3 py-2">{item.productName}</td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Location Assignment */}
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4" />
                        Delivery Location *
                      </Label>
                      <Select
                        value={packageLocations[pkg.id] || ''}
                        onValueChange={(value) => handleLocationChange(pkg.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select delivery location" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerLocations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {loc.locationType} - {loc.city}, {loc.state}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {loc.address} {loc.postalCode && `• ${loc.postalCode}`}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!packageLocations[pkg.id] && (
                        <p className="text-xs text-red-600 mt-1">
                          Location assignment required
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Transporter */}
                <div>
                  <Label htmlFor="transporter" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Transporter *
                  </Label>
                  <Select value={transporterId} onValueChange={setTransporterId}>
                    <SelectTrigger id="transporter">
                      <SelectValue placeholder="Select transporter" />
                    </SelectTrigger>
                    <SelectContent>
                      {transporters.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex flex-col">
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.code}
                              {t.phone && ` • ${t.phone}`}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!transporterId && (
                    <p className="text-xs text-red-600 mt-1">Transporter required</p>
                  )}
                </div>

                {/* Shipping Method */}
                <div>
                  <Label htmlFor="shippingMethod">Shipping Method</Label>
                  <Select value={shippingMethodId} onValueChange={setShippingMethodId}>
                    <SelectTrigger id="shippingMethod">
                      <SelectValue placeholder="Select shipping method (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex flex-col">
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.type}
                              {m.estimatedDays && ` • ${m.estimatedDays} days`}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tracking Number */}
                <div>
                  <Label htmlFor="trackingNumber" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Tracking Number
                  </Label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>

                {/* Shipping Date */}
                <div>
                  <Label htmlFor="shippingDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Shipping Date *
                  </Label>
                  <Input
                    id="shippingDate"
                    type="date"
                    value={shippingDate}
                    onChange={(e) => setShippingDate(e.target.value)}
                  />
                </div>

                {/* Estimated Delivery Date */}
                <div>
                  <Label htmlFor="estimatedDeliveryDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Estimated Delivery Date
                  </Label>
                  <Input
                    id="estimatedDeliveryDate"
                    type="date"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  />
                </div>

                {/* Total Cost */}
                <div>
                  <Label htmlFor="totalCost" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Shipping Cost
                  </Label>
                  <Input
                    id="totalCost"
                    type="number"
                    step="0.01"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <Label htmlFor="notes">Special Instructions / Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any special shipping instructions or notes..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting || !transporterId}
            className="bg-red-600 hover:bg-red-700"
          >
            {submitting ? (
              <>
                <Ship className="mr-2 h-4 w-4 animate-pulse" />
                Processing Shipment...
              </>
            ) : (
              <>
                <Ship className="mr-2 h-4 w-4" />
                Confirm Shipping & Generate Instructions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShipConfirmationModal;
