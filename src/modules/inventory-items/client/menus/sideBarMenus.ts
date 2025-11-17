import { Package } from 'lucide-react';

export const inventoryItemsSidebarMenus = {
    id: 'inventory-items',
    title: 'Inventory Items',
    url: '/console/modules/inventory-items',
    icon: Package,
    roles: 'ADMIN', 
    permissions: ['inventory-items.view'],
    items: [
      {
        id: "stock-information",
        title: "Stock Information",
        url: "/console/modules/inventory-items/stock-information",
        roles: "ADMIN",
        permissions: "inventory-items.view",
      },
      {
        id: "adjustment",
        title: "Adjustment",
        url: "/console/modules/inventory-items/adjustment",
        roles: "ADMIN",
        permissions: "inventory-items.view",
      },
      {
        id: "relocate",
        title: "Relocate",
        url: "/console/modules/inventory-items/relocate",
        roles: "ADMIN",
        permissions: "inventory-items.view",
      },
      {
        id: "cycle-count",
        title: "Cycle Count / Audit",
        url: "/console/modules/inventory-items/cycle-count",
        roles: "ADMIN",
        permissions: "inventory-items.view",
        items: [
          {
            id: "cycle-count-create",
            title: "Create",
            url: "/console/modules/inventory-items/cycle-count/create",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          },
          {
            id: "cycle-count-approve",
            title: "Approve",
            url: "/console/modules/inventory-items/cycle-count/approve",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          }
        ],
      },
    ],
  };
