-- Onboarding: user_profiles table
-- Tracks onboarding completion and user type for routing

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(30) DEFAULT NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- Backfill: mark existing workspace owners as onboarded
INSERT INTO user_profiles (user_id, user_type, onboarding_completed)
SELECT w.owner_id, 'practitioner', true
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = w.owner_id
);

-- Backfill: mark existing workspace members as onboarded
INSERT INTO user_profiles (user_id, user_type, onboarding_completed)
SELECT wm.user_id,
  CASE wm.role
    WHEN 'student' THEN 'student'
    WHEN 'instructor' THEN 'practitioner'
    ELSE 'practitioner'
  END,
  true
FROM workspace_members wm
WHERE wm.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = wm.user_id
  );

-- Index for fast middleware lookups
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
