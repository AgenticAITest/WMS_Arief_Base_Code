import { relations, sql } from 'drizzle-orm';
import { check, date, decimal, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { tenant, user } from '@server/lib/db/schema/system';
import { customers, customerLocations, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

export const transporters = pgTable('transporters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  serviceAreas: jsonb('service_areas'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('transporters_unique_idx').on(t.tenantId, t.name),
    index('transporters_tenant_idx').on(t.tenantId),
  ]
);

export const shippingMethods = pgTable('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  methodType: varchar('method_type', { 
    length: 20,
    enum: ['internal', 'third_party']
  }).notNull(),
  transporterId: uuid('transporter_id')
    .references(() => transporters.id),
  name: varchar('name', { length: 255 }).notNull(),
  estimatedDays: integer('estimated_days'),
  costCalculation: varchar('cost_calculation', { 
    length: 50,
    enum: ['fixed', 'weight_based', 'volumetric_based']
  }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => ({
    uniqueIdx: uniqueIndex('shipping_methods_unique_idx').on(t.tenantId, t.name),
    tenantIdx: index('shipping_methods_tenant_idx').on(t.tenantId),
    transporterIdx: index('shipping_methods_transporter_idx').on(t.transporterId),
    methodTypeCheck: check(
      'method_type_transporter_check',
      sql`(
        (method_type = 'internal' AND transporter_id IS NULL) OR
        (method_type = 'third_party' AND transporter_id IS NOT NULL)
      )`
    ),
  })
);

export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  billingLocationId: uuid('billing_location_id')
    .references(() => customerLocations.id),
  shippingLocationId: uuid('shipping_location_id')
    .references(() => customerLocations.id),
  shippingMethodId: uuid('shipping_method_id')
    .references(() => shippingMethods.id),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  status: varchar('status', { 
    length: 50, 
    enum: ['pending', 'confirmed', 'allocated', 'picked', 'packed', 'shipped', 'delivered', 'cancelled', 'completed'] 
  }).notNull().default('pending'),
  workflowState: varchar('workflow_state', { 
    length: 50, 
    enum: ['create', 'allocate', 'pick', 'pack', 'ship', 'deliver', 'complete'] 
  }).default('create'),
  orderDate: date('order_date').notNull(),
  requestedDeliveryDate: date('requested_delivery_date'),
  actualDeliveryDate: date('actual_delivery_date'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  deliveryInstructions: text('delivery_instructions'),
  notes: text('notes'),
  createdBy: uuid('created_by')
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => ({
    orderNumberUnique: uniqueIndex('sales_orders_order_number_unique_idx').on(t.orderNumber),
    tenantIdx: index('sales_orders_tenant_idx').on(t.tenantId),
    customerIdx: index('sales_orders_customer_idx').on(t.customerId),
    statusIdx: index('sales_orders_status_idx').on(t.status),
    warehouseIdx: index('sales_orders_warehouse_idx').on(t.warehouseId),
    orderDateIdx: index('sales_orders_order_date_idx').on(t.orderDate),
  })
);

export const salesOrderItems = pgTable('sales_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  salesOrderId: uuid('sales_order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  orderedQuantity: integer('ordered_quantity').notNull(),
  allocatedQuantity: integer('allocated_quantity').default(0).notNull(),
  pickedQuantity: integer('picked_quantity').default(0).notNull(),
  shippedQuantity: integer('shipped_quantity').default(0).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 15, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('sales_order_items_tenant_idx').on(t.tenantId),
    index('sales_order_items_so_idx').on(t.salesOrderId),
    index('sales_order_items_product_idx').on(t.productId),
  ]
);

export const salesOrderAllocations = pgTable('sales_order_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  soItemId: uuid('so_item_id')
    .notNull()
    .references(() => salesOrderItems.id, { onDelete: 'cascade' }),
  inventoryItemId: uuid('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  allocatedQuantity: integer('allocated_quantity').notNull(),
  allocationDate: timestamp('allocation_date').defaultNow().notNull(),
  allocatedBy: uuid('allocated_by')
    .references(() => user.id),
  status: varchar('status', { length: 20 }).default('allocated').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('so_allocations_tenant_idx').on(t.tenantId),
    index('so_allocations_so_item_idx').on(t.soItemId),
    index('so_allocations_inventory_idx').on(t.inventoryItemId),
    index('so_allocations_status_idx').on(t.status),
  ]
);

