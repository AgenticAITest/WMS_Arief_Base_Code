import { lazy } from 'react';
import { RouteObject } from 'react-router';

const SalesOrderCreate = lazy(() => import('../pages/SalesOrderCreate'));
const SalesOrderAllocate = lazy(() => import('../pages/SalesOrderAllocate'));
const SalesOrderPick = lazy(() => import('../pages/SalesOrderPick'));
const SalesOrderPack = lazy(() => import('../pages/SalesOrderPack'));
const SalesOrderShip = lazy(() => import('../pages/SalesOrderShip'));
const SalesOrderDeliver = lazy(() => import('../pages/SalesOrderDeliver'));

export const salesOrderReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      {
        path: 'create',
        Component: SalesOrderCreate,
      },
      {
        path: 'allocate',
        Component: SalesOrderAllocate,
      },
      {
        path: 'pick',
        Component: SalesOrderPick,
      },
      {
        path: 'pack',
        Component: SalesOrderPack,
      },
      {
        path: 'ship',
        Component: SalesOrderShip,
      },
      {
        path: 'deliver',
        Component: SalesOrderDeliver,
      },
    ],
  };
};
