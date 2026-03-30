-- Service categories (curriculum requirements per workspace)
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  required_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON service_categories
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_service_categories_workspace ON service_categories(workspace_id);

-- Individual service completions
CREATE TABLE IF NOT EXISTS service_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',
  category_id UUID REFERENCES service_categories(id) NOT NULL,
  client_id UUID REFERENCES clients(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  time_entry_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON service_completions
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_service_completions_workspace ON service_completions(workspace_id);
CREATE INDEX idx_service_completions_student ON service_completions(workspace_id, student_id);

-- Curriculum progress (denormalized summary)
CREATE TABLE IF NOT EXISTS curriculum_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  category_id UUID REFERENCES service_categories(id) NOT NULL,
  completed_count INTEGER DEFAULT 0,
  verified_count INTEGER DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  UNIQUE(workspace_id, student_id, category_id)
);

ALTER TABLE curriculum_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON curriculum_progress
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_curriculum_progress_workspace ON curriculum_progress(workspace_id);
