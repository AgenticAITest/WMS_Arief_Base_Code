import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant, user } from '@server/lib/db/schema/system';

/**
 * Document Number Configuration Table
 * Defines the numbering format and rules for each document type
 */
export const documentNumberConfig = pgTable('document_number_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  
  // Document identification
  documentType: varchar('document_type', { length: 50 }).notNull(), // e.g., 'PO', 'SO', 'INV'
  documentName: varchar('document_name', { length: 255 }).notNull(), // e.g., 'Purchase Order'
  description: varchar('description', { length: 500 }),
  
  // Period format configuration
  periodFormat: varchar('period_format', { 
    length: 20, 
    enum: ['YYMM', 'YYYYMM', 'YYWW', 'YYYYWW'] 
  }).notNull().default('YYMM'), // e.g., 0125, 202501, 2553 (week 53 of 2025)
  
  // Prefix configuration (both optional)
  prefix1Label: varchar('prefix1_label', { length: 100 }), // e.g., 'Warehouse', 'Department'
  prefix1DefaultValue: varchar('prefix1_default_value', { length: 50 }), // e.g., 'WH1', 'SALES'
  prefix1Required: boolean('prefix1_required').default(false).notNull(),
  
  prefix2Label: varchar('prefix2_label', { length: 100 }), // e.g., 'Category', 'Location'
  prefix2DefaultValue: varchar('prefix2_default_value', { length: 50 }), // e.g., 'LOCAL', 'IMPORT'
  prefix2Required: boolean('prefix2_required').default(false).notNull(),
  
  // Sequence configuration
  sequenceLength: integer('sequence_length').default(4).notNull(), // e.g., 4 for '0001'
  sequencePadding: varchar('sequence_padding', { length: 1 }).default('0').notNull(),
  
  // Format configuration
  separator: varchar('separator', { length: 5 }).default('-').notNull(), // e.g., '-', '/', '_'
  
  // Example format: {type}{separator}{period}{separator}{prefix1}{separator}{prefix2}{separator}{sequence}
  // Result: PO-0125-WH1-LOCAL-0001
  
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('doc_num_config_tenant_type_idx').on(t.tenantId, t.documentType),
  ]
);

/**
 * Document Sequence Tracker Table
 * Tracks the current sequence number for each configuration and period
 */
export const documentSequenceTracker = pgTable('document_sequence_tracker', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  configId: uuid('config_id')
    .notNull()
    .references(() => documentNumberConfig.id),
  
  // Document type (denormalized for quick lookup)
  documentType: varchar('document_type', { length: 50 }).notNull(),
  
  // Period tracking
  period: varchar('period', { length: 20 }).notNull(), // e.g., '0125', '202501', '2553'
  
  // Prefix values (nullable - user may not use them)
  prefix1: varchar('prefix1', { length: 50 }), // Actual prefix value used
  prefix2: varchar('prefix2', { length: 50 }), // Actual prefix value used
  
  // Sequence tracking
  currentSequence: integer('current_sequence').default(0).notNull(),
  lastGeneratedNumber: varchar('last_generated_number', { length: 255 }), // Full formatted number
  
  lastGeneratedAt: timestamp('last_generated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    // Unique constraint: one tracker per tenant/type/period/prefix combination
    uniqueIndex('doc_seq_tracker_unique_idx').on(
      t.tenantId, 
      t.documentType, 
      t.period, 
      t.prefix1, 
      t.prefix2
    ),
  ]
);

/**
 * Document Number History Table
 * Stores all generated document numbers for audit and tracking purposes
 */
export const documentNumberHistory = pgTable('document_number_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  configId: uuid('config_id')
    .notNull()
    .references(() => documentNumberConfig.id),
  trackerId: uuid('tracker_id')
    .notNull()
    .references(() => documentSequenceTracker.id),
  
  // Document information
  documentType: varchar('document_type', { length: 50 }).notNull(),
  generatedNumber: varchar('generated_number', { length: 255 }).notNull(), // e.g., 'PO-0125-WH1-LOCAL-0001'
  
  // Components of the number
  period: varchar('period', { length: 20 }).notNull(),
  prefix1: varchar('prefix1', { length: 50 }),
  prefix2: varchar('prefix2', { length: 50 }),
  sequenceNumber: integer('sequence_number').notNull(),
  
  // Reference to actual document (if applicable)
  documentId: uuid('document_id'), // FK to the actual document table
  documentTableName: varchar('document_table_name', { length: 100 }), // e.g., 'purchase_orders'
  
  // Generation tracking
  generatedBy: uuid('generated_by'), // User who generated it
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  
  // Voiding support
  isVoided: boolean('is_voided').default(false).notNull(),
  voidedAt: timestamp('voided_at'),
  voidedBy: uuid('voided_by'),
  voidReason: varchar('void_reason', { length: 500 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('doc_num_history_number_idx').on(t.tenantId, t.generatedNumber),
  ]
);

// Relations
export const documentNumberConfigRelations = relations(documentNumberConfig, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [documentNumberConfig.tenantId],
    references: [tenant.id],
  }),
  trackers: many(documentSequenceTracker),
  history: many(documentNumberHistory),
}));

