import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Package } from 'lucide-react';

const SalesOrderCreate: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Create Sales Order
          </h1>
          <p className="text-muted-foreground">
            Create new sales orders for customers
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Order Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sales order creation form will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrderCreate;
