import { pgTable, uuid, varchar, timestamp, text, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenant, user } from '@server/lib/db/schema/system';
import { cycleCounts } from './cycleCount';
import { inventoryItems } from './inventoryItems';

export const adjustments = pgTable('adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  adjustmentNumber: varchar('adjustment_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('created'),
  type: varchar('type', { length: 20 }).notNull().default('regular'),
  cycleCountId: uuid('cycle_count_id')
    .references(() => cycleCounts.id),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => user.id),
  approvedBy: uuid('approved_by').references(() => user.id),
  appliedAt: timestamp('applied_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('adjustments_tenant_adjustment_number_unique').on(t.tenantId, t.adjustmentNumber),
    index('adjustments_tenant_idx').on(t.tenantId),
    index('adjustments_status_idx').on(t.status),
    index('adjustments_created_at_idx').on(t.createdAt),
    index('adjustments_cycle_count_idx').on(t.cycleCountId),
  ]
);

export const adjustmentItems = pgTable('adjustment_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  adjustmentId: uuid('adjustment_id')
    .notNull()
    .references(() => adjustments.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  inventoryItemId: uuid('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id),
  oldQuantity: integer('old_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  quantityDifference: integer('quantity_difference').notNull(),
  reasonCode: varchar('reason_code', { length: 50 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
},
  (t) => [
    index('adjustment_items_tenant_idx').on(t.tenantId),
    index('adjustment_items_adjustment_idx').on(t.adjustmentId),
    index('adjustment_items_inventory_item_idx').on(t.inventoryItemId),
  ]
);

// Relations
export const adjustmentsRelations = relations(adjustments, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [adjustments.tenantId],
    references: [tenant.id],
  }),
  creator: one(user, {
    fields: [adjustments.createdBy],
    references: [user.id],
  }),
  approver: one(user, {
    fields: [adjustments.approvedBy],
    references: [user.id],
  }),
  cycleCount: one(cycleCounts, {
    fields: [adjustments.cycleCountId],
    references: [cycleCounts.id],
  }),
  items: many(adjustmentItems),
}));

export const adjustmentItemsRelations = relations(adjustmentItems, ({ one }) => ({
  adjustment: one(adjustments, {
    fields: [adjustmentItems.adjustmentId],
    references: [adjustments.id],
  }),
  tenant: one(tenant, {
    fields: [adjustmentItems.tenantId],
    references: [tenant.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [adjustmentItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

// Types
export type Adjustment = typeof adjustments.$inferSelect;
export type NewAdjustment = typeof adjustments.$inferInsert;

export type AdjustmentItem = typeof adjustmentItems.$inferSelect;
export type NewAdjustmentItem = typeof adjustmentItems.$inferInsert;
