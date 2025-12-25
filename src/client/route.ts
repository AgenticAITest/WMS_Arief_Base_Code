import AuthLayout from "@client/pages/auth/AuthLayout";
import Login from "@client/pages/auth/Login";
import Register from "@client/pages/auth/Register";
import ConsoleLayout from "@client/pages/console/ConsoleLayout";
import Dashboard from "@client/pages/console/dashboard/Dashboard";
import Permission from "@client/pages/console/system/permissions/Permission";
import Role from "@client/pages/console/system/roles/Role";
import ErrorPage from "@client/pages/ErrorPage";
import Home from "@client/pages/Home";
import RootLayout from "@client/pages/RootLayout";
import { createBrowserRouter, redirect } from "react-router";
import { sampleModuleReactRoutes } from '../modules/sample-module/client/routes/sampleModuleReactRoutes';
import { masterDataReactRoutes } from '../modules/master-data/client/routes/masterDataReactRoutes';
import { warehouseSetupReactRoutes } from '../modules/warehouse-setup/client/routes/warehouseSetupReactRoutes';
import { inventoryItemsReactRoutes } from '../modules/inventory-items/client/routes/inventoryItemsReactRoutes';
import { purchaseOrderReactRoutes } from '../modules/purchase-order/client/routes/purchaseOrderReactRoutes';
import { salesOrderReactRoutes } from '../modules/sales-order/client/routes/salesOrderReactRoutes';
import { workflowReactRoutes } from '../modules/workflow/client/routes/workflowReactRoutes';
import { reportsReactRoutes } from '../modules/reports/client/routes/reportsReactRoutes';
import { generalReactRoutes } from '../modules/general/client/routes/generalReactRoutes';
import { documentNumberingReactRoutes } from '../modules/document-numbering/client/routes/documentNumberingReactRoutes';
import ForgetPassword from "./pages/auth/ForgetPassword";
import RegisterTenant from "./pages/auth/RegisterTenant";
import ResetPassword from "./pages/auth/ResetPassword";
import Department from "./pages/console/demo/department/Department";
import DepartmentAdd from "./pages/console/demo/department/DepartmentAdd";
import DepartmentEdit from "./pages/console/demo/department/DepartmentEdit";
import DepartmentView from "./pages/console/demo/department/DepartmentView";
import ErrorTest from "./pages/console/ErrorTest";
import CardShowcase from "./pages/console/showcase/CardShowcase";
import FormShowcase from "./pages/console/showcase/FormShowcase";
import TabShowcase from "./pages/console/showcase/TabShowcase";
import ModuleAuthorization from "./pages/console/system/module-authorization/ModuleAuthorization";
import ModuleRegistry from "./pages/console/system/module-registry/ModuleRegistry";
import ModuleRegistryAdd from "./pages/console/system/module-registry/ModuleRegistryAdd";
import ModuleRegistryEdit from "./pages/console/system/module-registry/ModuleRegistryEdit";
import Option from "./pages/console/system/option/Option";
import OptionAdd from "./pages/console/system/option/OptionAdd";
import OptionEdit from "./pages/console/system/option/OptionEdit";
import OptionView from "./pages/console/system/option/OptionView";
import PermissionAdd from "./pages/console/system/permissions/PermissionAdd";
import PermissionEdit from "./pages/console/system/permissions/PermissionEdit";
import PermissionView from "./pages/console/system/permissions/PermissionView";
import RoleAdd from "./pages/console/system/roles/RoleAdd";
import RoleEdit from "./pages/console/system/roles/RoleEdit";
import RoleImport from "./pages/console/system/roles/RoleImport";
import RoleView from "./pages/console/system/roles/RoleView";
import Tenant from "./pages/console/system/tenant/Tenant";
import TenantAdd from "./pages/console/system/tenant/TenantAdd";
import TenantEdit from "./pages/console/system/tenant/TenantEdit";
import TenantView from "./pages/console/system/tenant/TenantView";
import User from "./pages/console/system/users/User";
import UserAdd from "./pages/console/system/users/UserAdd";
import UserEdit from "./pages/console/system/users/UserEdit";
import UserResetPassword from "./pages/console/system/users/UserResetPassword";
import OtpSetup from "./pages/console/system/OtpSetup";
import UserView from "./pages/console/system/users/UserView";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: ErrorPage,
    children: [
      { index: true, Component: Home ,
        loader: async () => {
          return redirect("/console/dashboard");
        },
      },
      {
        path: "auth",
        Component: AuthLayout,
        children: [
          { path: "login", Component: Login },
          { path: "register", Component: Register },
          { path: "register-tenant", Component: RegisterTenant },
          { path: "forget-password", Component: ForgetPassword },
          { path: "reset-password", Component: ResetPassword },
        ],
      },
      {
        path: "console",
        Component: ConsoleLayout,
        children: [
          { path: "error-test", Component: ErrorTest },
          { path: "dashboard", Component: Dashboard },
          { 
            path: "showcase", 
            children: [
               { path: "card", Component: CardShowcase },
               { path: "tabs", Component: TabShowcase },
               { path: "form", Component: FormShowcase },
            ]
          },
          { 
            path: "demo", 
            // Component: ConsoleLayout,
            children: [
              { 
                path: "department", 
                children: [
                  { index: true, Component: Department },
                  { path: "add", Component: DepartmentAdd },
                  { path: ":id", Component: DepartmentView },
                  { path: ":id/edit", Component: DepartmentEdit },
                  { path: ":id/delete"}
                ]
              },
            ]
          },
          { 
            path: "system", 
            // Component: ConsoleLayout,
            children: [
              { 
                path: "tenant", 
                children: [
                  { index: true, Component: Tenant },
                  { path: "add", Component: TenantAdd },
                  { path: ":id", Component: TenantView},
                  { path: ":id/edit", Component: TenantEdit},
                  { path: ":id/delete"}
                ]
              },
              { 
                path: "permission", 
                children: [
                  { index: true, Component: Permission },
                  { path: "add", Component: PermissionAdd },
                  { path: ":id", Component: PermissionView},
                  { path: ":id/edit", Component: PermissionEdit},
                  { path: ":id/delete"}
                ]
              },
              { path: "role", children: [
                  { index: true, Component: Role},
                  { path: "add", Component: RoleAdd },
                  { path: "import", Component: RoleImport},
                  { path: ":id", Component: RoleView},
                  { path: ":id/edit", Component: RoleEdit}
                ]
              },
              { path: "option", children: [
                  { index: true, Component: Option},
                  { path: "add", Component: OptionAdd},
                  { path: ":id", Component: OptionView},
                  { path: ":id/edit", Component: OptionEdit}
                ]
              },
              { path: "user", children: [
                  { index: true, Component: User },
                  { path: "add", Component: UserAdd },
                  { path: ":id", Component: UserView },
                  { path: ":id/edit", Component: UserEdit },
                  { path: ":id/reset-password", Component: UserResetPassword }
                ]
              },
              { 
                path: "module-authorization", 
                Component: ModuleAuthorization 
              },
              { 
                path: "module-registry", 
                children: [
                  { index: true, Component: ModuleRegistry },
                  { path: "add", Component: ModuleRegistryAdd },
                  { path: ":id/edit", Component: ModuleRegistryEdit },
                ]
              },
              { path: "otp-setup", Component: OtpSetup },
            ]
          },
          sampleModuleReactRoutes("modules/sample-module"),
            masterDataReactRoutes("modules/master-data"),
            warehouseSetupReactRoutes("modules/warehouse-setup"),
            inventoryItemsReactRoutes("modules/inventory-items"),
            purchaseOrderReactRoutes("modules/purchase-order"),
            salesOrderReactRoutes("modules/sales-order"),
            workflowReactRoutes("modules/workflow"),
            documentNumberingReactRoutes("modules/document-numbering"),
            reportsReactRoutes("modules/reports"),
            generalReactRoutes("modules/general"),
],
      },
    ],
  },
]);