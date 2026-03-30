-- Time entries: individual clock sessions
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',

  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  duration_minutes INTEGER,

  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON time_entries
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_time_entries_workspace ON time_entries(workspace_id);
CREATE INDEX idx_time_entries_student ON time_entries(workspace_id, student_id);

-- Hour totals: denormalized running totals per student
CREATE TABLE IF NOT EXISTS hour_totals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',

  total_hours DECIMAL(8,2) DEFAULT 0,
  verified_hours DECIMAL(8,2) DEFAULT 0,
  hours_by_category JSONB DEFAULT '{}',

  last_updated TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, student_id)
);

ALTER TABLE hour_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON hour_totals
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_hour_totals_workspace ON hour_totals(workspace_id);
