-- Module 9: Team Management
-- Extends workspace_members with roles, permissions, and team metadata
-- Creates team_invites for invite-link flow

-- 1. Add new columns to workspace_members
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add CHECK constraints (use DO block to avoid errors if constraints already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wm_role_check') THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT wm_role_check CHECK (role IN ('owner','admin','instructor','stylist','student','front_desk'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wm_pay_type_check') THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT wm_pay_type_check CHECK (pay_type IN ('hourly','salary','commission','booth_rent'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wm_status_check') THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT wm_status_check CHECK (status IN ('active','inactive','pending'));
  END IF;
END $$;

-- 3. Create team_invites table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','instructor','stylist','student','front_desk')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS for team_invites
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'workspace_owner_team_invites') THEN
    CREATE POLICY "workspace_owner_team_invites" ON team_invites
      FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 5. Index for token lookups
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_workspace ON team_invites(workspace_id);
