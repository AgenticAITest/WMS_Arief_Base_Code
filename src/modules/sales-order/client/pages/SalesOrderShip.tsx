import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Truck } from 'lucide-react';

const SalesOrderShip: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Ship Orders
          </h1>
          <p className="text-muted-foreground">
            Manage shipments for sales orders
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sales order shipping interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrderShip;
