-- ============================================================
-- MIGRATION: Phase 4 — Communication & Content Tables
-- Run on: 2026-03-14
-- ============================================================

-- ============================================================
-- PRE-REQUISITES
-- ============================================================

-- Rename client_users.user_id → auth_user_id (matches app code)
ALTER TABLE client_users RENAME COLUMN user_id TO auth_user_id;

-- client_notifications (dependency for delivery_log FK)
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inspo_reviewed','appointment_reminder','rebook_reminder','welcome','general')),
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_read_own_notifications" ON client_notifications
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_update_own_notifications" ON client_notifications
  FOR UPDATE USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "stylist_send_notifications" ON client_notifications
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_client_notifications_client ON client_notifications(client_id, read_at);

-- Drop conflicting pre-existing messages table (Supabase Realtime)
DROP TABLE IF EXISTS messages CASCADE;

-- ============================================================
-- PHASE 4 TABLES
-- ============================================================

-- 1. message_threads
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_stylist INT DEFAULT 0,
  unread_client INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  thread_id UUID REFERENCES message_threads NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('stylist','client')),
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. communication_preferences
CREATE TABLE IF NOT EXISTS communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  rebook_reminder_weeks INT DEFAULT 6,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, client_id)
);

-- 4. message_templates
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rebook','thank_you','welcome','follow_up','custom')),
  body_template TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. content_posts
CREATE TABLE IF NOT EXISTS content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tip','product_spotlight','seasonal')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. delivery_log
CREATE TABLE IF NOT EXISTS delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  notification_id UUID REFERENCES client_notifications,
  message_id UUID REFERENCES messages,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email','sms')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','delivered')),
  external_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_log ENABLE ROW LEVEL SECURITY;

-- message_threads
CREATE POLICY "stylist_manage_threads" ON message_threads
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_own_threads" ON message_threads
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_update_own_threads" ON message_threads
  FOR UPDATE USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));

-- messages
CREATE POLICY "stylist_manage_messages" ON messages
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_own_messages" ON messages
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM message_threads
      WHERE client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid())
    )
  );
CREATE POLICY "client_insert_own_messages" ON messages
  FOR INSERT WITH CHECK (
    sender_type = 'client' AND
    thread_id IN (
      SELECT id FROM message_threads
      WHERE client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid())
    )
  );

-- communication_preferences
CREATE POLICY "stylist_manage_comm_prefs" ON communication_preferences
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_own_comm_prefs" ON communication_preferences
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_update_own_comm_prefs" ON communication_preferences
  FOR UPDATE USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));

-- message_templates (stylist only)
CREATE POLICY "stylist_manage_templates" ON message_templates
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- content_posts
CREATE POLICY "stylist_manage_content_posts" ON content_posts
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_published_posts" ON content_posts
  FOR SELECT USING (
    published_at IS NOT NULL AND
    workspace_id IN (SELECT workspace_id FROM client_users WHERE auth_user_id = auth.uid())
  );

-- delivery_log (stylist read only)
CREATE POLICY "stylist_read_delivery_log" ON delivery_log
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_message_threads_workspace ON message_threads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_client ON message_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(workspace_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace ON messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comm_prefs_workspace ON communication_preferences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_prefs_client ON communication_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_workspace ON message_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_content_posts_workspace ON content_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_published ON content_posts(workspace_id, published_at);
CREATE INDEX IF NOT EXISTS idx_delivery_log_workspace ON delivery_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_message ON delivery_log(message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_sent ON delivery_log(workspace_id, sent_at DESC);

-- ============================================================
-- FIX PRE-EXISTING POLICIES (from 001_fresh_schema.sql)
-- These referenced user_id, now auth_user_id after column rename
-- ============================================================
DROP POLICY IF EXISTS "client_user_select_own" ON intake_responses;
DROP POLICY IF EXISTS "client_user_insert_own" ON intake_responses;
DROP POLICY IF EXISTS "client_user_select_aftercare" ON aftercare_plans;
DROP POLICY IF EXISTS "client_user_select_consents" ON consents;
DROP POLICY IF EXISTS "client_user_insert_consents" ON consents;
DROP POLICY IF EXISTS "client_user_select_rebook" ON rebook_requests;
DROP POLICY IF EXISTS "client_user_insert_rebook" ON rebook_requests;
DROP POLICY IF EXISTS "client_read_own_user_record" ON client_users;

CREATE POLICY "client_user_select_own" ON intake_responses
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_user_insert_own" ON intake_responses
  FOR INSERT WITH CHECK (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_user_select_aftercare" ON aftercare_plans
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_user_select_consents" ON consents
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_user_insert_consents" ON consents
  FOR INSERT WITH CHECK (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_user_select_rebook" ON rebook_requests
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_user_insert_rebook" ON rebook_requests
  FOR INSERT WITH CHECK (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_read_own_user_record" ON client_users
  FOR SELECT USING (auth_user_id = auth.uid());

DROP INDEX IF EXISTS idx_client_users_user_id;
CREATE INDEX IF NOT EXISTS idx_client_users_auth_user_id ON client_users(auth_user_id);
