-- ============================================================================
-- Opelle v2 - Products Table Migration
-- Color tube inventory for formula building
-- ============================================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  line TEXT,
  shade TEXT NOT NULL,
  name TEXT,
  category TEXT NOT NULL CHECK (category IN ('permanent', 'demi-permanent', 'semi-permanent', 'lightener', 'toner', 'developer', 'additive', 'other')),
  size_oz NUMERIC,
  size_grams NUMERIC,
  cost_cents INT,
  barcode TEXT,
  quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 2,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_select" ON public.products
  FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_insert" ON public.products
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_update" ON public.products
  FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_delete" ON public.products
  FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX idx_products_workspace_id ON public.products(workspace_id);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_workspace_brand ON public.products(workspace_id, brand);

-- Updated at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
