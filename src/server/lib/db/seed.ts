import bcrypt from "bcryptjs";
import { db } from ".";
import { permission, role, rolePermission, tenant, user, userRole, userTenant } from "./schema/system";
import { moduleRegistry } from "./schema/module";
import { seedWorkflows } from "@modules/workflow/server/lib/seedWorkflows";

async function seed() {

  // Check if data already exists
  console.log("Checking for existing data...");
  const existingTenants = await db.select({ id: tenant.id }).from(tenant).limit(1);
  
  if (existingTenants.length > 0) {
    console.log("\n⚠️  WARNING: Database already contains data!");
    console.log("Found existing tenants. Skipping seed to preserve your data.");
    console.log("\nIf you really want to re-seed (THIS WILL DELETE ALL DATA):");
    console.log("1. Manually delete all data first");
    console.log("2. Or use a fresh database");
    console.log("\nSeed aborted to protect your existing data.");
    return;
  }

  console.log("No existing data found. Proceeding with seed...\n");

  console.log("Seeding tenant");
  const sysTenantId = crypto.randomUUID();
  const pubTenantId = crypto.randomUUID();
  await db.insert(tenant).values([
    { id: sysTenantId, code: "system", name: "System", description: "System Tenant" },
    { id: pubTenantId, code: "public", name: "Public", description: "Public Tenant" }
  ]);

  console.log("Seeding user");
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash("S3cr3T", 10);
  await db.insert(user).values([
    { id: userId, username: "sysadmin", passwordHash: passwordHash, fullname: "System Admin", status: "active", activeTenantId:sysTenantId }
  ]);

  console.log("Seeding role");
  const sysRoleId = crypto.randomUUID();
  const pubRoleId = crypto.randomUUID();
  await db.insert(role).values([
    { id: sysRoleId, code: "SYSADMIN", name: "System Admin", description: "Role System Admin", isSystem: true, tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "USER", name: "Role User", description: "Regular user role", isSystem: false, tenantId: sysTenantId },
    { id: pubRoleId, code: "SYSADMIN", name: "System Admin", description: "Role System Admin", isSystem: true, tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "USER", name: "Role User", description: "Regular user role", isSystem: false, tenantId: pubTenantId }
  ]);

  console.log("seeding user tenant");
  await db.insert(userTenant).values([
    { userId: userId, tenantId: sysTenantId },
    { userId: userId, tenantId: pubTenantId }
  ]);

  console.log("Seeding user role");
  await db.insert(userRole).values([
    { userId: userId, roleId: sysRoleId, tenantId: sysTenantId },
    { userId: userId, roleId: pubRoleId, tenantId: pubTenantId }
  ]);

  console.log("Seeding permission");
  await db.insert(permission).values([

    // system tenant permission
    { id: crypto.randomUUID(), code: "system.tenant.view", name: "View Tenant", description: "Permission to view tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.create", name: "Create Tenant", description: "Permission to add tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.edit", name: "Edit Tenant", description: "Permission to edit tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.delete", name: "Delete Tenant", description: "Permission to delete tenant", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.user.view", name: "View User", description: "Permission to view user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.create", name: "Create User", description: "Permission to add user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.edit", name: "Edit User", description: "Permission to edit user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.delete", name: "Delete User", description: "Permission to delete user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.reset_password", name: "Reset Password", description: "Permission to reset password user", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.role.view", name: "View Role", description: "Permission to view role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.create", name: "Create Role", description: "Permission to add role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.edit", name: "Edit Role", description: "Permission to edit role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.delete", name: "Delete Role", description: "Permission to delete role", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.permission.view", name: "View Permission", description: "Permission to view permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.create", name: "Create Permission", description: "Permission to add permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.edit", name: "Edit Permission", description: "Permission to edit permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.delete", name: "Delete Permission", description: "Permission to delete permission", tenantId: sysTenantId },  

    { id: crypto.randomUUID(), code: "system.option.view", name: "View Option", description: "Permission to view option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.create", name: "Create Option", description: "Permission to add option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.edit", name: "Edit Option", description: "Permission to edit option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.delete", name: "Delete Option", description: "Permission to delete option", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.module.view", name: "View Module", description: "Permission to view module", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.module.manage", name: "Manage Module", description: "Permission to manage module", tenantId: sysTenantId },

    // public tenant permissions
    { id: crypto.randomUUID(), code: "system.tenant.view", name: "View Tenant", description: "Permission to view tenant", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.edit", name: "Edit Tenant", description: "Permission to edit tenant", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.user.view", name: "View User", description: "Permission to view user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.create", name: "Create User", description: "Permission to add user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.edit", name: "Edit User", description: "Permission to edit user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.delete", name: "Delete User", description: "Permission to delete user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.reset_password", name: "Reset Password", description: "Permission to reset password user", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.role.view", name: "View Role", description: "Permission to view role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.create", name: "Create Role", description: "Permission to add role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.edit", name: "Edit Role", description: "Permission to edit role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.delete", name: "Delete Role", description: "Permission to delete role", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.permission.view", name: "View Permission", description: "Permission to view permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.create", name: "Create Permission", description: "Permission to add permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.edit", name: "Edit Permission", description: "Permission to edit permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.delete", name: "Delete Permission", description: "Permission to delete permission", tenantId: pubTenantId },  

    { id: crypto.randomUUID(), code: "system.option.view", name: "View Option", description: "Permission to view option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.create", name: "Create Option", description: "Permission to add option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.edit", name: "Edit Option", description: "Permission to edit option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.delete", name: "Delete Option", description: "Permission to delete option", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.module.view", name: "View Module", description: "Permission to view module", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.module.manage", name: "Manage Module", description: "Permission to manage module", tenantId: pubTenantId },

    // add master data module permissions  
    { id: crypto.randomUUID(), code: "master-data.view", name: "View Master Data", description: "Permission to view master data", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "master-data.create", name: "Create Master Data", description: "Permission to add master data", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "master-data.edit", name: "Edit Master Data", description: "Permission to edit master data", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "master-data.delete", name: "Delete Master Data", description: "Permission to delete master data", tenantId: sysTenantId },

    // add document numbering module permissions
    { id: crypto.randomUUID(), code: "document-numbering.view", name: "View Document Numbering", description: "Permission to view document numbering", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "document-numbering.create", name: "Create Document Numbering", description: "Permission to add document numbering", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "document-numbering.edit", name: "Edit Document Numbering", description: "Permission to edit document numbering", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "document-numbering.delete", name: "Delete Document Numbering", description: "Permission to delete document numbering", tenantId: sysTenantId },

    // add workflow module permissions
    { id: crypto.randomUUID(), code: "workflow.view", name: "View Workflow", description: "Permission to view workflow", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "workflow.edit", name: "Edit Workflow", description: "Permission to edit workflow", tenantId: sysTenantId },

    // add warehouse-setup module permissions
    { id: crypto.randomUUID(), code: "warehouse-setup.view", name: "View Warehouse Setup", description: "Permission to view warehouse setup", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "warehouse-setup.delete", name: "Delete Warehouse Setup", description: "Permission to delete warehouse setup", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "warehouse-setup.edit", name: "Edit Warehouse Setup", description: "Permission to edit warehouse setup", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "warehouse-setup.create", name: "Create Warehouse Setup", description: "Permission to add warehouse setup", tenantId: sysTenantId },
    
    // add report module permissions
    { id: crypto.randomUUID(), code: "report.financial-report.view", name: "View Financial Report", description: "Permission to view financial report", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "report.audit-log.view", name: "View Audit Log", description: "Permission to view audit log", tenantId: sysTenantId },

    // add purchase-order module permissions
    { id: crypto.randomUUID(), code: "purchase-order.view", name: "View Purchase Order", description: "Permission to view purchase order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "purchase-order.create", name: "Create Purchase Order", description: "Permission to create purchase order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "purchase-order.edit", name: "Edit Purchase Order", description: "Permission to edit purchase order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "purchase-order.delete", name: "Delete Purchase Order", description: "Permission to delete purchase order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "purchase-order.approval", name: "Purchase Order Approval", description: "Permission to approve purchase order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "purchase-order.receive", name: "Receive Purchase Order", description: "Permission to receive purchase order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "purchase-order.putaway", name: "Putaway Purchase Order", description: "Permission to putaway purchase order", tenantId: sysTenantId },

    // add sales-order module permissions
    { id: crypto.randomUUID(), code: "sales-order.view", name: "View Sales Order", description: "Permission to view sales order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "sales-order.create", name: "Create Sales Order", description: "Permission to create sales order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "sales-order.allocate", name: "Allocate Sales Order", description: "Permission to allocate sales order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "sales-order.pick", name: "Pick Sales Order", description: "Permission to pick sales order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "sales-order.pack", name: "Pack Sales Order", description: "Permission to pack sales order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "sales-order.ship", name: "Ship Sales Order", description: "Permission to ship sales order", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "sales-order.deliver", name: "Deliver Sales Order", description: "Permission to deliver sales order", tenantId: sysTenantId },

    // add inventory-items module permissions
    { id: crypto.randomUUID(), code: "inventory-items.view", name: "View Inventory Items", description: "Permission to view inventory items", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "inventory-items.adjustment.view", name: "View Inventory Adjustments", description: "Permission to view inventory adjustments", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.adjustment.create", name: "Create Inventory Adjustment", description: "Permission to create inventory adjustment", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.adjustment.edit", name: "Edit Inventory Adjustment", description: "Permission to edit inventory adjustment", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.adjustment.delete", name: "Delete Inventory Adjustment", description: "Permission to delete inventory adjustment", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.adjustment.approval", name: "Inventory Adjustment Approval", description: "Permission to approve inventory adjustment", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "inventory-items.relocation.view", name: "View Relocations", description: "Permission to view relocations", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.relocation.create", name: "Create Relocation", description: "Permission to create relocation", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.relocation.edit", name: "Edit Relocation", description: "Permission to edit relocation", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.relocation.delete", name: "Delete Relocation", description: "Permission to delete relocation", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.relocation.approval", name: "Relocation Approval", description: "Permission to approve relocation", tenantId: sysTenantId },
    
    { id: crypto.randomUUID(), code: "inventory-items.cycle-count.view", name: "View Cycle Counts", description: "Permission to view cycle counts", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.cycle-count.create", name: "Create Cycle Count", description: "Permission to create cycle count", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.cycle-count.edit", name: "Edit Cycle Count", description: "Permission to edit cycle count", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.cycle-count.delete", name: "Delete Cycle Count", description: "Permission to delete cycle count", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "inventory-items.cycle-count.approval", name: "Cycle Count Approval", description: "Permission to approve cycle count", tenantId: sysTenantId }, 
  
  ]);

  console.log("Seeding module registry");
  await db.insert(moduleRegistry).values([
    { id: crypto.randomUUID(), moduleId: "sample-module", moduleName: "Sample Module", description: "Sample module for demonstrating the modular architecture with CRUD operations", version: "1.0.0", category: "Sample", isActive: true, repositoryUrl: "https://github.com/sample/sample-module",documentationUrl: "https://docs.sample.com/sample-module"},
  ]);

  console.log("\nSeeding workflows for system tenant");
  await seedWorkflows(sysTenantId);
  
  console.log("\nSeeding workflows for public tenant");
  await seedWorkflows(pubTenantId);

}

async function main() {
  await seed();
  console.log("Seed completed");
  process.exit(0);
}

main();
