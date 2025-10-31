import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { ClipboardList } from 'lucide-react';

const SalesOrderPick: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Pick Orders
          </h1>
          <p className="text-muted-foreground">
            Pick items for sales orders
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Picking Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sales order picking interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrderPick;
