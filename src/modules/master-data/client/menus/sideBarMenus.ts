import { Puzzle, Database, Truck } from 'lucide-react';

export const masterDataSidebarMenus = {
    id: 'master-data',
    title: 'Master Data',
    url: '/console/modules/master-data',
    icon: Database,
    roles: 'ADMIN', 
    permissions: ['master-data.view'],
    items: [
      {
        id: "master-data-management",
        title: "Master Data Management",
        url: "/console/modules/master-data/management",
        roles: "ADMIN",
        permissions: "master-data.view",
      },
      {
        id: "transporter-management",
        title: "Transporter",
        url: "/console/modules/master-data/transporters",
        roles: "ADMIN",
        permissions: "master-data.view",
      },
      {
        id: "master-data-list",
        title: "Master Data List",
        url: "/console/modules/master-data",
        roles: "ADMIN",
        permissions: "master-data.view",
      },
    ],
  };
