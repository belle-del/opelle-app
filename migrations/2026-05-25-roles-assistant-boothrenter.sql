-- ============================================================
-- Tier 1 / Slice 3: add assistant + booth_renter roles + RLS
-- ============================================================
-- 1. Expand the role CHECK constraints on workspace_members and
--    team_invites to admit the two new roles.
-- 2. Add owner_user_id to products / stock_movements / stock_alerts so a
--    booth_renter's inventory can be isolated from the host salon.
-- 3. Add a RESTRICTIVE RLS policy on each of those three tables that
--    fires ONLY when the calling user is a booth_renter — leaving the
--    existing owner/member access patterns untouched for everyone else.
--
-- Re-runnable.
-- ============================================================

-- 1. Expand role CHECK constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wm_role_check') THEN
    ALTER TABLE workspace_members DROP CONSTRAINT wm_role_check;
  END IF;
  ALTER TABLE workspace_members
    ADD CONSTRAINT wm_role_check
    CHECK (role IN ('owner','admin','instructor','stylist','student','front_desk','assistant','booth_renter'));
END $$;

DO $$
DECLARE c_name TEXT;
BEGIN
  -- team_invites uses an inline CHECK without a known name; find and drop it
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'team_invites'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%CHECK%(role%IN%';
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE team_invites DROP CONSTRAINT %I', c_name);
  END IF;
  -- (re)add with the expanded list
  ALTER TABLE team_invites
    ADD CONSTRAINT team_invites_role_check
    CHECK (role IN ('admin','instructor','stylist','student','front_desk','assistant','booth_renter'));
EXCEPTION WHEN duplicate_object THEN
  -- constraint already exists with the new shape — fine
  NULL;
END $$;

-- 2. owner_user_id columns on inventory tables
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE stock_alerts
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_owner_user
  ON products(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_owner_user
  ON stock_movements(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_owner_user
  ON stock_alerts(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- 3. Helper function: is the calling user a booth_renter in this workspace?
--    SECURITY DEFINER + STABLE so RLS policies can call it without recursion.
CREATE OR REPLACE FUNCTION public.current_user_is_booth_renter(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'booth_renter'
      AND (status IS NULL OR status <> 'inactive')
  );
$$;

-- 4. RESTRICTIVE RLS policies — apply ONLY when caller is a booth_renter.
--    For everyone else (owner / admin / stylist / student / etc.), the
--    predicate evaluates to TRUE and behavior is unchanged. For a
--    booth_renter, they can only see/write rows where owner_user_id is
--    their own uid.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'booth_renter_restrict_products') THEN
    CREATE POLICY "booth_renter_restrict_products"
      ON products AS RESTRICTIVE
      FOR ALL
      USING (
        NOT current_user_is_booth_renter(workspace_id)
        OR owner_user_id = auth.uid()
      )
      WITH CHECK (
        NOT current_user_is_booth_renter(workspace_id)
        OR owner_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'booth_renter_restrict_stock_movements') THEN
    CREATE POLICY "booth_renter_restrict_stock_movements"
      ON stock_movements AS RESTRICTIVE
      FOR ALL
      USING (
        NOT current_user_is_booth_renter(workspace_id)
        OR owner_user_id = auth.uid()
      )
      WITH CHECK (
        NOT current_user_is_booth_renter(workspace_id)
        OR owner_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'booth_renter_restrict_stock_alerts') THEN
    CREATE POLICY "booth_renter_restrict_stock_alerts"
      ON stock_alerts AS RESTRICTIVE
      FOR ALL
      USING (
        NOT current_user_is_booth_renter(workspace_id)
        OR owner_user_id = auth.uid()
      )
      WITH CHECK (
        NOT current_user_is_booth_renter(workspace_id)
        OR owner_user_id = auth.uid()
      );
  END IF;
END $$;
