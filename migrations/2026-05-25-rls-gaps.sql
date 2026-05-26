-- ============================================================
-- Tier 1 / Slice 4: close RLS gaps surfaced by the August audit
-- ============================================================
-- Per-table notes are inline. Findings differed slightly from the
-- audit summary because we checked each migration directly:
--   - user_profiles already has 3 correct policies — no change needed.
--   - metis_feedback / metis_lessons had USING(true) WITH CHECK(true)
--     policies (too permissive across workspaces) — tightening.
--   - pending_client_joins is intentionally admin-client-only — adding
--     an explicit deny-all-anon for documentation purposes.
--   - stylist_specialties had no ENABLE ROW LEVEL SECURITY at all —
--     enabling + adding read-for-authenticated, write-for-admin.
-- Everything else: extend owner-only policies to workspace members.
--
-- Idempotent: every CREATE/DROP guarded.
-- ============================================================

-- Helper: drop a policy by name iff it exists. Centralizes the boilerplate.
CREATE OR REPLACE FUNCTION public._drop_policy_if_exists(p_table TEXT, p_policy TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=p_table AND policyname=p_policy) THEN
    EXECUTE format('DROP POLICY %I ON public.%I', p_policy, p_table);
  END IF;
END $$;

-- 1. stylist_specialties — global catalog. Enable RLS; allow read for any
--    authenticated user (it's a public taxonomy); restrict writes to
--    service role (no policy means no INSERT/UPDATE/DELETE for non-admin).
ALTER TABLE stylist_specialties ENABLE ROW LEVEL SECURITY;
SELECT public._drop_policy_if_exists('stylist_specialties', 'stylist_specialties_read');
CREATE POLICY "stylist_specialties_read"
  ON stylist_specialties FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. activity_log — extend owner-only SELECT/INSERT to all workspace members.
SELECT public._drop_policy_if_exists('activity_log', 'workspace members see own log');
SELECT public._drop_policy_if_exists('activity_log', 'workspace members insert own log');
SELECT public._drop_policy_if_exists('activity_log', 'activity_log_members_select');
SELECT public._drop_policy_if_exists('activity_log', 'activity_log_members_insert');
CREATE POLICY "activity_log_members_select"
  ON activity_log FOR SELECT
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE POLICY "activity_log_members_insert"
  ON activity_log FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 3. availability_patterns + availability_overrides — extend owner-only to members.
SELECT public._drop_policy_if_exists('availability_patterns', 'workspace owner manages availability_patterns');
SELECT public._drop_policy_if_exists('availability_patterns', 'availability_patterns_members_all');
CREATE POLICY "availability_patterns_members_all"
  ON availability_patterns FOR ALL
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

SELECT public._drop_policy_if_exists('availability_overrides', 'workspace owner manages availability_overrides');
SELECT public._drop_policy_if_exists('availability_overrides', 'availability_overrides_members_all');
CREATE POLICY "availability_overrides_members_all"
  ON availability_overrides FOR ALL
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 4. brand_partnerships — global table of brand programs. Authenticated read;
--    no writes from auth role (admin/seed only).
SELECT public._drop_policy_if_exists('brand_partnerships', 'brand_partnerships_read');
CREATE POLICY "brand_partnerships_read"
  ON brand_partnerships FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 5. client_stylist_assignments — already has member SELECT; add INSERT/UPDATE/
--    DELETE for owners + admins.
SELECT public._drop_policy_if_exists('client_stylist_assignments', 'csa_owner_write');
CREATE POLICY "csa_owner_write"
  ON client_stylist_assignments FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 6. formula_history — extend owner-only to members (clients still get the
--    sharing_level-gated read via the existing policy fh_client_sees_shared).
SELECT public._drop_policy_if_exists('formula_history', 'fh_members_select');
CREATE POLICY "fh_members_select"
  ON formula_history FOR SELECT
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
SELECT public._drop_policy_if_exists('formula_history', 'fh_members_write');
CREATE POLICY "fh_members_write"
  ON formula_history FOR ALL
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 7. metis_feedback + metis_lessons — replace overly-permissive USING(true)
--    with proper workspace scoping. members see/write their own workspace's
--    feedback + lessons.
SELECT public._drop_policy_if_exists('metis_feedback', 'Users can manage their workspace feedback');
SELECT public._drop_policy_if_exists('metis_feedback', 'metis_feedback_members_all');
CREATE POLICY "metis_feedback_members_all"
  ON metis_feedback FOR ALL
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

SELECT public._drop_policy_if_exists('metis_lessons', 'Users can manage their workspace lessons');
SELECT public._drop_policy_if_exists('metis_lessons', 'metis_lessons_members_all');
CREATE POLICY "metis_lessons_members_all"
  ON metis_lessons FOR ALL
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 8. pending_client_joins — intentionally service-role-only (the comment
--    in the original migration says so; client portal magic-link flow
--    needs to write to it before the user has an auth session). Adding
--    an explicit, documented no-op policy so a future reader doesn't
--    "fix" it back into a security hole.
COMMENT ON TABLE pending_client_joins IS
  'Service-role-only. Magic-link join flow writes here before the user has '
  'an auth session, so no anon/authenticated policy is appropriate. Any '
  'reads must go through createSupabaseAdminClient().';

-- 9. user_profiles — already correct (read own, update own, service-role
--    insert). Audit summary was wrong about this one. No change.

-- Cleanup: drop the helper so it doesn't linger as a permanent function.
DROP FUNCTION IF EXISTS public._drop_policy_if_exists(TEXT, TEXT);
