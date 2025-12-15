import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import InventoryTypeTab from '../components/InventoryTypeTab';
import PackageTypeTab from '../components/PackageTypeTab';
import ProductTab from '../components/ProductTab';
import SupplierTab from '../components/SupplierTab';
import CustomerTab from '../components/CustomerTab';
import NumberTab from '../components/NumberTab';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

const MasterDataManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'product';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Master Data</h1>
        <p className="text-muted-foreground">
          Manage inventory items, types, suppliers and customers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger 
            value="product" 
            className="flex items-center gap-2"
          >
            Product
          </TabsTrigger>
          <TabsTrigger 
            value="inventory-type"
            className="flex items-center gap-2"
          >
            Inventory Type
          </TabsTrigger>
          <TabsTrigger 
            value="package-type"
            className="flex items-center gap-2"
          >
            Package Type
          </TabsTrigger>
          <TabsTrigger 
            value="supplier"
            className="flex items-center gap-2"
          >
            Supplier
          </TabsTrigger>
          <TabsTrigger 
            value="customer"
            className="flex items-center gap-2"
          >
            Customer
          </TabsTrigger>
          {/* <TabsTrigger 
            value="number"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Number
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="product" className="mt-6">
          <ProductTab />
        </TabsContent>

        <TabsContent value="inventory-type" className="mt-6">
          <InventoryTypeTab />
        </TabsContent>

        <TabsContent value="package-type" className="mt-6">
          <PackageTypeTab />
        </TabsContent>

        <TabsContent value="supplier" className="mt-6">
          <SupplierTab />
        </TabsContent>

        <TabsContent value="customer" className="mt-6">
          <CustomerTab />
        </TabsContent>

        <TabsContent value="number" className="mt-6">
          <NumberTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default withModuleAuthorization(MasterDataManagement, {
  moduleId: 'master-data',
  moduleName: 'Master Data'
});
