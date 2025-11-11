import { RouteObject } from 'react-router';
import MasterDataList from '../pages/MasterDataList';
import MasterDataAdd from '../pages/MasterDataAdd';
import MasterDataManagement from '../pages/MasterDataManagement';
import TransporterManagement from '../pages/TransporterManagement';
// TODO: Import other pages when created
// import MasterDataView from '../pages/MasterDataView';
// import MasterDataEdit from '../pages/MasterDataEdit';

export const masterDataReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: MasterDataList },
      { path: 'add', Component: MasterDataAdd },
      { path: 'management', Component: MasterDataManagement },
      { path: 'transporters', Component: TransporterManagement },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: MasterDataView },
      // { path: ':id/edit', Component: MasterDataEdit },
    ]
  };
};
