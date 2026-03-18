-- ============================================================================
-- Migration 007: Multi-tenant client architecture & deduplication
-- ============================================================================

-- ── 1. Add canonical_client_id to clients ──────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS canonical_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- ── 2. Add stylist_id to appointments ──────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS stylist_id UUID REFERENCES auth.users(id);

-- ── 3. Add stylist_code to workspace_members ───────────────────────────────
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS stylist_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wm_stylist_code ON workspace_members(stylist_code) WHERE stylist_code IS NOT NULL;

-- ── 4. Client-stylist assignments table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_stylist_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, client_id, stylist_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_csa_workspace ON client_stylist_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_csa_client ON client_stylist_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_csa_stylist ON client_stylist_assignments(stylist_id);
CREATE INDEX IF NOT EXISTS idx_csa_workspace_stylist ON client_stylist_assignments(workspace_id, stylist_id);

-- RLS
ALTER TABLE client_stylist_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view assignments"
  ON client_stylist_assignments FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage assignments"
  ON client_stylist_assignments FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- ── 5. Canonical client finder function ────────────────────────────────────
CREATE OR REPLACE FUNCTION find_canonical_client(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_canonical_id UUID;
BEGIN
  -- Priority 1: exact email match (strongest signal)
  IF p_email IS NOT NULL THEN
    SELECT COALESCE(canonical_client_id, id) INTO v_canonical_id
    FROM clients
    WHERE LOWER(email) = LOWER(p_email)
      AND canonical_client_id IS DISTINCT FROM id  -- skip self-referencing
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_canonical_id IS NOT NULL THEN
      RETURN v_canonical_id;
    END IF;
  END IF;

  -- Priority 2: exact phone match
  IF p_phone IS NOT NULL THEN
    SELECT COALESCE(canonical_client_id, id) INTO v_canonical_id
    FROM clients
    WHERE phone = p_phone
      AND canonical_client_id IS DISTINCT FROM id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_canonical_id IS NOT NULL THEN
      RETURN v_canonical_id;
    END IF;
  END IF;

  -- Priority 3: exact name match (first + last)
  IF p_first_name IS NOT NULL AND p_last_name IS NOT NULL THEN
    SELECT COALESCE(canonical_client_id, id) INTO v_canonical_id
    FROM clients
    WHERE LOWER(first_name) = LOWER(p_first_name)
      AND LOWER(last_name) = LOWER(p_last_name)
      AND canonical_client_id IS DISTINCT FROM id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_canonical_id IS NOT NULL THEN
      RETURN v_canonical_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- ── 6. Backfill appointments.stylist_id from workspace owner ───────────────
UPDATE appointments a
SET stylist_id = w.owner_id
FROM workspaces w
WHERE a.workspace_id = w.id
  AND a.stylist_id IS NULL;

-- ── 7. Backfill client_stylist_assignments from existing clients ───────────
INSERT INTO client_stylist_assignments (workspace_id, client_id, stylist_id, is_primary)
SELECT c.workspace_id, c.id, w.owner_id, true
FROM clients c
JOIN workspaces w ON w.id = c.workspace_id
WHERE NOT EXISTS (
  SELECT 1 FROM client_stylist_assignments csa
  WHERE csa.workspace_id = c.workspace_id
    AND csa.client_id = c.id
    AND csa.stylist_id = w.owner_id
);

-- ── 8. Dedup indexes on clients ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_canonical ON clients(canonical_client_id) WHERE canonical_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_email_lower ON clients(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_name_lower ON clients(LOWER(first_name), LOWER(last_name));
