-- ============================================================================
-- Module 13: Badges & Certificates — Tables, RLS, Indexes
-- ============================================================================

-- ─── Badge Definitions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  criteria_type VARCHAR(30) NOT NULL CHECK (criteria_type IN ('hours_milestone', 'service_milestone', 'category_completion', 'custom')),
  criteria_value JSONB,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_workspace_owner" ON badges
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "badges_workspace_read" ON badges
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
CREATE INDEX idx_badges_workspace ON badges(workspace_id);

-- ─── Student Badges (earned) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, student_id, badge_id)
);

ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sb_workspace_owner" ON student_badges
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "sb_student_read" ON student_badges
  FOR SELECT USING (
    student_id IN (SELECT student_id FROM floor_status WHERE workspace_id = student_badges.workspace_id)
    AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE INDEX idx_sb_workspace ON student_badges(workspace_id);
CREATE INDEX idx_sb_student ON student_badges(workspace_id, student_id);

-- ─── Certificate Templates ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  template_html TEXT,
  requirements JSONB NOT NULL DEFAULT '{"hours": 1600}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certs_workspace_owner" ON certificates
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_certs_workspace ON certificates(workspace_id);

-- ─── Student Certificates (issued) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  certificate_id UUID REFERENCES certificates(id) ON DELETE CASCADE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, student_id, certificate_id)
);

ALTER TABLE student_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_workspace_owner" ON student_certificates
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "sc_student_read" ON student_certificates
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE INDEX idx_sc_workspace ON student_certificates(workspace_id);
CREATE INDEX idx_sc_student ON student_certificates(workspace_id, student_id);
