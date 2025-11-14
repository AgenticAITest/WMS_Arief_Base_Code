-- ================================================================================
-- CYCLE COUNT & AUDIT SYSTEM
-- Migration: 001_create_cycle_count_tables.sql
-- Created: 2025-11-14
-- Description: Creates cycle_counts and cycle_count_items tables for inventory audits
-- ================================================================================

-- Main cycle count session table
CREATE TABLE IF NOT EXISTS cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES sys_tenant(id),
  count_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'created',
  count_type VARCHAR(50) DEFAULT 'partial',
  scheduled_date DATE,
  completed_date DATE,
  variance_threshold NUMERIC(5,2) DEFAULT 0.00,
  total_variance_amount NUMERIC(15,2),
  notes TEXT,
  created_by UUID REFERENCES sys_user(id),
  approved_by UUID REFERENCES sys_user(id),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT cycle_counts_tenant_count_number_unique UNIQUE (tenant_id, count_number)
);

-- Indexes for cycle_counts
CREATE INDEX IF NOT EXISTS cycle_counts_tenant_idx ON cycle_counts(tenant_id);
CREATE INDEX IF NOT EXISTS cycle_counts_status_idx ON cycle_counts(status);
CREATE INDEX IF NOT EXISTS cycle_counts_created_at_idx ON cycle_counts(created_at DESC);

-- Individual item counts
CREATE TABLE IF NOT EXISTS cycle_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_id UUID NOT NULL REFERENCES cycle_counts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES sys_tenant(id),
  product_id UUID NOT NULL REFERENCES products(id),
  bin_id UUID NOT NULL REFERENCES bins(id),
  system_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  variance_quantity INTEGER,
  variance_amount NUMERIC(15,2),
  reason_code VARCHAR(50),
  reason_description TEXT,
  counted_by UUID REFERENCES sys_user(id),
  counted_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for cycle_count_items
CREATE INDEX IF NOT EXISTS cycle_count_items_tenant_idx ON cycle_count_items(tenant_id);
CREATE INDEX IF NOT EXISTS cycle_count_items_cycle_count_idx ON cycle_count_items(cycle_count_id);
CREATE INDEX IF NOT EXISTS cycle_count_items_product_idx ON cycle_count_items(product_id);
CREATE INDEX IF NOT EXISTS cycle_count_items_bin_idx ON cycle_count_items(bin_id);

-- Comments for documentation
COMMENT ON TABLE cycle_counts IS 'Main cycle count session records for inventory audits';
COMMENT ON TABLE cycle_count_items IS 'Individual item counts per cycle count session';
COMMENT ON COLUMN cycle_counts.status IS 'Status: created, approved, rejected, completed';
COMMENT ON COLUMN cycle_counts.count_type IS 'Type: full, partial, spot';
COMMENT ON COLUMN cycle_count_items.reason_code IS 'Variance reason: Damaged, Miscount, Shrinkage, Theft, Other';
