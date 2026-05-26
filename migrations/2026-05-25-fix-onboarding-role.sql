-- ============================================================
-- Tier 1 / Slice 1: backfill workspace_members.role
-- ============================================================
-- Two fixes:
--   1. Demote rows where role='owner' but the user is NOT actually
--      the workspace's owner_id (these were written by the old
--      onboarding flow that hardcoded role='owner' for every signup).
--   2. Ensure every workspaces.owner_id has a matching workspace_members
--      row with role='owner' (idempotent upsert).
--
-- Re-runnable: both statements are idempotent.
-- ============================================================

-- 1. Demote misowned rows to 'student' (safe default — can be re-promoted
--    via the team UI if needed). We only touch rows where the workspace
--    member is NOT the workspace's true owner_id.
UPDATE workspace_members wm
SET role = 'student',
    updated_at = NOW()
FROM workspaces w
WHERE wm.workspace_id = w.id
  AND wm.role = 'owner'
  AND w.owner_id <> wm.user_id;

-- 2. Ensure every workspace owner has an owner-role member row.
--    Requires the (workspace_id, user_id) unique constraint on
--    workspace_members; if you hit a conflict-target error, run:
--      ALTER TABLE workspace_members
--        ADD CONSTRAINT workspace_members_workspace_user_unique
--        UNIQUE (workspace_id, user_id);
INSERT INTO workspace_members (workspace_id, user_id, role, status)
SELECT w.id, w.owner_id, 'owner', 'active'
FROM workspaces w
WHERE w.owner_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'owner',
      status = 'active',
      updated_at = NOW()
  WHERE workspace_members.role <> 'owner';
