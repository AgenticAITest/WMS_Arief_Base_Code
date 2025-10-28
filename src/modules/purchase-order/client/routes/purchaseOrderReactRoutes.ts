import { RouteObject } from 'react-router';
import PurchaseOrderCreate from '../pages/PurchaseOrderCreate';
import PurchaseOrderApprove from '../pages/PurchaseOrderApprove';
import PurchaseOrderReceive from '../pages/PurchaseOrderReceive';
import PurchaseOrderPutaway from '../pages/PurchaseOrderPutaway';

export const purchaseOrderReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: PurchaseOrderCreate },
      { path: 'create', Component: PurchaseOrderCreate },
      { path: 'approve', Component: PurchaseOrderApprove },
      { path: 'receive', Component: PurchaseOrderReceive },
      { path: 'putaway', Component: PurchaseOrderPutaway },
    ]
  };
};
