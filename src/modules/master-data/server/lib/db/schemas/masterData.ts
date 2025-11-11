import { relations } from 'drizzle-orm';
import { boolean, decimal, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant, user } from '@server/lib/db/schema/system';

export const productTypes = pgTable('product_types', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('product_types_unique_idx').on(t.tenantId, t.name),
  ]
);

export const packageTypes = pgTable('package_types', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  unitsPerPackage: integer('units_per_package'),
  barcode: varchar('barcode', { length: 100 }),
  dimensions: varchar('dimensions', { length: 100 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('package_types_unique_idx').on(t.tenantId, t.name),
  ]
);

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  inventoryTypeId: uuid('inventory_type_id')
    .references(() => productTypes.id),
  packageTypeId: uuid('package_type_id')
    .references(() => packageTypes.id),
  sku: varchar('sku', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  minimumStockLevel: integer('minimum_stock_level'),
  reorderPoint: integer('reorder_point'),
  requiredTemperatureMin: decimal('required_temperature_min', { precision: 5, scale: 2 }),
  requiredTemperatureMax: decimal('required_temperature_max', { precision: 5, scale: 2 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: varchar('dimensions', { length: 100 }),
  active: boolean('active').default(true),
  hasExpiryDate: boolean('has_expiry_date').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('products_unique_idx').on(t.tenantId, t.sku),
  ]
);

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  taxId: varchar('tax_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('suppliers_unique_idx').on(t.tenantId, t.name),
  ]
);

export const supplierLocations = pgTable('supplier_locations', {
  id: uuid('id').primaryKey(),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  locationType: varchar('location_type', { length: 50 }).default('pickup'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  latitude: decimal('latitude', { precision: 9, scale: 6 }),
  longitude: decimal('longitude', { precision: 9, scale: 6 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  taxId: varchar('tax_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('customers_unique_idx').on(t.tenantId, t.name),
  ]
);

export const customerLocations = pgTable('customer_locations', {
  id: uuid('id').primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  locationType: varchar('location_type', { length: 50 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  latitude: decimal('latitude', { precision: 9, scale: 6 }),
  longitude: decimal('longitude', { precision: 9, scale: 6 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transporters = pgTable('transporters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 500 }),
  serviceAreas: jsonb('service_areas'),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: uuid('created_by').references(() => user.id),
  updatedBy: uuid('updated_by').references(() => user.id),
},
  (t) => [
    uniqueIndex('transporters_unique_idx').on(t.tenantId, t.code),
    index('transporters_tenant_idx').on(t.tenantId),
    index('transporters_active_idx').on(t.tenantId, t.isActive),
    index('transporters_code_idx').on(t.tenantId, t.code),
  ]
);

export const shippingMethods = pgTable('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  type: varchar('type', { 
    length: 50,
  }).notNull(),
  transporterId: uuid('transporter_id')
    .references(() => transporters.id),
  costCalculationMethod: varchar('cost_calculation_method', { 
    length: 50,
  }).notNull().default('fixed'),
  baseCost: decimal('base_cost', { precision: 15, scale: 2 }),
  estimatedDays: integer('estimated_days'),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: uuid('created_by').references(() => user.id),
  updatedBy: uuid('updated_by').references(() => user.id),
},
  (t) => ({
    uniqueIdx: uniqueIndex('shipping_methods_unique_idx').on(t.tenantId, t.code),
    tenantIdx: index('shipping_methods_tenant_idx').on(t.tenantId),
    activeIdx: index('shipping_methods_active_idx').on(t.tenantId, t.isActive),
    typeIdx: index('shipping_methods_type_idx').on(t.tenantId, t.type),
    transporterIdx: index('shipping_methods_transporter_idx').on(t.transporterId),
  })
);

export const productTypesRelations = relations(productTypes, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [productTypes.tenantId],
    references: [tenant.id],
  }),
  products: many(products),
}));

export const packageTypesRelations = relations(packageTypes, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [packageTypes.tenantId],
    references: [tenant.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenant, {
    fields: [products.tenantId],
    references: [tenant.id],
  }),
  productType: one(productTypes, {
    fields: [products.inventoryTypeId],
    references: [productTypes.id],
  }),
  packageType: one(packageTypes, {
    fields: [products.packageTypeId],
    references: [packageTypes.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [suppliers.tenantId],
    references: [tenant.id],
  }),
  locations: many(supplierLocations),
}));

export const supplierLocationsRelations = relations(supplierLocations, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierLocations.supplierId],
    references: [suppliers.id],
  }),
  tenant: one(tenant, {
    fields: [supplierLocations.tenantId],
    references: [tenant.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [customers.tenantId],
    references: [tenant.id],
  }),
  locations: many(customerLocations),
}));

export const customerLocationsRelations = relations(customerLocations, ({ one }) => ({
  customer: one(customers, {
    fields: [customerLocations.customerId],
    references: [customers.id],
  }),
  tenant: one(tenant, {
    fields: [customerLocations.tenantId],
    references: [tenant.id],
  }),
}));

export const transportersRelations = relations(transporters, ({ one }) => ({
  tenant: one(tenant, {
    fields: [transporters.tenantId],
    references: [tenant.id],
  }),
}));

export const shippingMethodsRelations = relations(shippingMethods, ({ one }) => ({
  tenant: one(tenant, {
    fields: [shippingMethods.tenantId],
    references: [tenant.id],
  }),
  transporter: one(transporters, {
    fields: [shippingMethods.transporterId],
    references: [transporters.id],
  }),
}));

export type ProductType = typeof productTypes.$inferSelect;
export type NewProductType = typeof productTypes.$inferInsert;

export type PackageType = typeof packageTypes.$inferSelect;
export type NewPackageType = typeof packageTypes.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type SupplierLocation = typeof supplierLocations.$inferSelect;
export type NewSupplierLocation = typeof supplierLocations.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type CustomerLocation = typeof customerLocations.$inferSelect;
export type NewCustomerLocation = typeof customerLocations.$inferInsert;

export type Transporter = typeof transporters.$inferSelect;
export type NewTransporter = typeof transporters.$inferInsert;

export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type NewShippingMethod = typeof shippingMethods.$inferInsert;
