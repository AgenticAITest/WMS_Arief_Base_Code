import { ShoppingCart, Package, Boxes, ClipboardList, PackageOpen, Truck, CheckCircle, type LucideIcon } from 'lucide-react';

export const stepIconMap: Record<string, LucideIcon> = {
  create: Package,
  allocate: Boxes,
  pick: ClipboardList,
  pack: PackageOpen,
  ship: Truck,
  deliver: CheckCircle,
};

export const createSalesOrderSidebarMenus = (workflowSteps: any[]) => {
  // Filter out 'complete' step as it's always the last step and doesn't need to be displayed
  const filteredSteps = workflowSteps.filter(step => step.stepKey !== 'complete');
  
  return {
    id: "sales-order",
    title: "Sales Order",
    url: "/console/modules/sales-order",
    icon: ShoppingCart,
    permissions: "sales-order.view",
    items: filteredSteps.map((step) => ({
      id: step.stepKey,
      title: step.stepName,
      url: `/console/modules/sales-order/${step.stepKey}`,
      icon: stepIconMap[step.stepKey],
      permissions: "sales-order.view",
    })),
  };
};

export const salesOrderSidebarMenus = {
  id: "sales-order",
  title: "Sales Order",
  url: "/console/modules/sales-order",
  icon: ShoppingCart,
  roles: "ADMIN",
  permissions: ["sales-order.create", "sales-order.allocate", "sales-order.pick", "sales-order.pack", "sales-order.ship", "sales-order.deliver"],
  items: [
    
    {
      id: "sales-order-create",
      title: "Create",
      url: "/console/modules/sales-order/create",
      roles: "ADMIN",
      permissions: "sales-order.create",
    },
    {
      id: "sales-order-allocate",
      title: "Allocate",
      url: "/console/modules/sales-order/allocate",
      roles: "ADMIN",
      permissions: "sales-order.allocate",
    },
    {
      id: "sales-order-pick",
      title: "Pick",
      url: "/console/modules/sales-order/pick",
      roles: "ADMIN",
      permissions: "sales-order.pick",
    },
    {
      id: "sales-order-pack",
      title: "Pack",
      url: "/console/modules/sales-order/pack",
      roles: "ADMIN",
      permissions: "sales-order.pack",
    },
    {
      id: "sales-order-ship",
      title: "Ship",
      url: "/console/modules/sales-order/ship",
      roles: "ADMIN",
      permissions: "sales-order.ship",
    },
    {
      id: "sales-order-deliver",
      title: "Deliver",
      url: "/console/modules/sales-order/deliver",
      roles: "ADMIN",
      permissions: "sales-order.deliver",
    },
  ],
};
