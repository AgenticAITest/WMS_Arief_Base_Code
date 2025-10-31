import { ShoppingCart, Package, CheckCircle, ClipboardCheck, PackageCheck, type LucideIcon } from 'lucide-react';

export const stepIconMap: Record<string, LucideIcon> = {
  create: Package,
  approve: CheckCircle,
  receive: ClipboardCheck,
  putaway: PackageCheck,
};

export const createPurchaseOrderSidebarMenus = (workflowSteps: any[]) => {
  // Filter out 'complete' step as it's always the last step and doesn't need to be displayed
  const filteredSteps = workflowSteps.filter(step => step.stepKey !== 'complete');
  
  return {
    id: "purchase-order",
    title: "Purchase Order",
    url: "/console/modules/purchase-order",
    icon: ShoppingCart,
    permissions: "purchase-order.view",
    items: filteredSteps.map((step) => ({
      id: step.stepKey,
      title: step.stepName,
      url: `/console/modules/purchase-order/${step.stepKey}`,
      icon: stepIconMap[step.stepKey],
      permissions: "purchase-order.view",
    })),
  };
};

export const purchaseOrderSidebarMenus = {
  id: 'purchase-order',
  title: 'Purchase Order',
  url: '/console/modules/purchase-order',
  icon: ShoppingCart,
  permissions: 'purchase-order.view',
  items: [],
};
