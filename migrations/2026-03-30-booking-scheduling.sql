-- migrations/2026-03-30-booking-scheduling.sql
-- Module 7: Booking & Scheduling

-- 1. Workspace: add allow_individual_availability flag
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS allow_individual_availability BOOLEAN DEFAULT false NOT NULL;

-- 2. service_types: rename default_duration_mins → duration_minutes, add buffer_minutes + deposit_required
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_types' AND column_name = 'default_duration_mins'
  ) THEN
    ALTER TABLE service_types RENAME COLUMN default_duration_mins TO duration_minutes;
  END IF;
END $$;

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS buffer_minutes INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false NOT NULL;

-- 3. availability_patterns: per-stylist recurring weekly schedule
CREATE TABLE IF NOT EXISTS availability_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, user_id, day_of_week, effective_from)
);

ALTER TABLE availability_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace owner manages availability_patterns"
  ON availability_patterns
  FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_availability_patterns_workspace
  ON availability_patterns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_availability_patterns_user
  ON availability_patterns(workspace_id, user_id);

-- 4. availability_overrides: date-specific exceptions
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, user_id, override_date)
);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace owner manages availability_overrides"
  ON availability_overrides
  FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_availability_overrides_workspace
  ON availability_overrides(workspace_id);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_user_date
  ON availability_overrides(workspace_id, user_id, override_date);
