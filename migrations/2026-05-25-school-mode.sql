-- ============================================================
-- Tier 1 / Slice 2: school_mode flag + formula_entries.status
-- ============================================================
-- Adds the supervision gating columns described in the August
-- Build Packet (Module 9). No UI changes here — the approval
-- workflow UI lands in a future tier. This migration only adds
-- the storage + defaults so the gating logic can run.
--
-- Re-runnable: all statements use IF NOT EXISTS / DO blocks.
-- ============================================================

-- 1. workspaces.school_mode (default false = current behavior preserved)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS school_mode BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN workspaces.school_mode IS
  'When true, students in this workspace require instructor approval on '
  'service completions (verified=false until reviewed) and formula entries '
  'are persisted as draft until reviewed. See src/lib/permissions.ts '
  '(studentRequiresSupervision) and src/lib/db/workspaces.ts (isSchoolMode).';

-- 2. formula_entries.status: 'posted' (visible to all) | 'draft' (awaiting
--    instructor review when written by a supervised student)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'formula_entries' AND column_name = 'status'
  ) THEN
    ALTER TABLE formula_entries
      ADD COLUMN status TEXT NOT NULL DEFAULT 'posted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'formula_entries_status_check'
  ) THEN
    ALTER TABLE formula_entries
      ADD CONSTRAINT formula_entries_status_check
      CHECK (status IN ('posted', 'draft'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_formula_entries_status
  ON formula_entries(workspace_id, status)
  WHERE status = 'draft';
