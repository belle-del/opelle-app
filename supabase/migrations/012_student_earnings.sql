-- Student earnings from checkout completions
CREATE TABLE IF NOT EXISTS student_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name VARCHAR(100) NOT NULL DEFAULT '',
  service_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_category VARCHAR(100),
  client_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner_all" ON student_earnings
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_student_earnings_workspace ON student_earnings(workspace_id);
CREATE INDEX idx_student_earnings_student ON student_earnings(workspace_id, student_id);
