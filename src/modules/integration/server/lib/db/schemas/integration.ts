import { tenant } from '@server/lib/db/schema';
import { relations } from 'drizzle-orm';
import { boolean, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const partner = pgTable('int_partner', {
  id: uuid('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  picName: varchar('pic_name', { length: 255 }).notNull(),
  picEmail: varchar('pic_email', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20, enum: ["active", "inactive"] }).notNull().default("active"),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("partner_code_unique_idx").on(t.code, t.tenantId),
  uniqueIndex("partner_name_unique_idx").on(t.name, t.tenantId),
]);

// Partner relations  
export const partnerRelations = relations(partner, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [partner.tenantId],
    references: [tenant.id],
  }),
  // Integration inbound relation will be defined in integrationInbound.ts to avoid circular imports
}));

export const webhookEvent = pgTable('int_event', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(), // event type string like 'user.created'
  description: varchar('description', { length: 1000 }),
  isActive: boolean('is_active').notNull().default(true),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const webhookEventRelations = relations(webhookEvent, ({ one }) => ({
  tenant: one(tenant, {
    fields: [webhookEvent.tenantId],
    references: [tenant.id],
  }),
}));

export const apiKey = pgTable('int_api_key', {
  id: uuid('id').primaryKey(),
  partnerId: uuid('partner_id').notNull().references(() => partner.id),
  apiKey: varchar('api_key', { length: 128 }).notNull().unique(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20, enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("integration_api_key_unique_idx").on(t.apiKey),
]);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  partner: one(partner, {
    fields: [apiKey.partnerId],
    references: [partner.id],
  }),
}));

export const webhook = pgTable('int_webhook', {
  id: uuid('id').primaryKey(),
  partnerId: uuid('partner_id').notNull().references(() => partner.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  url: varchar('url', { length: 1000 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const webhookRelations = relations(webhook, ({ one }) => ({
  tenant: one(tenant, { fields: [webhook.tenantId], references: [tenant.id] }),
  partner: one(partner, { fields: [webhook.partnerId], references: [partner.id] }),
}));

// Type exports
export type Partner = typeof partner.$inferSelect;
export type NewPartner = typeof partner.$inferInsert;

export type WebhookEvent = typeof webhookEvent.$inferSelect;
export type NewWebhookEvent = typeof webhookEvent.$inferInsert;

export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;

export type Webhook = typeof webhook.$inferSelect;
export type NewWebhook = typeof webhook.$inferInsert;