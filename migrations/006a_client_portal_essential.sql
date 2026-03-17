-- ============================================================
-- MIGRATION 006a: Essential Client Portal Tables
-- Run this FIRST — only creates what's needed for client auth
-- ============================================================

-- 1. Workspace additions for stylist codes
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stylist_code TEXT UNIQUE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS salon_code TEXT UNIQUE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_salon BOOLEAN DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS booking_window_days INT DEFAULT 60;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS buffer_minutes INT DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}';

-- Generate stylist codes for existing workspaces that don't have one
UPDATE workspaces SET stylist_code = upper(substring(md5(random()::text) from 1 for 6))
WHERE stylist_code IS NULL;

-- 2. client_users — links Supabase auth users to client records
CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users NOT NULL,
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_user_id, workspace_id)
);

-- 3. client_notifications — for welcome messages, updates, etc.
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

-- 4. client_invites — for booking codes / invite tokens
CREATE TABLE IF NOT EXISTS client_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients,
  token TEXT UNIQUE NOT NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. clients additions
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_stylist_id UUID REFERENCES auth.users;

-- 6. workspace_members for multi-stylist salons
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

-- ============================================================
-- RLS — only for the tables we just created
-- ============================================================

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- client_users: clients can read their own, stylists can read theirs
DO $$ BEGIN
  CREATE POLICY "client_read_own_user_record" ON client_users
    FOR SELECT USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "stylist_read_client_users" ON client_users
    FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- client_notifications: clients can read/update their own, stylists can insert
DO $$ BEGIN
  CREATE POLICY "client_read_own_notifications" ON client_notifications
    FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "client_update_own_notifications" ON client_notifications
    FOR UPDATE USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "stylist_send_notifications" ON client_notifications
    FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- client_invites: stylists manage
DO $$ BEGIN
  CREATE POLICY "stylist_manage_invites" ON client_invites
    FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workspace_members: workspace owner manages
DO $$ BEGIN
  CREATE POLICY "stylist_read_workspace_members" ON workspace_members
    FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "stylist_manage_workspace_members" ON workspace_members
    FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_users_auth ON client_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_client ON client_notifications(client_id, read_at);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

-- ============================================================
-- DONE — client auth flow should now work
-- ============================================================