export const salesOrderPicks = pgTable('sales_order_picks', {
  id: uuid('id').primaryKey().defaultRandom(),
  salesOrderId: uuid('sales_order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  allocationId: uuid('allocation_id')
    .notNull()
    .references(() => salesOrderAllocations.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  pickedQuantity: integer('picked_quantity').notNull(),
  pickDate: timestamp('pick_date').defaultNow().notNull(),
  pickedBy: uuid('picked_by')
    .references(() => user.id),
  batchNumber: varchar('batch_number', { length: 100 }),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  expiryDate: date('expiry_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
  (t) => [
    index('so_picks_tenant_idx').on(t.tenantId),
    index('so_picks_so_idx').on(t.salesOrderId),
    index('so_picks_allocation_idx').on(t.allocationId),
    index('so_picks_picked_by_idx').on(t.pickedBy),
  ]
);

export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  salesOrderId: uuid('sales_order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  shipmentNumber: varchar('shipment_number', { length: 100 }).notNull(),
  shipmentDocumentId: uuid('shipment_document_id')
    .references(() => generatedDocuments.id, { onDelete: 'cascade' }),
  transporterId: uuid('transporter_id')
    .references(() => transporters.id),
  shippingMethodId: uuid('shipping_method_id')
    .references(() => shippingMethods.id),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  status: varchar('status', { 
    length: 50,
    enum: ['ready', 'in_transit', 'delivered', 'failed', 'returned']
  }).default('ready').notNull(),
  shippingDate: timestamp('shipping_date'),
  deliveryDate: timestamp('delivery_date'),
  totalWeight: decimal('total_weight', { precision: 10, scale: 3 }),
  totalVolume: decimal('total_volume', { precision: 10, scale: 3 }),
  totalCost: decimal('total_cost', { precision: 15, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => ({
    shipmentNumberUnique: uniqueIndex('shipments_shipment_number_unique_idx').on(t.shipmentNumber),
    soUnique: uniqueIndex('shipments_so_unique_idx').on(t.tenantId, t.salesOrderId),
    tenantIdx: index('shipments_tenant_idx').on(t.tenantId),
    trackingIdx: index('shipments_tracking_idx').on(t.trackingNumber),
  })
);

export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  shipmentId: uuid('shipment_id')
    .notNull()
    .references(() => shipments.id, { onDelete: 'cascade' }),
  packageNumber: varchar('package_number', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  dimensions: varchar('dimensions', { length: 100 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
  (t) => [
    uniqueIndex('packages_barcode_unique_idx').on(t.barcode),
    index('packages_tenant_idx').on(t.tenantId),
    index('packages_shipment_idx').on(t.shipmentId),
  ]
);

export const packageItems = pgTable('package_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
  (t) => [
    index('package_items_tenant_idx').on(t.tenantId),
    index('package_items_package_idx').on(t.packageId),
    index('package_items_product_idx').on(t.productId),
  ]
);

// Relations
export const transportersRelations = relations(transporters, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [transporters.tenantId],
    references: [tenant.id],
  }),
  shippingMethods: many(shippingMethods),
  shipments: many(shipments),
}));

export const shippingMethodsRelations = relations(shippingMethods, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [shippingMethods.tenantId],
    references: [tenant.id],
  }),
  transporter: one(transporters, {
    fields: [shippingMethods.transporterId],
    references: [transporters.id],
  }),
  salesOrders: many(salesOrders),
  shipments: many(shipments),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [salesOrders.tenantId],
    references: [tenant.id],
  }),
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  billingLocation: one(customerLocations, {
    fields: [salesOrders.billingLocationId],
    references: [customerLocations.id],
  }),
  shippingLocation: one(customerLocations, {
    fields: [salesOrders.shippingLocationId],
    references: [customerLocations.id],
  }),
  shippingMethod: one(shippingMethods, {
    fields: [salesOrders.shippingMethodId],
    references: [shippingMethods.id],
  }),
  warehouse: one(warehouses, {
    fields: [salesOrders.warehouseId],
    references: [warehouses.id],
  }),
  creator: one(user, {
    fields: [salesOrders.createdBy],
    references: [user.id],
  }),
  items: many(salesOrderItems),
  picks: many(salesOrderPicks),
  shipments: many(shipments),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one, many }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  product: one(products, {
    fields: [salesOrderItems.productId],
    references: [products.id],
  }),
  tenant: one(tenant, {
    fields: [salesOrderItems.tenantId],
    references: [tenant.id],
  }),
  allocations: many(salesOrderAllocations),
  packageItems: many(packageItems),
}));

