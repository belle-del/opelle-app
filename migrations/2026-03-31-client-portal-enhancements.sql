-- =============================================================================
-- Module 8 Client Portal Enhancements
-- Build Bible: Module 8.3 (Formula History), 8.4 (Consent/Portability), Rule 9
-- Date: 2026-03-31
-- =============================================================================

-- =============================================================================
-- STEP 1: service_completions — add before/after photo columns
-- Rule 9, Step 4: Photos captured at service completion, stored on the record
-- =============================================================================

ALTER TABLE service_completions
  ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS after_photo_url  TEXT;


-- =============================================================================
-- STEP 2: service_categories — add requires_photos flag
-- All chemical services (color, highlight, perm, straightening) require photos.
-- Flag is workspace-agnostic at seed time; seeded rows use codes set by
-- /api/services/categories/seed. Workspace-custom categories default false.
-- =============================================================================

ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS requires_photos BOOLEAN NOT NULL DEFAULT false;

-- Flip the flag for every existing chemical-service category
UPDATE service_categories
SET    requires_photos = true
WHERE  code IN ('color', 'highlight', 'perm', 'straightening');


-- =============================================================================
-- STEP 3: formula_history — new table (Build Bible Module 8.3 data model)
-- Linked to service_completions, carries before/after photos and sharing level.
-- This is separate from formula_entries (working formula log). formula_history
-- is the canonical, client-facing record created at service completion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS formula_history (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id             UUID        NOT NULL REFERENCES clients(id)    ON DELETE CASCADE,
  service_completion_id UUID        REFERENCES service_completions(id) ON DELETE SET NULL,

  -- The structured formula (mirrors ParsedFormula shape from formula_entries)
  formula               JSONB       NOT NULL DEFAULT '{}',

  -- Before/after photos — duplicated from service_completion for direct access
  -- without a join when rendering the client portal or formula timeline
  before_photo_url      TEXT,
  after_photo_url       TEXT,

  -- Post-service notes
  stylist_notes         TEXT,
  result_notes          TEXT,
  client_satisfaction   SMALLINT    CHECK (client_satisfaction BETWEEN 1 AND 5),

  -- Consent/portability (Module 8.4)
  -- 'private'        → only this workspace sees formula details
  -- 'client_visible' → client sees it in their portal, other stylists don't
  -- 'portable'       → follows client to any Opelle stylist (Phase 2 network)
  sharing_level         VARCHAR(20) NOT NULL DEFAULT 'private'
                        CHECK (sharing_level IN ('private', 'client_visible', 'portable')),

  -- AI learning: link to kernel feedback for Metis training loop
  kernel_feedback_id    UUID,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE formula_history ENABLE ROW LEVEL SECURITY;

-- Workspace owner: full CRUD on their own workspace's formula history
CREATE POLICY "fh_workspace_owner_all"
  ON formula_history
  FOR ALL
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));

-- Authenticated client users: SELECT only where sharing_level allows them to see it
-- client_users links auth.users → clients; check that the formula belongs to their client_id
CREATE POLICY "fh_client_sees_shared"
  ON formula_history
  FOR SELECT
  USING (
    sharing_level IN ('client_visible', 'portable')
    AND client_id IN (
      SELECT cu.client_id
      FROM   client_users cu
      WHERE  cu.auth_user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_formula_history_workspace   ON formula_history (workspace_id);
CREATE INDEX IF NOT EXISTS idx_formula_history_client      ON formula_history (client_id);
CREATE INDEX IF NOT EXISTS idx_formula_history_completion  ON formula_history (service_completion_id);
CREATE INDEX IF NOT EXISTS idx_formula_history_sharing     ON formula_history (sharing_level);


-- =============================================================================
-- STEP 4: workspaces — default_formula_sharing
-- No team_members table exists; the workspace owner IS the stylist.
-- Stylist sets their workspace-level default; overridden per formula_history row.
-- =============================================================================

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS default_formula_sharing VARCHAR(20) NOT NULL DEFAULT 'private'
  CHECK (default_formula_sharing IN ('private', 'client_visible', 'portable'));


-- =============================================================================
-- STEP 5: service_completions RLS — clients can read their own completion records
-- The workspace_owner_all policy already covers stylists/owners.
-- Add a separate SELECT policy so client portal endpoints can read photo URLs.
-- =============================================================================

-- Only add if it doesn't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  tablename  = 'service_completions'
    AND    policyname = 'sc_client_sees_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "sc_client_sees_own"
        ON service_completions
        FOR SELECT
        USING (
          client_id IN (
            SELECT cu.client_id
            FROM   client_users cu
            WHERE  cu.auth_user_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END
$$;
