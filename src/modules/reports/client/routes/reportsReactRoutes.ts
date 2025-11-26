import { RouteObject } from 'react-router';

import ReportsList from '../pages/ReportsList';
import ReportsAdd from '../pages/ReportsAdd';
// TODO: Import other pages when created
// import ReportsView from '../pages/ReportsView';
// import ReportsEdit from '../pages/ReportsEdit';

import AuditLog from '../pages/AuditLog';
import FinancialReport from '../pages/FinancialReport';


export const reportsReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [

//      { index: true, Component: ReportsList },
//      { path: 'add', Component: ReportsAdd },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: ReportsView },
      // { path: ':id/edit', Component: ReportsEdit },

      { path: 'audit-log', Component: AuditLog },
      { path: 'financial-report', Component: FinancialReport },

    ]
  };
};
