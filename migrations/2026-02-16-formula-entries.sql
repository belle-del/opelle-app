-- ============================================================================
-- Formulas Redesign: service_types + formula_entries
-- ============================================================================

-- Service types: editable list per workspace
CREATE TABLE public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Formula entries: freeform notepad entries
CREATE TABLE public.formula_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE RESTRICT,
  raw_notes TEXT NOT NULL,
  parsed_formula JSONB,
  general_notes TEXT,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_select" ON public.service_types
  FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_insert" ON public.service_types
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_update" ON public.service_types
  FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_delete" ON public.service_types
  FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "workspace_owner_select" ON public.formula_entries
  FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_insert" ON public.formula_entries
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_update" ON public.formula_entries
  FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "workspace_owner_delete" ON public.formula_entries
  FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX idx_service_types_workspace ON public.service_types(workspace_id);
CREATE INDEX idx_formula_entries_workspace ON public.formula_entries(workspace_id);
CREATE INDEX idx_formula_entries_client ON public.formula_entries(client_id);
CREATE INDEX idx_formula_entries_service_type ON public.formula_entries(service_type_id);
CREATE INDEX idx_formula_entries_client_date ON public.formula_entries(client_id, service_date DESC);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.formula_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
