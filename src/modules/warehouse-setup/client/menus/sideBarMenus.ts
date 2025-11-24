import { Puzzle } from 'lucide-react';

export const warehouseSetupSidebarMenus = {
    id: 'warehouse-setup',
    title: 'Warehouse Setup',
    url: '/console/modules/warehouse-setup',
    icon: Puzzle, // TODO: Change to appropriate icon
    roles: 'ADMIN', 
    permissions: ['warehouse-setup.view'],
    items: [
      {
        id: "warehouse-setup-management",
        title: "Warehouse setup",
        url: "/console/modules/warehouse-setup/management",
        roles: "ADMIN",
        permissions: "warehouse-setup.view",
      },
      // {
      //   id: "warehouse-setup-list",
      //   title: "Warehouse Setup List",
      //   url: "/console/modules/warehouse-setup",
      //   roles: "ADMIN",
      //   permissions: "warehouse-setup.view",
      // },
    ],
  };
