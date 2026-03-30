-- Floor status tracking for clinic floor view
-- Tracks student status: clocked_out, available, with_client, on_break

CREATE TABLE IF NOT EXISTS floor_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',

  status VARCHAR(20) DEFAULT 'clocked_out'
    CHECK (status IN ('clocked_out', 'available', 'with_client', 'on_break')),

  current_client_id UUID REFERENCES clients(id),
  current_service VARCHAR(100),

  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  clocked_in_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, student_id)
);

-- RLS
ALTER TABLE floor_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_select" ON floor_status
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "workspace_owner_all" ON floor_status
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Index
CREATE INDEX idx_floor_status_workspace ON floor_status(workspace_id);
CREATE INDEX idx_floor_status_student ON floor_status(workspace_id, student_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE floor_status;
