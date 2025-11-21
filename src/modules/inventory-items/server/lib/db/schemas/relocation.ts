import { pgTable, uuid, varchar, timestamp, text, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenant, user } from '@server/lib/db/schema/system';
import { inventoryItems } from './inventoryItems';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';

export const relocations = pgTable('relocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  relocationNumber: varchar('relocation_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('created'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => user.id),
  approvedBy: uuid('approved_by').references(() => user.id),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('relocations_tenant_relocation_number_unique').on(t.tenantId, t.relocationNumber),
    index('relocations_tenant_idx').on(t.tenantId),
    index('relocations_status_idx').on(t.status),
    index('relocations_created_at_idx').on(t.createdAt),
  ]
);

export const relocationItems = pgTable('relocation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  relocationId: uuid('relocation_id')
    .notNull()
    .references(() => relocations.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  inventoryItemId: uuid('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  fromBinId: uuid('from_bin_id')
    .notNull()
    .references(() => bins.id),
  toBinId: uuid('to_bin_id')
    .notNull()
    .references(() => bins.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
},
  (t) => [
    index('relocation_items_tenant_idx').on(t.tenantId),
    index('relocation_items_relocation_idx').on(t.relocationId),
    index('relocation_items_from_bin_idx').on(t.fromBinId),
    index('relocation_items_to_bin_idx').on(t.toBinId),
    index('relocation_items_product_idx').on(t.productId),
  ]
);

// Relations
export const relocationsRelations = relations(relocations, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [relocations.tenantId],
    references: [tenant.id],
  }),
  creator: one(user, {
    fields: [relocations.createdBy],
    references: [user.id],
  }),
  approver: one(user, {
    fields: [relocations.approvedBy],
    references: [user.id],
  }),
  items: many(relocationItems),
}));

export const relocationItemsRelations = relations(relocationItems, ({ one }) => ({
  relocation: one(relocations, {
    fields: [relocationItems.relocationId],
    references: [relocations.id],
  }),
  tenant: one(tenant, {
    fields: [relocationItems.tenantId],
    references: [tenant.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [relocationItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
  product: one(products, {
    fields: [relocationItems.productId],
    references: [products.id],
  }),
  fromBin: one(bins, {
    fields: [relocationItems.fromBinId],
    references: [bins.id],
    relationName: 'fromBin',
  }),
  toBin: one(bins, {
    fields: [relocationItems.toBinId],
    references: [bins.id],
    relationName: 'toBin',
  }),
}));

// Types
export type Relocation = typeof relocations.$inferSelect;
export type NewRelocation = typeof relocations.$inferInsert;

export type RelocationItem = typeof relocationItems.$inferSelect;
export type NewRelocationItem = typeof relocationItems.$inferInsert;
