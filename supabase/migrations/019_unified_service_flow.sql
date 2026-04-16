-- ============================================================================
-- Module 19: Unified Service Flow
-- Tables: service_sessions, service_consultations, post_service_feedback, service_tasks
-- ============================================================================

-- Service Sessions — core flow state machine
CREATE TABLE IF NOT EXISTS service_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  client_id UUID REFERENCES clients(id) NOT NULL,
  stylist_id UUID NOT NULL,
  service_name TEXT NOT NULL DEFAULT '',

  status VARCHAR(30) DEFAULT 'checked_in'
    CHECK (status IN (
      'checked_in', 'consultation', 'in_progress',
      'processing', 'needs_help', 'finishing', 'complete'
    )),

  consultation_id UUID,
  before_photo_url TEXT,
  after_photo_url TEXT,

  processing_timer_minutes INTEGER,
  processing_started_at TIMESTAMPTZ,

  help_requested BOOLEAN DEFAULT false,
  help_request_note TEXT,

  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  handed_to_checkout BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_service_sessions" ON service_sessions
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX idx_service_sessions_workspace ON service_sessions(workspace_id);
CREATE INDEX idx_service_sessions_workspace_status ON service_sessions(workspace_id, status);
CREATE INDEX idx_service_sessions_stylist ON service_sessions(workspace_id, stylist_id);
CREATE INDEX idx_service_sessions_appointment ON service_sessions(appointment_id);

-- Enable realtime for live floor updates
ALTER PUBLICATION supabase_realtime ADD TABLE service_sessions;


-- Service Consultations — structured pre-service data
CREATE TABLE IF NOT EXISTS service_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  session_id UUID REFERENCES service_sessions(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,

  current_condition VARCHAR(30)
    CHECK (current_condition IN ('excellent', 'good', 'fair', 'damaged', 'severely_damaged')),
  scalp_condition VARCHAR(30)
    CHECK (scalp_condition IN ('healthy', 'dry', 'oily', 'sensitive', 'issues')),

  service_requested TEXT,
  specific_requests TEXT,
  referenced_inspo_ids UUID[],
  stylist_notes TEXT,
  recommended_services TEXT[],
  concerns TEXT[],

  client_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_service_consultations" ON service_consultations
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX idx_service_consultations_workspace ON service_consultations(workspace_id);
CREATE INDEX idx_service_consultations_session ON service_consultations(session_id);

-- Add FK from service_sessions to service_consultations now that both exist
ALTER TABLE service_sessions
  ADD CONSTRAINT fk_service_sessions_consultation
  FOREIGN KEY (consultation_id) REFERENCES service_consultations(id);


-- Post-Service Feedback
CREATE TABLE IF NOT EXISTS post_service_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  session_id UUID REFERENCES service_sessions(id) NOT NULL,
  service_completion_id UUID REFERENCES service_completions(id),

  formula_achieved_expected BOOLEAN,
  adjustment_notes TEXT,
  client_satisfaction INTEGER CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
  any_reactions BOOLEAN DEFAULT false,
  reaction_notes TEXT,
  actual_processing_time INTEGER,
  processing_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_service_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_post_service_feedback" ON post_service_feedback
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX idx_post_service_feedback_workspace ON post_service_feedback(workspace_id);
CREATE INDEX idx_post_service_feedback_session ON post_service_feedback(session_id);


-- Service Tasks — assignable tasks linked to service sessions
CREATE TABLE IF NOT EXISTS service_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  session_id UUID REFERENCES service_sessions(id),

  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,

  task_type VARCHAR(50) NOT NULL DEFAULT 'custom'
    CHECK (task_type IN (
      'mix_color', 'check_processing', 'get_supplies',
      'rinse', 'blowdry', 'restock', 'shampoo', 'prep_station', 'custom'
    )),
  description TEXT,
  due_in_minutes INTEGER,
  due_at TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_all_service_tasks" ON service_tasks
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX idx_service_tasks_workspace ON service_tasks(workspace_id);
CREATE INDEX idx_service_tasks_assigned_to ON service_tasks(workspace_id, assigned_to);
CREATE INDEX idx_service_tasks_session ON service_tasks(session_id);
CREATE INDEX idx_service_tasks_status ON service_tasks(workspace_id, status);

-- Enable realtime for task updates
ALTER PUBLICATION supabase_realtime ADD TABLE service_tasks;
