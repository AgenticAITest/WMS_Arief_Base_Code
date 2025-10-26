import { relations, sql } from 'drizzle-orm';
import { check, date, decimal, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant, user } from '@server/lib/db/schema/system';
import { suppliers, supplierLocations, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  supplierLocationId: uuid('supplier_location_id')
    .references(() => supplierLocations.id),
  deliveryMethod: varchar('delivery_method', { length: 20 })
    .notNull()
    .default('delivery'),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  status: varchar('status', { 
    length: 50, 
    enum: ['pending', 'approved', 'rejected', 'received', 'completed'] 
  }).notNull().default('pending'),
  workflowState: varchar('workflow_state', { 
    length: 50, 
    enum: ['create', 'approve', 'receive', 'putaway', 'complete'] 
  }).default('create'),
  orderDate: date('order_date').notNull(),
  expectedDeliveryDate: date('expected_delivery_date'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
  notes: text('notes'),
  createdBy: uuid('created_by')
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => ({
    orderNumberUnique: uniqueIndex('purchase_orders_order_number_unique_idx').on(t.orderNumber),
    tenantIdx: index('purchase_orders_tenant_idx').on(t.tenantId),
    supplierIdx: index('purchase_orders_supplier_idx').on(t.supplierId),
    statusIdx: index('purchase_orders_status_idx').on(t.status),
    warehouseIdx: index('purchase_orders_warehouse_idx').on(t.warehouseId),
    deliveryMethodCheck: check(
      'delivery_method_check',
      sql`(
        (delivery_method = 'delivery') OR
        (delivery_method = 'pickup' AND supplier_location_id IS NOT NULL)
      )`
    ),
  })
);

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseOrderId: uuid('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  orderedQuantity: integer('ordered_quantity').notNull(),
  receivedQuantity: integer('received_quantity').default(0).notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 15, scale: 2 }),
  expectedExpiryDate: date('expected_expiry_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('purchase_order_items_tenant_idx').on(t.tenantId),
    index('purchase_order_items_po_idx').on(t.purchaseOrderId),
    index('purchase_order_items_product_idx').on(t.productId),
  ]
);

// Relations
export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [purchaseOrders.tenantId],
    references: [tenant.id],
  }),
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  supplierLocation: one(supplierLocations, {
    fields: [purchaseOrders.supplierLocationId],
    references: [supplierLocations.id],
  }),
  warehouse: one(warehouses, {
    fields: [purchaseOrders.warehouseId],
    references: [warehouses.id],
  }),
  creator: one(user, {
    fields: [purchaseOrders.createdBy],
    references: [user.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
  tenant: one(tenant, {
    fields: [purchaseOrderItems.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
