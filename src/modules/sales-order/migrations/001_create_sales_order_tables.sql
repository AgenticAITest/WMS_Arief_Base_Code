-- Sales Order Module - Database Migration
-- Creates 9 tables for complete order-to-delivery workflow
-- Generated: October 31, 2025

-- 1. Transporters Table (Third-party shipping carriers)
CREATE TABLE IF NOT EXISTS transporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    service_areas JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_transporters_tenant ON transporters(tenant_id);
CREATE INDEX idx_transporters_active ON transporters(tenant_id, is_active);
CREATE INDEX idx_transporters_code ON transporters(tenant_id, code);

-- 2. Shipping Methods Table
CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('internal', 'third_party')),
    transporter_id UUID REFERENCES transporters(id) ON DELETE SET NULL,
    cost_calculation_method VARCHAR(50) NOT NULL DEFAULT 'fixed' CHECK (cost_calculation_method IN ('fixed', 'weight_based', 'volume_based', 'distance_based')),
    base_cost NUMERIC(15, 2),
    estimated_days INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    UNIQUE(tenant_id, code),
    CHECK (
        (type = 'internal' AND transporter_id IS NULL) OR
        (type = 'third_party' AND transporter_id IS NOT NULL)
    )
);

CREATE INDEX idx_shipping_methods_tenant ON shipping_methods(tenant_id);
CREATE INDEX idx_shipping_methods_active ON shipping_methods(tenant_id, is_active);
CREATE INDEX idx_shipping_methods_type ON shipping_methods(tenant_id, type);
CREATE INDEX idx_shipping_methods_transporter ON shipping_methods(transporter_id);

-- 3. Sales Orders Table
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_location_id UUID REFERENCES customer_locations(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'allocated', 'picking', 'picked', 'shipped', 'delivered', 'cancelled')),
    workflow_state VARCHAR(50),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_terms VARCHAR(100),
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    UNIQUE(tenant_id, order_number)
);

CREATE INDEX idx_sales_orders_tenant ON sales_orders(tenant_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_warehouse ON sales_orders(warehouse_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(tenant_id, status);
CREATE INDEX idx_sales_orders_date ON sales_orders(tenant_id, order_date);
CREATE INDEX idx_sales_orders_number ON sales_orders(tenant_id, order_number);

-- 4. Sales Order Items Table
CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 3) NOT NULL,
    allocated_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    picked_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    shipped_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0,
    tax_percentage NUMERIC(5, 2) DEFAULT 0,
    line_total NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, sales_order_id, line_number)
);

CREATE INDEX idx_sales_order_items_tenant ON sales_order_items(tenant_id);
CREATE INDEX idx_sales_order_items_order ON sales_order_items(sales_order_id);
CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);

-- 5. Sales Order Allocations Table
CREATE TABLE IF NOT EXISTS sales_order_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    allocated_quantity NUMERIC(15, 3) NOT NULL,
    allocation_date TIMESTAMP NOT NULL DEFAULT NOW(),
    allocated_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_order_allocations_tenant ON sales_order_allocations(tenant_id);
CREATE INDEX idx_sales_order_allocations_item ON sales_order_allocations(sales_order_item_id);
CREATE INDEX idx_sales_order_allocations_inventory ON sales_order_allocations(inventory_item_id);

-- 6. Sales Order Picks Table
CREATE TABLE IF NOT EXISTS sales_order_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    picked_quantity NUMERIC(15, 3) NOT NULL,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    pick_date TIMESTAMP NOT NULL DEFAULT NOW(),
    picked_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_order_picks_tenant ON sales_order_picks(tenant_id);
CREATE INDEX idx_sales_order_picks_item ON sales_order_picks(sales_order_item_id);
CREATE INDEX idx_sales_order_picks_inventory ON sales_order_picks(inventory_item_id);
CREATE INDEX idx_sales_order_picks_batch ON sales_order_picks(batch_number);
CREATE INDEX idx_sales_order_picks_lot ON sales_order_picks(lot_number);
CREATE INDEX idx_sales_order_picks_serial ON sales_order_picks(serial_number);

-- 7. Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    shipment_number VARCHAR(100) NOT NULL,
    shipping_method_id UUID REFERENCES shipping_methods(id) ON DELETE SET NULL,
    shipment_date TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    tracking_number VARCHAR(255),
    carrier_name VARCHAR(255),
    total_weight NUMERIC(15, 3),
    total_volume NUMERIC(15, 3),
    shipping_cost NUMERIC(15, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
    shipment_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    UNIQUE(tenant_id, sales_order_id),
    UNIQUE(tenant_id, shipment_number)
);

CREATE INDEX idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX idx_shipments_order ON shipments(sales_order_id);
CREATE INDEX idx_shipments_status ON shipments(tenant_id, status);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_number ON shipments(tenant_id, shipment_number);

-- 8. Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    package_number VARCHAR(100) NOT NULL,
    barcode VARCHAR(255),
    weight NUMERIC(15, 3),
    length NUMERIC(15, 2),
    width NUMERIC(15, 2),
    height NUMERIC(15, 2),
    volume NUMERIC(15, 3),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, shipment_id, package_number)
);

CREATE INDEX idx_packages_tenant ON packages(tenant_id);
CREATE INDEX idx_packages_shipment ON packages(shipment_id);
CREATE INDEX idx_packages_barcode ON packages(barcode);

-- 9. Package Items Table
CREATE TABLE IF NOT EXISTS package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 3) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_package_items_tenant ON package_items(tenant_id);
CREATE INDEX idx_package_items_package ON package_items(package_id);
CREATE INDEX idx_package_items_product ON package_items(product_id);

-- Migration Complete
-- Total tables created: 9
-- Total indexes created: 30+
