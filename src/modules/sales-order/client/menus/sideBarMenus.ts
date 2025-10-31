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
  permissions: "sales-order.view",
  items: [],
};
