import { RouteObject } from 'react-router';
import DocumentNumberConfigPage from '../pages/DocumentNumberConfigPage';

export const documentNumberingReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: DocumentNumberConfigPage },
    ],
  };
};
