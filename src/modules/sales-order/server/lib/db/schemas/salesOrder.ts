import { relations, sql } from 'drizzle-orm';
import { check, date, decimal, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { tenant, user } from '@server/lib/db/schema/system';
import { customers, customerLocations, products, transporters, shippingMethods } from '@modules/master-data/server/lib/db/schemas/masterData';
import { warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { purchaseOrders } from '@modules/purchase-order/server/lib/db/schemas/purchaseOrder';

export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  shippingLocationId: uuid('shipping_location_id')
    .references(() => customerLocations.id),
  shippingMethodId: uuid('shipping_method_id')
    .references(() => shippingMethods.id),
  orderDate: date('order_date').notNull(),
  requestedDeliveryDate: date('requested_delivery_date'),
  status: varchar('status', { 
    length: 50, 
    enum: ['created', 'allocated', 'picked', 'packed', 'shipped', 'delivered'] 
  }).notNull().default('created'),
  workflowState: varchar('workflow_state', { length: 50 }),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  deliveryInstructions: text('delivery_instructions'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: uuid('created_by').references(() => user.id),
  updatedBy: uuid('updated_by').references(() => user.id),
},
  (t) => ({
    orderNumberUnique: uniqueIndex('sales_orders_order_number_unique_idx').on(t.tenantId, t.orderNumber),
    tenantIdx: index('sales_orders_tenant_idx').on(t.tenantId),
    customerIdx: index('sales_orders_customer_idx').on(t.customerId),
    shippingLocationIdx: index('sales_orders_shipping_location_idx').on(t.shippingLocationId),
    shippingMethodIdx: index('sales_orders_shipping_method_idx').on(t.shippingMethodId),
    statusIdx: index('sales_orders_status_idx').on(t.tenantId, t.status),
    dateIdx: index('sales_orders_date_idx').on(t.tenantId, t.orderDate),
    numberIdx: index('sales_orders_number_idx').on(t.tenantId, t.orderNumber),
  })
);

export const salesOrderItems = pgTable('sales_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  salesOrderId: uuid('sales_order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  orderedQuantity: decimal('ordered_quantity', { precision: 15, scale: 3 }).notNull(),
  allocatedQuantity: decimal('allocated_quantity', { precision: 15, scale: 3 }).default('0').notNull(),
  pickedQuantity: decimal('picked_quantity', { precision: 15, scale: 3 }).default('0').notNull(),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 15, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('sales_order_items_unique_idx').on(t.tenantId, t.salesOrderId, t.lineNumber),
    index('sales_order_items_tenant_idx').on(t.tenantId),
    index('sales_order_items_order_idx').on(t.salesOrderId),
    index('sales_order_items_product_idx').on(t.productId),
  ]
);

export const salesOrderItemLocations = pgTable('sales_order_item_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  salesOrderItemId: uuid('sales_order_item_id')
    .notNull()
    .references(() => salesOrderItems.id, { onDelete: 'cascade' }),
  customerLocationId: uuid('customer_location_id')
    .notNull()
    .references(() => customerLocations.id),
  quantity: decimal('quantity', { precision: 15, scale: 3 }).notNull(),
  deliveryNotes: text('delivery_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('so_item_locations_tenant_idx').on(t.tenantId),
    index('so_item_locations_item_idx').on(t.salesOrderItemId),
    index('so_item_locations_location_idx').on(t.customerLocationId),
  ]
);

export const salesOrderAllocations = pgTable('sales_order_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  salesOrderItemId: uuid('sales_order_item_id')
    .notNull()
    .references(() => salesOrderItems.id, { onDelete: 'cascade' }),
  inventoryItemId: uuid('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id),
  allocatedQuantity: decimal('allocated_quantity', { precision: 15, scale: 3 }).notNull(),
  allocationDate: timestamp('allocation_date').defaultNow().notNull(),
  allocatedBy: uuid('allocated_by')
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('sales_order_allocations_tenant_idx').on(t.tenantId),
    index('sales_order_allocations_item_idx').on(t.salesOrderItemId),
    index('sales_order_allocations_inventory_idx').on(t.inventoryItemId),
  ]
);

