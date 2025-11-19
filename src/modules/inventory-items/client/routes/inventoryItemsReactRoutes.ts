import { RouteObject, redirect } from 'react-router';
import InventoryItemsList from '../pages/InventoryItemsList';
import InventoryItemsAdd from '../pages/InventoryItemsAdd';
import StockInformation from '../pages/StockInformation';
import { AdjustmentCreate } from '../pages/AdjustmentCreate';
import Relocate from '../pages/Relocate';
import CycleCountCreate from '../pages/CycleCountCreate';
import CycleCountApprove from '../pages/CycleCountApprove';
import CycleCountHistory from '../pages/CycleCountHistory';

export const inventoryItemsReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: InventoryItemsList },
      { path: 'add', Component: InventoryItemsAdd },
      { path: 'stock-information', Component: StockInformation },
      { path: 'adjustment', 
       children: [
         { 
           index: true, 
           loader: async () => redirect(`${basePath}/adjustment/create`)
         },
         { path: 'create', Component: AdjustmentCreate },
       ]},
      { path: 'relocate', Component: Relocate },
      { 
        path: 'cycle-count', 
        children: [
          { 
            index: true, 
            loader: async () => redirect(`${basePath}/cycle-count/create`)
          },
          { path: 'create', Component: CycleCountCreate },
          { path: 'approve', Component: CycleCountApprove },
          { path: 'history', Component: CycleCountHistory },
        ]
      },
    ]
  };
};
