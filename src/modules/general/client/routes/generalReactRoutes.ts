import { RouteObject } from 'react-router';
import GeneralList from '../pages/GeneralList';
import GeneralAdd from '../pages/GeneralAdd';
// TODO: Import other pages when created
// import GeneralView from '../pages/GeneralView';
// import GeneralEdit from '../pages/GeneralEdit';

export const generalReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: GeneralList },
      { path: 'add', Component: GeneralAdd },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: GeneralView },
      // { path: ':id/edit', Component: GeneralEdit },
    ]
  };
};