export const documentSequenceTrackerRelations = relations(documentSequenceTracker, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [documentSequenceTracker.tenantId],
    references: [tenant.id],
  }),
  config: one(documentNumberConfig, {
    fields: [documentSequenceTracker.configId],
    references: [documentNumberConfig.id],
  }),
  history: many(documentNumberHistory),
}));

export const documentNumberHistoryRelations = relations(documentNumberHistory, ({ one }) => ({
  tenant: one(tenant, {
    fields: [documentNumberHistory.tenantId],
    references: [tenant.id],
  }),
  config: one(documentNumberConfig, {
    fields: [documentNumberHistory.configId],
    references: [documentNumberConfig.id],
  }),
  tracker: one(documentSequenceTracker, {
    fields: [documentNumberHistory.trackerId],
    references: [documentSequenceTracker.id],
  }),
}));

/**
 * Generated Documents Table
 * Stores HTML documents and related files (signatures, attachments) as file references
 * Allows reprinting without regenerating or storing binary blobs in database
 */
export const generatedDocuments = pgTable('generated_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  
  // Document type - should match documentNumberConfig.documentType
  // Not enforced as FK to allow flexibility for custom document types
  documentType: varchar('document_type', { length: 50 }).notNull(), // e.g., 'purchase_order', 'sales_order', 'packing_slip'
  
  // The formatted document number (e.g., 'PO-2510-WH1-LOCAL-0001')
  documentNumber: varchar('document_number', { length: 100 }).notNull(),
  
  // Reference to source record
  referenceType: varchar('reference_type', { length: 50 }).notNull(), // e.g., 'purchase_order', 'sales_order'
  referenceId: uuid('reference_id').notNull(), // UUID of the source record
  
  // File storage metadata (JSONB for flexibility)
  // Example structure:
  // {
  //   "html": {
  //     "path": "documents/tenants/123/po/2025/PO-2510-0001.html",
  //     "size": 15234,
  //     "generated_at": "2025-10-22T10:30:00Z"
  //   },
  //   "signature": {
  //     "path": "documents/tenants/123/signatures/sig-uuid.png",
  //     "size": 8192,
  //     "signed_by": "user-uuid",
  //     "signed_at": "2025-10-22T11:00:00Z"
  //   },
  //   "attachments": [
  //     { "path": "...", "name": "invoice.pdf", "size": 12345 }
  //   ]
  // }
  files: jsonb('files').notNull(),
  
  // Version tracking for regenerations
  version: integer('version').default(1).notNull(),
  
  // Audit fields
  generatedBy: uuid('generated_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    // Index for finding all versions of a specific document
    uniqueIndex('gen_docs_ref_idx').on(t.tenantId, t.referenceType, t.referenceId),
    // Index for quick document number lookup
    uniqueIndex('gen_docs_number_idx').on(t.tenantId, t.documentNumber),
  ]
);

// Relations
export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  tenant: one(tenant, {
    fields: [generatedDocuments.tenantId],
    references: [tenant.id],
  }),
  generatedByUser: one(user, {
    fields: [generatedDocuments.generatedBy],
    references: [user.id],
  }),
}));

// Types
export type DocumentNumberConfig = typeof documentNumberConfig.$inferSelect;
export type NewDocumentNumberConfig = typeof documentNumberConfig.$inferInsert;

export type DocumentSequenceTracker = typeof documentSequenceTracker.$inferSelect;
export type NewDocumentSequenceTracker = typeof documentSequenceTracker.$inferInsert;

export type DocumentNumberHistory = typeof documentNumberHistory.$inferSelect;
export type NewDocumentNumberHistory = typeof documentNumberHistory.$inferInsert;

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert;
