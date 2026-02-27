-- Activity log for full audit trail
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_workspace_created
  ON public.activity_log(workspace_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members see own log"
  ON public.activity_log FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  ));

CREATE POLICY "workspace members insert own log"
  ON public.activity_log FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  ));
