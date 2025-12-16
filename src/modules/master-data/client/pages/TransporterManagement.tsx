import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import TransporterTab from '../components/TransporterTab';
import ShippingMethodTab from '../components/ShippingMethodTab';
import { Package, Truck } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

const TransporterManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transporter Management</h1>
        <p className="text-muted-foreground">
          Manage transporters and shipping methods for logistics operations
        </p>
      </div>

      <Tabs defaultValue="transporters" className="w-full">
        <TabsList className="grid w-full grid-cols-2 flex items-center justify-start flex-wrap h-auto space-y-1">
          <TabsTrigger value="transporters" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Transporters
          </TabsTrigger>
          <TabsTrigger value="shipping-methods" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Shipping Methods
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transporters" className="mt-6">
          <TransporterTab />
        </TabsContent>

        <TabsContent value="shipping-methods" className="mt-6">
          <ShippingMethodTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withModuleAuthorization(TransporterManagement, {
  moduleId: 'master-data',
  moduleName: 'Master Data'
});