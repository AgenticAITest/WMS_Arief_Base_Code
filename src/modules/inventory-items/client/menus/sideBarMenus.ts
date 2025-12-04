import { ClipboardCheck, Package } from 'lucide-react';

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
        id: "movement-history",
        title: "Movement History",
        url: "/console/modules/inventory-items/movement-history",
        roles: "ADMIN",
        permissions: "inventory-items.view",
      },
      {
        id: "adjustments",
        title: "Adjustments",
        url: "/console/modules/inventory-items/adjustment",
        roles: "ADMIN",
        permissions: "inventory-items.view",
        items: [
          {
            id: "adjustment-create",
            title: "Create",
            url: "/console/modules/inventory-items/adjustment/create",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          },
          {
            id: "adjustment-approve",
            title: "Approve",
            url: "/console/modules/inventory-items/adjustment/approve",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          },
          {
            id: "adjustment-history",
            title: "History",
            url: "/console/modules/inventory-items/adjustment/history",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          },
        ],
      },
      {
        id: "relocations",
        title: "Relocations",
        url: "/console/modules/inventory-items/relocate",
        roles: "ADMIN",
        permissions: "inventory-items.view",
        items: [
          {
            id: "relocate-create",
            title: "Create",
            url: "/console/modules/inventory-items/relocate/create",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          },
          {
            id: "relocate-approve",
            title: "Approve",
            url: "/console/modules/inventory-items/relocate/approve",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          },
          {
            id: "relocate-history",
            title: "History",
            url: "/console/modules/inventory-items/relocate/history",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          },
        ],
      },
      {
        id: "cycle-counts",
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
          },
          {
            id: "cycle-count-history",
            title: "History",
            url: "/console/modules/inventory-items/cycle-count/history",
            roles: "ADMIN",
            permissions: "inventory-items.view",
          }
        ],
      },
    ],
  };

export const cycleCountSidebarMenus = {
  id: 'inventory-items',
  moduleId: 'inventory-items',
  title: 'Cycle Count / Audit',
  url: '/console/modules/inventory-items/cycle-count',
  icon: ClipboardCheck,
  roles: 'ADMIN',
  permissions: 'inventory-items.view',
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
    },
    {
      id: "cycle-count-history",
      title: "History",
      url: "/console/modules/inventory-items/cycle-count/history",
      roles: "ADMIN",
      permissions: "inventory-items.view",
    }
  ],
};
