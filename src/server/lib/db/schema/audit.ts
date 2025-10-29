import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenant, user } from './system';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  
  userId: uuid('user_id')
    .references(() => user.id),
  
  module: varchar('module', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }).notNull(),
  
  changedFields: jsonb('changed_fields'),
  description: text('description'),
  
  previousState: varchar('previous_state', { length: 50 }),
  newState: varchar('new_state', { length: 50 }),
  
  batchId: uuid('batch_id'),
  
  status: varchar('status', { length: 20 }).notNull().default('success'),
  errorMessage: text('error_message'),
  
  ipAddress: varchar('ip_address', { length: 50 }),
  documentPath: text('document_path'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
(table) => [
  index('audit_logs_tenant_idx').on(table.tenantId),
  index('audit_logs_created_at_idx').on(table.createdAt.desc()),
  index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  index('audit_logs_tenant_time_idx').on(table.tenantId, table.createdAt.desc()),
]);
