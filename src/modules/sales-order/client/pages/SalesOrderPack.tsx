import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { PackageOpen } from 'lucide-react';

const SalesOrderPack: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PackageOpen className="h-8 w-8" />
            Pack Orders
          </h1>
          <p className="text-muted-foreground">
            Pack items for shipment
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Packing Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sales order packing interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrderPack;