export const salesOrderAllocationsRelations = relations(salesOrderAllocations, ({ one, many }) => ({
  soItem: one(salesOrderItems, {
    fields: [salesOrderAllocations.soItemId],
    references: [salesOrderItems.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [salesOrderAllocations.inventoryItemId],
    references: [inventoryItems.id],
  }),
  tenant: one(tenant, {
    fields: [salesOrderAllocations.tenantId],
    references: [tenant.id],
  }),
  allocator: one(user, {
    fields: [salesOrderAllocations.allocatedBy],
    references: [user.id],
  }),
  picks: many(salesOrderPicks),
}));

export const salesOrderPicksRelations = relations(salesOrderPicks, ({ one }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderPicks.salesOrderId],
    references: [salesOrders.id],
  }),
  allocation: one(salesOrderAllocations, {
    fields: [salesOrderPicks.allocationId],
    references: [salesOrderAllocations.id],
  }),
  tenant: one(tenant, {
    fields: [salesOrderPicks.tenantId],
    references: [tenant.id],
  }),
  picker: one(user, {
    fields: [salesOrderPicks.pickedBy],
    references: [user.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  salesOrder: one(salesOrders, {
    fields: [shipments.salesOrderId],
    references: [salesOrders.id],
  }),
  shipmentDocument: one(generatedDocuments, {
    fields: [shipments.shipmentDocumentId],
    references: [generatedDocuments.id],
  }),
  tenant: one(tenant, {
    fields: [shipments.tenantId],
    references: [tenant.id],
  }),
  transporter: one(transporters, {
    fields: [shipments.transporterId],
    references: [transporters.id],
  }),
  shippingMethod: one(shippingMethods, {
    fields: [shipments.shippingMethodId],
    references: [shippingMethods.id],
  }),
  packages: many(packages),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [packages.shipmentId],
    references: [shipments.id],
  }),
  tenant: one(tenant, {
    fields: [packages.tenantId],
    references: [tenant.id],
  }),
  items: many(packageItems),
}));

export const packageItemsRelations = relations(packageItems, ({ one }) => ({
  package: one(packages, {
    fields: [packageItems.packageId],
    references: [packages.id],
  }),
  product: one(products, {
    fields: [packageItems.productId],
    references: [products.id],
  }),
  tenant: one(tenant, {
    fields: [packageItems.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type Transporter = typeof transporters.$inferSelect;
export type NewTransporter = typeof transporters.$inferInsert;

export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type NewShippingMethod = typeof shippingMethods.$inferInsert;

export type SalesOrder = typeof salesOrders.$inferSelect;
export type NewSalesOrder = typeof salesOrders.$inferInsert;

export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type NewSalesOrderItem = typeof salesOrderItems.$inferInsert;

export type SalesOrderAllocation = typeof salesOrderAllocations.$inferSelect;
export type NewSalesOrderAllocation = typeof salesOrderAllocations.$inferInsert;

export type SalesOrderPick = typeof salesOrderPicks.$inferSelect;
export type NewSalesOrderPick = typeof salesOrderPicks.$inferInsert;

export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;

export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;

export type PackageItem = typeof packageItems.$inferSelect;
export type NewPackageItem = typeof packageItems.$inferInsert;