export const salesOrderPicks = pgTable('sales_order_picks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  salesOrderItemId: uuid('sales_order_item_id')
    .notNull()
    .references(() => salesOrderItems.id, { onDelete: 'cascade' }),
  inventoryItemId: uuid('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'cascade' }),
  pickedQuantity: decimal('picked_quantity', { precision: 15, scale: 3 }).notNull(),
  batchNumber: varchar('batch_number', { length: 100 }),
  lotNumber: varchar('lot_number', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  pickDate: timestamp('pick_date').defaultNow().notNull(),
  pickedBy: uuid('picked_by')
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('so_picks_tenant_idx').on(t.tenantId),
    index('so_picks_item_idx').on(t.salesOrderItemId),
    index('so_picks_inventory_idx').on(t.inventoryItemId),
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
  salesOrderId: uuid('sales_order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  shipmentId: uuid('shipment_id')
    .references(() => shipments.id, { onDelete: 'cascade' }),
  packageId: varchar('package_id', { length: 100 }).notNull(),
  packageNumber: varchar('package_number', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  length: decimal('length', { precision: 10, scale: 2 }),
  width: decimal('width', { precision: 10, scale: 2 }),
  height: decimal('height', { precision: 10, scale: 2 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
  (t) => [
    uniqueIndex('packages_package_id_unique_idx').on(t.packageId),
    uniqueIndex('packages_barcode_unique_idx').on(t.barcode),
    index('packages_tenant_idx').on(t.tenantId),
    index('packages_so_idx').on(t.salesOrderId),
    index('packages_shipment_idx').on(t.shipmentId),
  ]
);

export const packageItems = pgTable('package_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id, { onDelete: 'cascade' }),
  salesOrderItemId: uuid('sales_order_item_id')
    .notNull()
    .references(() => salesOrderItems.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  quantity: decimal('quantity', { precision: 15, scale: 3 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
  (t) => [
    index('package_items_tenant_idx').on(t.tenantId),
    index('package_items_package_idx').on(t.packageId),
    index('package_items_so_item_idx').on(t.salesOrderItemId),
    index('package_items_product_idx').on(t.productId),
  ]
);

export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  shipmentId: uuid('shipment_id')
    .notNull()
    .references(() => shipments.id, { onDelete: 'cascade' }),
  salesOrderId: uuid('sales_order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  status: varchar('status', { 
    length: 50,
    enum: ['complete', 'partial']
  }).notNull(),
  deliveryDate: timestamp('delivery_date').notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  notes: text('notes'),
  returnPurchaseOrderId: uuid('return_purchase_order_id')
    .references(() => purchaseOrders.id),
  deliveredBy: uuid('delivered_by')
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('deliveries_shipment_unique_idx').on(t.shipmentId),
    index('deliveries_tenant_idx').on(t.tenantId),
    index('deliveries_so_idx').on(t.salesOrderId),
    index('deliveries_status_idx').on(t.status),
  ]
);

export const deliveryItems = pgTable('delivery_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  deliveryId: uuid('delivery_id')
    .notNull()
    .references(() => deliveries.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  salesOrderItemId: uuid('sales_order_item_id')
    .notNull()
    .references(() => salesOrderItems.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  shippedQuantity: decimal('shipped_quantity', { precision: 15, scale: 3 }).notNull(),
  acceptedQuantity: decimal('accepted_quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  rejectedQuantity: decimal('rejected_quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  rejectionNotes: text('rejection_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
  (t) => [
    index('delivery_items_tenant_idx').on(t.tenantId),
    index('delivery_items_delivery_idx').on(t.deliveryId),
    index('delivery_items_product_idx').on(t.productId),
  ]
);

// Relations

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
  shippingLocation: one(customerLocations, {
    fields: [salesOrders.shippingLocationId],
    references: [customerLocations.id],
  }),
  shippingMethod: one(shippingMethods, {
    fields: [salesOrders.shippingMethodId],
    references: [shippingMethods.id],
  }),
  creator: one(user, {
    fields: [salesOrders.createdBy],
    references: [user.id],
  }),
  updater: one(user, {
    fields: [salesOrders.updatedBy],
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
  locations: many(salesOrderItemLocations),
}));

export const salesOrderItemLocationsRelations = relations(salesOrderItemLocations, ({ one }) => ({
  salesOrderItem: one(salesOrderItems, {
    fields: [salesOrderItemLocations.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
  customerLocation: one(customerLocations, {
    fields: [salesOrderItemLocations.customerLocationId],
    references: [customerLocations.id],
  }),
  tenant: one(tenant, {
    fields: [salesOrderItemLocations.tenantId],
    references: [tenant.id],
  }),
}));

export const salesOrderAllocationsRelations = relations(salesOrderAllocations, ({ one, many }) => ({
  salesOrderItem: one(salesOrderItems, {
    fields: [salesOrderAllocations.salesOrderItemId],
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
  salesOrderItem: one(salesOrderItems, {
    fields: [salesOrderPicks.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [salesOrderPicks.inventoryItemId],
    references: [inventoryItems.id],
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

export const deliveriesRelations = relations(deliveries, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [deliveries.shipmentId],
    references: [shipments.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [deliveries.salesOrderId],
    references: [salesOrders.id],
  }),
  returnPurchaseOrder: one(purchaseOrders, {
    fields: [deliveries.returnPurchaseOrderId],
    references: [purchaseOrders.id],
  }),
  deliveredByUser: one(user, {
    fields: [deliveries.deliveredBy],
    references: [user.id],
  }),
  tenant: one(tenant, {
    fields: [deliveries.tenantId],
    references: [tenant.id],
  }),
  items: many(deliveryItems),
}));

export const deliveryItemsRelations = relations(deliveryItems, ({ one }) => ({
  delivery: one(deliveries, {
    fields: [deliveryItems.deliveryId],
    references: [deliveries.id],
  }),
  salesOrderItem: one(salesOrderItems, {
    fields: [deliveryItems.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
  product: one(products, {
    fields: [deliveryItems.productId],
    references: [products.id],
  }),
  tenant: one(tenant, {
    fields: [deliveryItems.tenantId],
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

export type SalesOrderItemLocation = typeof salesOrderItemLocations.$inferSelect;
export type NewSalesOrderItemLocation = typeof salesOrderItemLocations.$inferInsert;

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

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;

export type DeliveryItem = typeof deliveryItems.$inferSelect;
export type NewDeliveryItem = typeof deliveryItems.$inferInsert;

