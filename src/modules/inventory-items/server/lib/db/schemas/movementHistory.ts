import { pgTable, uuid, varchar, timestamp, text, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenant, user } from '@server/lib/db/schema/system';
import { inventoryItems } from './inventoryItems';
import { bins } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';

export const movementHistory = pgTable('movement_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  inventoryItemId: uuid('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id),
  binId: uuid('bin_id')
    .notNull()
    .references(() => bins.id),
  quantityChanged: integer('quantity_changed').notNull(),
  movementType: varchar('movement_type', { length: 50 }).notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  referenceNumber: varchar('reference_number', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
  (t) => [
    index('idx_movement_history_tenant').on(t.tenantId),
    index('idx_movement_history_inventory_item').on(t.inventoryItemId),
    index('idx_movement_history_bin').on(t.binId),
    index('idx_movement_history_type').on(t.movementType),
    index('idx_movement_history_created').on(t.createdAt),
  ]
);

// Relations
export const movementHistoryRelations = relations(movementHistory, ({ one }) => ({
  tenant: one(tenant, {
    fields: [movementHistory.tenantId],
    references: [tenant.id],
  }),
  user: one(user, {
    fields: [movementHistory.userId],
    references: [user.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [movementHistory.inventoryItemId],
    references: [inventoryItems.id],
  }),
  bin: one(bins, {
    fields: [movementHistory.binId],
    references: [bins.id],
  }),
}));

// Types
export type MovementHistory = typeof movementHistory.$inferSelect;
export type NewMovementHistory = typeof movementHistory.$inferInsert;
