import { RouteObject } from 'react-router';
import InventoryItemsList from '../pages/InventoryItemsList';
import InventoryItemsAdd from '../pages/InventoryItemsAdd';
import StockInformation from '../pages/StockInformation';
import Adjustment from '../pages/Adjustment';
import Relocate from '../pages/Relocate';
import CycleCountCreate from '../pages/CycleCountCreate';

export const inventoryItemsReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: InventoryItemsList },
      { path: 'add', Component: InventoryItemsAdd },
      { path: 'stock-information', Component: StockInformation },
      { path: 'adjustment', Component: Adjustment },
      { path: 'relocate', Component: Relocate },
      { 
        path: 'cycle-count', 
        children: [
          { index: true, Component: CycleCountCreate },
          { path: 'create', Component: CycleCountCreate },
        ]
      },
    ]
  };
};
