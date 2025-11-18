-- Create adjustments table
CREATE TABLE IF NOT EXISTS adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES sys_tenant(id),
  adjustment_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'created',
  type VARCHAR(20) NOT NULL DEFAULT 'regular',
  cycle_count_id UUID REFERENCES cycle_counts(id),
  notes TEXT,
  created_by UUID REFERENCES sys_user(id),
  approved_by UUID REFERENCES sys_user(id),
  applied_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create unique index on tenant_id and adjustment_number
CREATE UNIQUE INDEX IF NOT EXISTS adjustments_tenant_adjustment_number_unique 
  ON adjustments(tenant_id, adjustment_number);

-- Create indexes
CREATE INDEX IF NOT EXISTS adjustments_tenant_idx ON adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS adjustments_status_idx ON adjustments(status);
CREATE INDEX IF NOT EXISTS adjustments_created_at_idx ON adjustments(created_at);
CREATE INDEX IF NOT EXISTS adjustments_cycle_count_idx ON adjustments(cycle_count_id);

-- Create adjustment_items table
CREATE TABLE IF NOT EXISTS adjustment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES sys_tenant(id),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  quantity_difference INTEGER NOT NULL,
  reason_code VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for adjustment_items
CREATE INDEX IF NOT EXISTS adjustment_items_tenant_idx ON adjustment_items(tenant_id);
CREATE INDEX IF NOT EXISTS adjustment_items_adjustment_idx ON adjustment_items(adjustment_id);
CREATE INDEX IF NOT EXISTS adjustment_items_inventory_item_idx ON adjustment_items(inventory_item_id);

-- Add comments for documentation
COMMENT ON TABLE adjustments IS 'Inventory adjustment records for stock corrections';
COMMENT ON TABLE adjustment_items IS 'Individual line items for inventory adjustments';
COMMENT ON COLUMN adjustments.type IS 'Type of adjustment: regular or cycle_count';
COMMENT ON COLUMN adjustments.status IS 'Status: created, submitted, approved, rejected, applied';
COMMENT ON COLUMN adjustment_items.quantity_difference IS 'Calculated as new_quantity - old_quantity';
