import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Boxes } from 'lucide-react';

const SalesOrderAllocate: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Boxes className="h-8 w-8" />
            Allocate Inventory
          </h1>
          <p className="text-muted-foreground">
            Allocate inventory to sales orders
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allocation Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sales order allocation interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrderAllocate;
