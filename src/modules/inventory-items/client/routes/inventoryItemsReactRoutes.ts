import { RouteObject } from 'react-router';
import InventoryItemsList from '../pages/InventoryItemsList';
import InventoryItemsAdd from '../pages/InventoryItemsAdd';
import StockInformation from '../pages/StockInformation';
import Adjustment from '../pages/Adjustment';
import Relocate from '../pages/Relocate';
import CycleCount from '../pages/CycleCount';
import CycleCountDetail from '../pages/CycleCountDetail';
// TODO: Import other pages when created
// import InventoryItemsView from '../pages/InventoryItemsView';
// import InventoryItemsEdit from '../pages/InventoryItemsEdit';

export const inventoryItemsReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: InventoryItemsList },
      { path: 'add', Component: InventoryItemsAdd },
      { path: 'stock-information', Component: StockInformation },
      { path: 'adjustment', Component: Adjustment },
      { path: 'relocate', Component: Relocate },
      { path: 'cycle-count', Component: CycleCount },
      { path: 'cycle-count/:id', Component: CycleCountDetail },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: InventoryItemsView },
      // { path: ':id/edit', Component: InventoryItemsEdit },
    ]
  };
};
