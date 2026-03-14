-- ============================================================
-- MIGRATION 006: Client Portal Full Schema
-- ============================================================

-- 1. Workspace additions for stylist codes and multi-stylist support
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stylist_code TEXT UNIQUE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS salon_code TEXT UNIQUE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_salon BOOLEAN DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS booking_window_days INT DEFAULT 60;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS buffer_minutes INT DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}';

-- Generate stylist codes for existing workspaces
UPDATE workspaces SET stylist_code = upper(substring(md5(random()::text) from 1 for 6))
WHERE stylist_code IS NULL;

-- 2. workspace_members for multi-stylist salons
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT DEFAULT 'stylist',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Seed existing workspace owners as members
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner' FROM workspaces
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 3. clients additions
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_stylist_id UUID REFERENCES auth.users;

-- 4. Activate client_invites (already exists, ensure columns)
ALTER TABLE client_invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 5. service_types booking configuration
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'request';

-- 6. products client order flag
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_for_client_order BOOLEAN DEFAULT false;

-- 7. formula_entries client sharing
ALTER TABLE formula_entries ADD COLUMN IF NOT EXISTS share_with_client BOOLEAN DEFAULT false;

-- 8. New: inspo_submissions
CREATE TABLE IF NOT EXISTS inspo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  client_notes TEXT,
  ai_analysis JSONB,
  stylist_flag TEXT,
  feasibility TEXT,
  client_summary TEXT,
  requires_consult BOOLEAN DEFAULT false,
  reviewed_by_stylist BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. New: inspo_demand_signals (Metis pipeline — store now, use later)
CREATE TABLE IF NOT EXISTS inspo_demand_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  inspo_submission_id UUID REFERENCES inspo_submissions NOT NULL,
  direction TEXT NOT NULL,
  product_hint TEXT,
  confidence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. New: product_order_requests
CREATE TABLE IF NOT EXISTS product_order_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  items JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  client_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. New: client_notifications
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspo_demand_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Also enable on scaffolded tables that weren't previously activated
ALTER TABLE client_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aftercare_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebook_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- workspace_members
CREATE POLICY "stylist_read_workspace_members" ON workspace_members
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "stylist_manage_workspace_members" ON workspace_members
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- client_invites
CREATE POLICY "stylist_manage_invites" ON client_invites
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- client_users
CREATE POLICY "client_read_own_user_record" ON client_users
  FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "stylist_read_client_users" ON client_users
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- intake_responses
CREATE POLICY "client_manage_own_intake" ON intake_responses
  FOR ALL USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "stylist_read_intake" ON intake_responses
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- aftercare_plans
CREATE POLICY "client_read_published_aftercare" ON aftercare_plans
  FOR SELECT USING (
    published_at IS NOT NULL AND
    client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "stylist_manage_aftercare" ON aftercare_plans
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- consents
CREATE POLICY "client_manage_own_consents" ON consents
  FOR ALL USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "stylist_manage_consents" ON consents
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- rebook_requests
CREATE POLICY "client_manage_own_rebook" ON rebook_requests
  FOR ALL USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "stylist_manage_rebook" ON rebook_requests
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- photos
CREATE POLICY "client_read_shared_photos" ON photos
  FOR SELECT USING (
    shared_with_client = true AND
    client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "stylist_manage_photos" ON photos
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- inspo_submissions
CREATE POLICY "client_manage_own_inspo" ON inspo_submissions
  FOR ALL USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "stylist_manage_inspo" ON inspo_submissions
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- inspo_demand_signals (stylist + system only — client never reads this directly)
CREATE POLICY "stylist_read_demand_signals" ON inspo_demand_signals
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- product_order_requests
CREATE POLICY "client_manage_own_orders" ON product_order_requests
  FOR ALL USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "stylist_manage_orders" ON product_order_requests
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- client_notifications
CREATE POLICY "client_read_own_notifications" ON client_notifications
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_update_own_notifications" ON client_notifications
  FOR UPDATE USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "stylist_send_notifications" ON client_notifications
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inspo_submissions_workspace ON inspo_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inspo_submissions_client ON inspo_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_inspo_submissions_reviewed ON inspo_submissions(workspace_id, reviewed_by_stylist);
CREATE INDEX IF NOT EXISTS idx_demand_signals_workspace ON inspo_demand_signals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_demand_signals_submission ON inspo_demand_signals(inspo_submission_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_workspace ON product_order_requests(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_client_notifications_client ON client_notifications(client_id, read_at);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
