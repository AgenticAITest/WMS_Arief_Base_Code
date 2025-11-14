import { pgTable, uuid, varchar, timestamp, numeric, text, date, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenant, user } from '@server/lib/db/schema/system';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';

export const cycleCounts = pgTable('cycle_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  countNumber: varchar('count_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('created'),
  countType: varchar('count_type', { length: 50 }).default('partial'),
  scheduledDate: date('scheduled_date'),
  completedDate: date('completed_date'),
  varianceThreshold: numeric('variance_threshold', { precision: 5, scale: 2 }).default('0.00'),
  totalVarianceAmount: numeric('total_variance_amount', { precision: 15, scale: 2 }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => user.id),
  approvedBy: uuid('approved_by').references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('cycle_counts_tenant_count_number_unique').on(t.tenantId, t.countNumber),
    index('cycle_counts_tenant_idx').on(t.tenantId),
    index('cycle_counts_status_idx').on(t.status),
    index('cycle_counts_created_at_idx').on(t.createdAt),
  ]
);

export const cycleCountItems = pgTable('cycle_count_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleCountId: uuid('cycle_count_id')
    .notNull()
    .references(() => cycleCounts.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  binId: uuid('bin_id')
    .notNull()
    .references(() => bins.id),
  systemQuantity: integer('system_quantity').notNull(),
  countedQuantity: integer('counted_quantity'),
  varianceQuantity: integer('variance_quantity'),
  varianceAmount: numeric('variance_amount', { precision: 15, scale: 2 }),
  reasonCode: varchar('reason_code', { length: 50 }),
  reasonDescription: text('reason_description'),
  countedBy: uuid('counted_by').references(() => user.id),
  countedAt: timestamp('counted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
},
  (t) => [
    index('cycle_count_items_tenant_idx').on(t.tenantId),
    index('cycle_count_items_cycle_count_idx').on(t.cycleCountId),
    index('cycle_count_items_product_idx').on(t.productId),
    index('cycle_count_items_bin_idx').on(t.binId),
  ]
);

// Relations
export const cycleCountsRelations = relations(cycleCounts, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [cycleCounts.tenantId],
    references: [tenant.id],
  }),
  creator: one(user, {
    fields: [cycleCounts.createdBy],
    references: [user.id],
  }),
  approver: one(user, {
    fields: [cycleCounts.approvedBy],
    references: [user.id],
  }),
  items: many(cycleCountItems),
}));

export const cycleCountItemsRelations = relations(cycleCountItems, ({ one }) => ({
  cycleCount: one(cycleCounts, {
    fields: [cycleCountItems.cycleCountId],
    references: [cycleCounts.id],
  }),
  tenant: one(tenant, {
    fields: [cycleCountItems.tenantId],
    references: [tenant.id],
  }),
  product: one(products, {
    fields: [cycleCountItems.productId],
    references: [products.id],
  }),
  bin: one(bins, {
    fields: [cycleCountItems.binId],
    references: [bins.id],
  }),
  counter: one(user, {
    fields: [cycleCountItems.countedBy],
    references: [user.id],
  }),
}));

// Types
export type CycleCount = typeof cycleCounts.$inferSelect;
export type NewCycleCount = typeof cycleCounts.$inferInsert;

export type CycleCountItem = typeof cycleCountItems.$inferSelect;
export type NewCycleCountItem = typeof cycleCountItems.$inferInsert;
