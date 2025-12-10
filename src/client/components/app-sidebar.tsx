import { BookOpen, Puzzle, Settings2, SquareTerminal } from "lucide-react";
import * as React from "react";

import { NavMain } from "@client/components/nav-main";
import { NavUser } from "@client/components/nav-user";
import { TeamSwitcher } from "@client/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@client/components/ui/sidebar";
import { sampleModuleSidebarMenus } from "../../modules/sample-module/client/menus/sideBarMenus";

import { generalSidebarMenus } from "../../modules/general/client/menus/sideBarMenus";
import { documentNumberingSidebarMenus } from "../../modules/document-numbering/client/menus/sideBarMenus";
import {
  cycleCountSidebarMenus,
  inventoryItemsSidebarMenus
} from "../../modules/inventory-items/client/menus/sideBarMenus";
import { masterDataSidebarMenus } from "../../modules/master-data/client/menus/sideBarMenus";
import {
  purchaseOrderSidebarMenus
} from "../../modules/purchase-order/client/menus/sideBarMenus";
import { reportsSidebarMenus } from "../../modules/reports/client/menus/sideBarMenus";
import {
  salesOrderSidebarMenus
} from "../../modules/sales-order/client/menus/sideBarMenus";
import { warehouseSetupSidebarMenus } from "../../modules/warehouse-setup/client/menus/sideBarMenus";
import { workflowSidebarMenus } from "../../modules/workflow/client/menus/sideBarMenus";
// This is sample data.
const data = {
  // teams: [
  //   {
  //     name: "Tenant One",
  //     logo: GalleryVerticalEnd,
  //     plan: "React Admin",
  //   },
  //   {
  //     name: "Tenant Two",
  //     logo: AudioWaveform,
  //     plan: "React Admin",
  //   },
  //   {
  //     name: "Tenant Three",
  //     logo: Command,
  //     plan: "React Admin",
  //   },
  // ],
  navMain: [
    {
      id: "dashboard",
      title: "Dashboard",
      url: "/console/dashboard",
      icon: SquareTerminal,
      isActive: true,
    },
    // {
    //   id: "settings",
    //   title: "Settings",
    //   url: "/console/settings",
    //   icon: Settings2,
    //   items: [
    //     {
    //       id: "security",
    //       title: "Security",
    //       url: "/console/settings/security",
    //     },
    //     {
    //       id: "account",
    //       title: "Account",
    //       url: "/console/settings/account",
    //     },
    //     {
    //       id: "general",
    //       title: "General",
    //       url: "/console/settings/general",
    //       items: [
    //         {
    //           id: "options",
    //           title: "Options",
    //           url: "/console/settings/general/options",
    //         },
    //         {
    //           id: "tenant",
    //           title: "Tenant",
    //           url: "/console/settings/general/tenant",
    //         },
    //       ],
    //     },
    //   ],
    // },
    {
      id: "showcase",
      title: "Showcase",
      url: "/console/showcase",
      icon: BookOpen,
      items: [
        {
          id: "card",
          title: "Card",
          url: "/console/showcase/card",
        },
        {
          id: "tabs",
          title: "Tabs",
          url: "/console/showcase/tabs",
        },
        {
          id: "form",
          title: "Form",
          url: "/console/showcase/form",
        },
      ],
    },
    {
      id: "demo",
      title: "Demo",
      url: "/console/demo",
      icon: Puzzle,
      items: [
        {
          id: "department",
          title: "Department",
          url: "/console/demo/department",
        },
      ],
    },
    {
      id: "system",
      title: "System",
      url: "/console/system",
      icon: Settings2,
      permissions: [
        "system.tenant.view",
        "system.permission.view",
        "system.role.view",
        "system.user.view",
        "system.option.view",
      ],
      items: [
        {
          id: "tenant",
          title: "Tenant",
          url: "/console/system/tenant",
          permissions: "system.tenant.view",
        },
        {
          id: "permission",
          title: "Permission",
          url: "/console/system/permission",
          permissions: "system.permission.view",
        },
        {
          id: "role",
          title: "Role",
          url: "/console/system/role",
          permissions: "system.role.view",
        },
        {
          id: "user",
          title: "User",
          url: "/console/system/user",
          permissions: "system.user.view",
        },
        {
          id: "option",
          title: "Option",
          url: "/console/system/option",
          permissions: "system.option.view",
        },
        {
          id: "module-authorization",
          title: "Module",
          url: "/console/system/module-authorization",
          permissions: "system.module.view",
        },
        {
          id: "module-registry",
          title: "Module Registry",
          url: "/console/system/module-registry",
          roles: "SYSADMIN",
          permissions: "system.module-registry.view",
        },
      ],
    },

    purchaseOrderSidebarMenus,
    salesOrderSidebarMenus,

    inventoryItemsSidebarMenus,

    documentNumberingSidebarMenus,

    masterDataSidebarMenus,

    warehouseSetupSidebarMenus,

    workflowSidebarMenus,

    reportsSidebarMenus,

    generalSidebarMenus,

    sampleModuleSidebarMenus,
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // const { steps: salesOrderSteps, loading: salesOrderLoading } = useSalesOrderWorkflowSteps();
  // const { steps: purchaseOrderSteps, loading: purchaseOrderLoading } = usePurchaseOrderWorkflowSteps();

  // const dynamicSalesOrderMenu = React.useMemo(() => {
  //   if (salesOrderLoading || salesOrderSteps.length === 0) {
  //     return salesOrderSidebarMenus;
  //   }
  //   return createSalesOrderSidebarMenus(salesOrderSteps);
  // }, [salesOrderSteps, salesOrderLoading]);

  // const dynamicPurchaseOrderMenu = React.useMemo(() => {
  //   if (purchaseOrderLoading || purchaseOrderSteps.length === 0) {
  //     return purchaseOrderSidebarMenus;
  //   }
  //   return createPurchaseOrderSidebarMenus(purchaseOrderSteps);
  // }, [purchaseOrderSteps, purchaseOrderLoading]);

  // const navItems = React.useMemo(() => {
  //   const staticItems = data.navMain.filter(item => item.id !== 'sales-order' && item.id !== 'purchase-order');
  //   const inventoryItemsIndex = staticItems.findIndex(item => item.id === 'inventory-items');

  //   if (inventoryItemsIndex >= 0) {
  //     return [
  //       ...staticItems.slice(0, inventoryItemsIndex + 1),
  //       adjustmentSidebarMenus,
  //       relocateSidebarMenus,
  //       cycleCountSidebarMenus,
  //       dynamicPurchaseOrderMenu,
  //       dynamicSalesOrderMenu,
  //       ...staticItems.slice(inventoryItemsIndex + 1),
  //     ];
  //   }

  //   return [...staticItems, adjustmentSidebarMenus, relocateSidebarMenus, cycleCountSidebarMenus, dynamicPurchaseOrderMenu, dynamicSalesOrderMenu];
  // }, [dynamicPurchaseOrderMenu, dynamicSalesOrderMenu]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain items={navItems} /> */}
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
