-- Stores pending join data server-side so it survives magic link redirect
-- (cookies get lost when magic link opens in a different browser context)
CREATE TABLE IF NOT EXISTS pending_client_joins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces NOT NULL,
  stylist_id UUID REFERENCES auth.users,
  first_name TEXT NOT NULL,
  last_name TEXT,
  invite_id UUID,
  existing_client_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_joins_email ON pending_client_joins(email, used_at);

-- No RLS needed — only accessed via admin client
ALTER TABLE pending_client_joins ENABLE ROW LEVEL SECURITY;
