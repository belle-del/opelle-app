-- migrations/2026-03-30-inventory-management.sql

-- 1. Evolve products table with inventory-specific columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20) DEFAULT 'pieces',
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS reorder_quantity DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true NOT NULL;

-- 2. Stock movements — immutable audit trail
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  movement_type VARCHAR(30) NOT NULL,
  -- 'service_deduct' | 'manual_adjust' | 'received' | 'waste' | 'return'
  quantity_change DECIMAL(10,2) NOT NULL,
  previous_stock DECIMAL(10,2) NOT NULL,
  new_stock DECIMAL(10,2) NOT NULL,
  service_completion_id UUID REFERENCES service_completions(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_stock_movements" ON stock_movements
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 3. Service product usage templates
CREATE TABLE IF NOT EXISTS service_product_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  service_category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  estimated_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  is_required BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(workspace_id, service_category_id, product_id)
);

ALTER TABLE service_product_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_service_product_usage" ON service_product_usage
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 4. Stock alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  alert_type VARCHAR(30) NOT NULL,
  -- 'low_stock' | 'out_of_stock'
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID
);

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_stock_alerts" ON stock_alerts
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Index for fast alert lookups
CREATE INDEX IF NOT EXISTS idx_stock_alerts_workspace_product
  ON stock_alerts(workspace_id, product_id)
  WHERE acknowledged_at IS NULL;

-- Index for movement history
CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON stock_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_workspace
  ON stock_movements(workspace_id);

CREATE INDEX IF NOT EXISTS idx_service_product_usage_workspace
  ON service_product_usage(workspace_id);
